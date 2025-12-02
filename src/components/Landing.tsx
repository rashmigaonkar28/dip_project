import { Database, UserPlus, ScanFace, Activity } from 'lucide-react';
import FaceCapture from './FaceCapture';
import FaceRecognition from './FaceRecognition';
import Statistics from './Statistics';
import { useState } from 'react';

interface LandingProps {
  onSelectTab: (tab: string) => void;
}

export default function Landing({ onSelectTab }: LandingProps) {
  const [showInline, setShowInline] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-fuchsia-700 text-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <div className="flex justify-center mb-4"><Database className="w-14 h-14 text-indigo-300" /></div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Face Recognition System</h1>
          <p className="mt-4 text-lg md:text-xl text-indigo-200">Vector-based face recognition using Euclidean distance</p>
          <p className="mt-2 text-sm md:text-base text-indigo-300">Digital Image Processing Project</p>
        </header>
        <section className="grid md:grid-cols-2 gap-8 mb-12">
          <FeatureCard
            icon={<UserPlus className="w-16 h-16 text-indigo-200" />}
            title="Register Person"
            color="from-blue-600 to-blue-500"
            description="Capture face samples and store vector representations in database"
            badges={["50 samples", "Auto-capture"]}
            actionLabel="Start Capturing"
            onAction={() => onSelectTab('Capture')}
            onInline={() => setShowInline(p => p === 'capture' ? null : 'capture')}
          />
          <FeatureCard
            icon={<ScanFace className="w-16 h-16 text-green-200" />}
            title="Recognize Faces"
            color="from-green-600 to-green-500"
            description="Real-time face recognition with detailed mathematical explanations"
            badges={["Live detection", "Analysis"]}
            actionLabel="Start Recognition"
            onAction={() => onSelectTab('Recognize')}
            onInline={() => setShowInline(p => p === 'recognize' ? null : 'recognize')}
          />
        </section>
        {showInline === 'capture' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-10">
            <FaceCapture />
          </div>
        )}
        {showInline === 'recognize' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-10">
            <FaceRecognition />
          </div>
        )}
        <section className="mb-12">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><Activity className="text-pink-300" /> System Features</h2>
            <ul className="grid md:grid-cols-2 gap-4 text-sm text-indigo-100">
              <li className="bg-white/5 rounded p-3">Webcam integration & local processing</li>
              <li className="bg-white/5 rounded p-3">Vector size: 10,000 (100×100 grayscale)</li>
              <li className="bg-white/5 rounded p-3">Similarity via Euclidean distance</li>
              <li className="bg-white/5 rounded p-3">Brightness & contrast metrics</li>
              <li className="bg-white/5 rounded p-3">Threshold distance &lt; 25 = match</li>
              <li className="bg-white/5 rounded p-3">Recent recognition log & statistics</li>
            </ul>
            <div className="mt-6 bg-white/5 rounded-xl p-4 text-indigo-100">
              <p className="text-sm leading-relaxed">All computation runs locally in your browser. No cloud calls; data is stored in <code className="px-1 bg-black/30 rounded">localStorage</code>. Use the buttons above to begin capturing samples or start recognition. You can also view cumulative statistics on demand.</p>
            </div>
          </div>
        </section>
        <footer className="text-center text-xs text-indigo-300 pb-8">Vector math + Euclidean distance • Offline demo • Threshold tuned for educational purposes</footer>
        {showInline === null && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-10">
            <Statistics />
          </div>
        )}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badges: string[];
  actionLabel: string;
  color: string; // tailwind gradient start-end
  onAction: () => void;
  onInline: () => void;
}
function FeatureCard({ icon, title, description, badges, actionLabel, color, onAction, onInline }: FeatureCardProps) {
  return (
    <div className={`relative rounded-2xl p-6 md:p-8 flex flex-col gap-4 bg-gradient-to-br ${color} shadow-lg`}>      
      <div>{icon}</div>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="text-sm md:text-base text-white/80 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        {badges.map(b => <span key={b} className="text-xs bg-white/15 backdrop-blur px-3 py-1 rounded-full">{b}</span>)}
      </div>
      <div className="mt-auto flex gap-3 flex-wrap">
        <button onClick={onAction} className="bg-white text-gray-900 px-4 py-2 rounded font-medium text-sm hover:bg-indigo-50 transition">{actionLabel}</button>
        <button onClick={onInline} className="bg-black/30 text-white px-4 py-2 rounded text-sm hover:bg-black/40 transition">Inline Demo</button>
      </div>
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 pointer-events-none" />
    </div>
  );
}
