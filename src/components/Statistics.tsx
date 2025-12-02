import { listPeople, listVectors, listLogs } from '../lib/storage';
import { MATCH_THRESHOLD } from '../lib/faceProcessing';

export default function Statistics() {
  const people = listPeople();
  const vectors = listVectors();
  const logs = listLogs().slice(0, 25);
  const totalAttempts = logs.length;
  const successCount = logs.filter(l => l.isMatch).length;
  const successRate = totalAttempts ? (successCount / totalAttempts) * 100 : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="People" value={people.length} />
        <Stat label="Samples" value={vectors.length} />
        <Stat label="Attempts" value={totalAttempts} />
        <Stat label="Success Rate" value={successRate.toFixed(1) + '%'} />
      </div>
      <div className="bg-white rounded shadow p-4">
        <h3 className="font-medium mb-2 text-sm">Recent Recognition Events</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1">Time</th>
              <th className="py-1">Person</th>
              <th className="py-1">Distance</th>
              <th className="py-1">Similarity</th>
              <th className="py-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => {
              const person = people.find(p => p.id === l.personId);
              const distance = typeof l.distance === 'number' && isFinite(l.distance) ? l.distance.toFixed(2) : '—';
              const similarity = typeof l.similarity === 'number' && isFinite(l.similarity) ? l.similarity.toFixed(1) + '%' : '—';
              return (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="py-1 pr-2">{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : '—'}</td>
                  <td className="py-1 pr-2">{person ? (person.fullName || person.name) : 'Unknown'}</td>
                  <td className="py-1 pr-2">{distance}</td>
                  <td className="py-1 pr-2">{similarity}</td>
                  <td className="py-1 pr-2">{l.isMatch ? 'MATCH' : 'NO MATCH'}</td>
                </tr>
              );
            })}
            {!logs.length && <tr><td colSpan={5} className="py-2 text-center text-gray-500">No recognition attempts yet.</td></tr>}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">Threshold: Distance &lt; {MATCH_THRESHOLD} considered match. Showing last {logs.length} attempts.</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded shadow p-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
