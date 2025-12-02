import { useEffect, useRef, useState } from 'react';
import { listPeople, listVectors, addRecognitionLog } from '../lib/storage';
import { detectFace, detectorAvailable, extractGrayscaleFromVideo, extractGrayscaleFromImage, processImageData, euclidean, similarityFromDistance, MATCH_THRESHOLD } from '../lib/faceProcessing';
import { ScanFace, Brain, RefreshCcw, ArrowLeft, Image as ImageIcon } from 'lucide-react';

interface LastResult {
  name: string;
  distance: number;
  similarity: number;
  isMatch: boolean;
  brightness: number;
  contrast: number;
}

interface Props { onBack?: () => void }
export default function FaceRecognition({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [last, setLast] = useState<LastResult | null>(null);
  const [fps, setFps] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageResult, setImageResult] = useState<LastResult | null>(null);
  const rafRef = useRef<number>();
  const [threshold, setThreshold] = useState<number>(MATCH_THRESHOLD);
  const frameDistancesRef = useRef<number[]>([]);
  const [topCandidates, setTopCandidates] = useState<{name:string;distance:number}[]>([]);
  const useCosine = false; // future toggle

  function l2Normalize(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((s,v)=>s+v*v,0)) || 1;
    return vec.map(v=>v/norm);
  }
  function cosineSim(a:number[], b:number[]): number {
    let dot = 0; for (let i=0;i<a.length;i++) dot += a[i]*b[i];
    return dot; // with L2 normed vectors, dot == cosine
  }

  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Ready');
        }
      } catch {
        setStatus('Webcam access failed');
      }
    }
    init();
    return () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      cancelAnimationFrame(rafRef.current!);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    let lastFrame = performance.now();
    const loop = async () => {
      if (!videoRef.current) return;
      const now = performance.now();
      const dt = now - lastFrame;
      if (dt > 0) setFps(Math.round(1000 / dt));
      lastFrame = now;
      const faceBox = await detectFace(videoRef.current).catch(()=>null);
      const gray = extractGrayscaleFromVideo(videoRef.current, faceBox);
      const processed = processImageData(gray);
      const qVec = useCosine ? l2Normalize(processed.vector) : processed.vector;
      const vectors = listVectors();
      const distances: {name:string; distance:number}[] = [];
      for (const v of vectors) {
        const d = useCosine ? (1 - cosineSim(qVec, l2Normalize(v.data))) : euclidean(qVec, v.data);
        const person = listPeople().find(p => p.id === v.personId);
        distances.push({ name: person ? person.name : '?', distance: d });
      }
      distances.sort((a,b)=>a.distance-b.distance);
      // Aggregate per-person using average of top-k distances
      const perPerson: Record<string, number[]> = {};
      for (const d of distances) {
        if (!perPerson[d.name]) perPerson[d.name] = [];
        perPerson[d.name].push(d.distance);
      }
      const k = 3;
      const personScores = Object.entries(perPerson).map(([name, arr])=>{
        arr.sort((a,b)=>a-b);
        const take = arr.slice(0, Math.min(k, arr.length));
        const avg = take.reduce((s,v)=>s+v,0)/take.length;
        return { name, distance: avg };
      }).sort((a,b)=>a.distance-b.distance);
      const best = personScores[0] || { name: 'Unknown', distance: Infinity };
      // update top-3 for UI
      setTopCandidates(personScores.slice(0,3));
      // multi-frame smoothing: keep last 10 distances
      frameDistancesRef.current.push(best.distance);
      if (frameDistancesRef.current.length > 10) frameDistancesRef.current.shift();
      const avgDistance = frameDistancesRef.current.reduce((s,v)=>s+v,0) / frameDistancesRef.current.length;
      const similarity = similarityFromDistance(avgDistance);
      const isMatch = avgDistance < threshold;
      const result: LastResult = { name: best.name, distance: avgDistance, similarity, isMatch, brightness: processed.brightness, contrast: processed.contrast };
      setLast(result);
      addRecognitionLog({ personId: isMatch ? (listPeople().find(p=>p.name===best.name)?.id || null) : null, distance: avgDistance, similarity, isMatch, timestamp: Date.now() });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [running]);

  const reloadDB = () => {
    localStorage.removeItem('faceRecDB_v1');
    setLast(null);
    setImageResult(null);
    setStatus('Database cleared');
  };

  const processImageFile = async () => {
    if (!imageFile) return;
    setStatus('Processing image...');
    const img = document.createElement('img');
    img.src = URL.createObjectURL(imageFile);
    await new Promise(res => { img.onload = () => res(null); img.onerror = () => res(null); });
    const faceBox = detectorAvailable ? await detectFace(img as any).catch(()=>null) : null;
    const gray = extractGrayscaleFromImage(img, faceBox);
    const processed = processImageData(gray);
    const vectors = listVectors();
    const qVec = useCosine ? l2Normalize(processed.vector) : processed.vector;
    const distances: {name:string; distance:number}[] = vectors.map(v => {
      const d = useCosine ? (1 - cosineSim(qVec, l2Normalize(v.data))) : euclidean(qVec, v.data);
      const person = listPeople().find(p=>p.id===v.personId);
      return { name: person?person.name:'?', distance: d };
    }).sort((a,b)=>a.distance-b.distance);
    // Aggregate per person top-k distances
    const perPerson: Record<string, number[]> = {};
    for (const d of distances) {
      if (!perPerson[d.name]) perPerson[d.name] = [];
      perPerson[d.name].push(d.distance);
    }
    const k = 3;
    const personScores = Object.entries(perPerson).map(([name, arr])=>{
      arr.sort((a,b)=>a-b);
      const take = arr.slice(0, Math.min(k, arr.length));
      const avg = take.reduce((s,v)=>s+v,0)/take.length;
      return { name, distance: avg };
    }).sort((a,b)=>a.distance-b.distance);
    setTopCandidates(personScores.slice(0,3));
    const best = personScores[0] || { name: 'Unknown', distance: Infinity };
    const similarity = similarityFromDistance(best.distance);
    const isMatch = best.distance < threshold;
    const result: LastResult = { name: best.name, distance: best.distance, similarity, isMatch, brightness: processed.brightness, contrast: processed.contrast };
    setImageResult(result);
    addRecognitionLog({ personId: isMatch ? (listPeople().find(p=>p.name===best.name)?.id || null) : null, distance: best.distance, similarity, isMatch, timestamp: Date.now() });
    setStatus('Image processed');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ScanFace className="w-8 h-8 text-green-600" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Face Recognition</h2>
            <p className="text-xs text-gray-500">Vector comparison using Euclidean distance {detectorAvailable ? '• FaceDetector active' : '• Fallback mode'}</p>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Menu</button>
        )}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="relative rounded-lg overflow-hidden bg-gray-900">
            <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
            {!running && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <p className="text-white text-sm">Video ready. Start recognition to process frames.</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <button
              onClick={()=>{ setRunning(r=>!r); if (!running) setImageResult(null); }}
              className={`flex items-center gap-2 px-5 py-2 rounded text-sm font-medium transition ${running?'bg-red-600 hover:bg-red-700 text-white':'bg-green-600 hover:bg-green-700 text-white'}`}
            >{running?'Stop Recognition':'Start Recognition'}</button>
            <button onClick={reloadDB} className="flex items-center gap-2 px-5 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"><RefreshCcw className="w-4 h-4" /> Reload DB</button>
            <label className="flex items-center gap-2 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm cursor-pointer">
              <ImageIcon className="w-4 h-4" /> <span>Image</span>
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={e=>{ setImageFile(e.target.files?.[0]||null); setImageResult(null); }} />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Threshold</span>
              <input type="range" min={5} max={100} value={threshold} onChange={e=>setThreshold(Number(e.target.value))} />
              <span className="text-xs text-gray-600">{threshold.toFixed(0)}</span>
            </div>
            <button
              disabled={!imageFile}
              onClick={processImageFile}
              className="flex items-center gap-2 px-5 py-2 rounded text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
            >Run Image Recognition</button>
            {imageFile && <span className="text-xs text-gray-500">{imageFile.name}</span>}
            <span className="text-sm text-gray-600">Status: {status}</span>
            <span className="text-sm text-gray-400">FPS: {fps}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Recognition Analysis</h3>
          </div>
          {(imageResult || last) ? (
            <div className="space-y-2 text-sm">
              <Metric label="Source" value={imageResult ? 'Uploaded Image' : 'Webcam Frame'} />
              <Metric label="Person" value={(imageResult||last)!.isMatch ? (imageResult||last)!.name : 'Unknown'} highlight={(imageResult||last)!.isMatch} />
              <Metric label="Distance" value={(imageResult||last)!.distance.toFixed(2)} />
              <Metric label="Similarity" value={(imageResult||last)!.similarity.toFixed(1) + '%'} />
              <Metric label="Brightness" value={(imageResult||last)!.brightness.toFixed(3)} />
              <Metric label="Contrast" value={(imageResult||last)!.contrast.toFixed(3)} />
              <Metric label="Decision" value={(imageResult||last)!.isMatch ? 'MATCH FOUND' : 'UNKNOWN FACE'} highlight={(imageResult||last)!.isMatch} />
              <p className="text-xs text-gray-500 mt-2">Threshold: distance &lt; {threshold} indicates match.</p>
              {topCandidates.length>0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500">Top candidates</p>
                  <div className="mt-1 space-y-1">
                    {topCandidates.map((c,idx)=>(
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-600">{idx+1}. {c.name}</span>
                        <span>{c.distance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center text-gray-500">
              <Brain className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm">Start recognition or upload an image to see analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b last:border-b-0 py-1">
      <span className="text-gray-500">{label}</span>
      <span className={highlight? 'font-medium text-green-600' : 'font-medium'}>{value}</span>
    </div>
  );
}
