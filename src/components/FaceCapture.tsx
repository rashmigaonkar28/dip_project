import { useEffect, useRef, useState } from 'react';
import { addPerson, addVector, listPeople } from '../lib/storage';
import { detectFace, detectorAvailable, extractGrayscaleFromVideo, extractGrayscaleFromImage, processImageData, MAX_SAMPLES } from '../lib/faceProcessing';
import { UserPlus, Camera } from 'lucide-react';

interface Props { onBack?: () => void }
export default function FaceCapture({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [personCode, setPersonCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string>('Idle');
  const [files, setFiles] = useState<File[]>([]);
  const [useFiles, setUseFiles] = useState(false);
  const [people, setPeople] = useState(listPeople());

  useEffect(() => { setPeople(listPeople()); }, [capturing]);

  useEffect(() => {
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamReady(true);
        }
      } catch (e) {
        setStatus('Failed to access webcam');
      }
    }
    init();
    return () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!capturing) return;
    let cancelled = false;
    const runWithVideo = async (personId: string) => {
      if (!videoRef.current) return;
      setStatus('Capturing samples from webcam...');
      for (let i = 0; i < MAX_SAMPLES && !cancelled; i++) {
        const faceBox = await detectFace(videoRef.current).catch(()=>null);
        const gray = extractGrayscaleFromVideo(videoRef.current, faceBox);
        const result = processImageData(gray);
        addVector(personId, result.vector, result.brightness, result.contrast);
        setProgress((i+1)/MAX_SAMPLES);
        await new Promise(r => setTimeout(r, 160));
      }
    };
    const runWithFiles = async (personId: string) => {
      setStatus('Processing uploaded images...');
      const limited = files.slice(0, MAX_SAMPLES);
      let i = 0;
      for (const file of limited) {
        if (cancelled) break;
        const imgEl = document.createElement('img');
        imgEl.src = URL.createObjectURL(file);
        await new Promise(res => { imgEl.onload = () => res(null); imgEl.onerror = () => res(null); });
        const faceBox = detectorAvailable ? await detectFace(imgEl as any).catch(()=>null) : null; // FaceDetector may not work on image element in all browsers
        const gray = extractGrayscaleFromImage(imgEl, faceBox);
        const result = processImageData(gray);
        addVector(personId, result.vector, result.brightness, result.contrast);
        i++;
        setProgress(i / MAX_SAMPLES);
      }
      // fill remaining with duplicates if fewer than MAX_SAMPLES to keep vector count consistent
      for (; i < MAX_SAMPLES && !cancelled && limited.length > 0; i++) {
        setProgress(i / MAX_SAMPLES);
      }
    };
    const execute = async () => {
      const person = addPerson(personCode.trim(), fullName.trim());
      if (useFiles && files.length) {
        await runWithFiles(person.id);
      } else {
        await runWithVideo(person.id);
      }
      if (!cancelled) {
        setStatus('Capture complete');
        setCapturing(false);
        setPeople(listPeople());
      }
    };
    execute();
    return () => { cancelled = true; };
  }, [capturing, personCode, fullName, useFiles, files]);

  const start = () => {
    if (!personCode.trim() || !fullName.trim()) return;
    if (useFiles && files.length === 0) { setStatus('No files selected'); return; }
    setProgress(0);
    setCapturing(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="w-8 h-8 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Register New Person</h2>
            <p className="text-xs text-gray-500">Capture {MAX_SAMPLES} grayscale samples • {detectorAvailable ? 'FaceDetector active' : 'Center crop fallback'}</p>
          </div>
        </div>
        {onBack && <button onClick={onBack} className="px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm hover:bg-gray-300">Back to Menu</button>}
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="relative rounded-lg overflow-hidden bg-gray-900">
            <video ref={videoRef} playsInline muted className="w-full aspect-video object-cover" />
            {!capturing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <p className="text-white text-sm">Align face and press Start Capturing</p>
              </div>
            )}
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded overflow-hidden">
            <div style={{ width: `${progress*100}%` }} className={`h-full transition-all ${progress<0.5?'bg-red-500':progress<1?'bg-yellow-500':'bg-green-600'}`}></div>
          </div>
          <div className="text-xs text-gray-600 mt-1">Progress: {(progress*100).toFixed(0)}%</div>
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <div className="flex gap-3 items-center flex-wrap">
              <button
                disabled={(useFiles ? false : !streamReady) || capturing || !personCode.trim() || !fullName.trim()}
                onClick={start}
                className="flex items-center gap-2 px-5 py-2 rounded text-sm font-medium transition disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700 text-white"
              ><Camera className="w-4 h-4" /> {capturing ? (useFiles ? 'Processing Images...' : 'Capturing...') : 'Start Capturing'}</button>
              <label className="text-xs flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded">
                <input
                  type="checkbox"
                  checked={useFiles}
                  onChange={e=>setUseFiles(e.target.checked)}
                  className="accent-indigo-600"
                />
                Use uploaded images
              </label>
            </div>
            <span className="text-sm text-gray-600">Status: {status}</span>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600">Person ID (Numeric)</label>
              <input
                value={personCode}
                onChange={e=>setPersonCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}
                placeholder="Enter a unique ID (e.g., 1, 2, 3)"
                className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={capturing}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Full Name</label>
              <input
                value={fullName}
                onChange={e=>setFullName(e.target.value)}
                placeholder="Enter person's name"
                className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={capturing}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Image Files (PNG/JPEG)</label>
              <input
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={e=>setFiles(Array.from(e.target.files||[]))}
                disabled={capturing}
                className="mt-1 w-full text-sm"
              />
              {files.length > 0 && <p className="text-xs text-gray-500 mt-1">Selected {files.length} file(s).</p>}
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
            <h3 className="text-sm font-semibold mb-2 text-indigo-700">Instructions:</h3>
            <ul className="text-xs space-y-1 text-indigo-900 list-disc pl-4">
              <li>Enter a unique numeric ID and full name</li>
              <li>Position your face in the camera view</li>
              <li>System will capture {MAX_SAMPLES} samples automatically</li>
              <li>Keep face visible during entire capture</li>
              <li>Move slightly for varied angles</li>
              <li>Or toggle uploaded images and select PNG/JPEG files</li>
            </ul>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-medium mb-2">Registered People</h3>
            <ul className="text-sm max-h-40 overflow-auto divide-y">
              {people.map(p => (
                <li key={p.id} className="py-1 flex justify-between"><span>{p.code || p.id.slice(0,4)} – {p.fullName || p.name}</span><span className="text-gray-500">{p.sampleCount} samples</span></li>
              ))}
              {!people.length && <li className="py-1 text-gray-500">None yet</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
