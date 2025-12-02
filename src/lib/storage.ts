// Local storage abstraction for people and face vectors
export interface FaceVector {
  id: string; // uuid
  personId: string;
  data: number[]; // length 10000
  brightness: number;
  contrast: number;
  capturedAt: number;
}
export interface PersonEntry {
  id: string; // uuid
  name: string; // legacy: using fullName assigned here
  sampleCount: number;
  createdAt: number;
  code?: string; // optional numeric/string identifier
  fullName?: string; // explicit full name (mirrors name)
}
export interface RecognitionLogEntry {
  id: string; // uuid
  personId: string | null;
  distance: number;
  similarity: number;
  isMatch: boolean;
  timestamp: number;
}
interface DBShape {
  people: PersonEntry[];
  vectors: FaceVector[];
  logs: RecognitionLogEntry[];
}
const KEY = 'faceRecDB_v1';
function loadDB(): DBShape {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try { return JSON.parse(raw) as DBShape; } catch {}
  }
  const empty: DBShape = { people: [], vectors: [], logs: [] };
  saveDB(empty);
  return empty;
}
function saveDB(db: DBShape) { localStorage.setItem(KEY, JSON.stringify(db)); }
export function listPeople() { return loadDB().people; }
export function listVectors() { return loadDB().vectors; }
export function listLogs() { return loadDB().logs.slice().sort((a,b)=>b.timestamp-a.timestamp); }
export function addPerson(code: string, fullName: string): PersonEntry {
  const db = loadDB();
  const entry: PersonEntry = { id: crypto.randomUUID(), name: fullName, fullName, code, sampleCount: 0, createdAt: Date.now() };
  db.people.push(entry); saveDB(db); return entry;
}
export function addVector(personId: string, vector: number[], brightness: number, contrast: number): FaceVector {
  const db = loadDB();
  const v: FaceVector = { id: crypto.randomUUID(), personId, data: vector, brightness, contrast, capturedAt: Date.now() };
  db.vectors.push(v);
  const p = db.people.find(p=>p.id===personId); if (p) p.sampleCount++;
  saveDB(db); return v;
}
export function addRecognitionLog(entry: Omit<RecognitionLogEntry,'id'>) {
  const db = loadDB();
  db.logs.push({ id: crypto.randomUUID(), ...entry });
  if (db.logs.length > 200) db.logs.splice(0, db.logs.length - 200); // cap
  saveDB(db);
}
