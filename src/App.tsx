import { useState } from 'react';
import FaceCapture from './components/FaceCapture';
import FaceRecognition from './components/FaceRecognition';
import Statistics from './components/Statistics';
import Landing from './components/Landing';

const TABS = ['Home', 'Capture', 'Recognize', 'Statistics'] as const;
type Tab = typeof TABS[number];

function App() {
  const [tab, setTab] = useState<Tab>('Home');
  if (tab === 'Home') {
    return <Landing onSelectTab={(t)=>setTab(t as Tab)} />;
  }
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h1 className="text-2xl font-semibold">Offline Face Recognition (Vector + Euclidean)</h1>
          <nav className="flex gap-2">
            {TABS.filter(t=>t!=='Home').map(t => (
              <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1 rounded text-sm font-medium ${tab===t?'bg-blue-600 text-white':'bg-white shadow'}`}>{t}</button>
            ))}
            <button onClick={()=>setTab('Home')} className="px-3 py-1 rounded text-sm font-medium bg-gray-200 hover:bg-gray-300">Home</button>
          </nav>
        </header>
        <main className="bg-white rounded shadow p-4">
          {tab === 'Capture' && <FaceCapture />}
          {tab === 'Recognize' && <FaceRecognition />}
          {tab === 'Statistics' && <Statistics />}
        </main>
        <footer className="text-xs text-gray-500 text-center pb-4">
          All processing local. Vectors stored in browser localStorage. Threshold <span className="font-semibold">distance &lt; 25</span> defines a match.
        </footer>
      </div>
    </div>
  );
}

export default App;
