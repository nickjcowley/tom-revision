// Progress storage: Firebase Firestore when configured (live sync across phones),
// otherwise this device's localStorage. Always keeps a local copy for offline use.
import { FIREBASE_CONFIG, DOC_PATH } from './firebase-config.js';

const KEY = 'tom-revision-state-v1';
const EMPTY = () => ({ ratings: {}, sessions: {}, moves: {}, locks: {}, blocks: {} });
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

let state = EMPTY();
let remote = null; // { ref, updateDoc, FieldPath, deleteField }
let listener = () => {};
export let mode = 'local';
export let lastError = null;

function readLocal() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); return s ? { ...EMPTY(), ...s } : EMPTY(); } catch { return EMPTY(); }
}
function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ } }

export function getState() { return state; }

export async function initSync(onChange) {
  listener = onChange;
  state = readLocal();
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) { mode = 'local'; return state; }
  try {
    const { initializeApp } = await import(SDK + 'firebase-app.js');
    const fs = await import(SDK + 'firebase-firestore.js');
    const app = initializeApp(FIREBASE_CONFIG);
    const db = fs.getFirestore(app);
    const ref = fs.doc(db, ...DOC_PATH);
    await fs.setDoc(ref, { created: new Date().toISOString() }, { merge: true });
    remote = { ref, updateDoc: fs.updateDoc, FieldPath: fs.FieldPath, deleteField: fs.deleteField };
    mode = 'sync';
    fs.onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      state = { ...EMPTY(), ...d };
      writeLocal();
      listener(state);
    }, (e) => { lastError = e.message; mode = 'offline'; listener(state); });
  } catch (e) {
    lastError = e.message;
    mode = 'offline';
  }
  return state;
}

// set(['sessions', id], value)  – value undefined deletes the field
export async function set(path, value) {
  let o = state;
  for (const k of path.slice(0, -1)) o = o[k] ??= {};
  if (value === undefined) delete o[path.at(-1)]; else o[path.at(-1)] = value;
  writeLocal();
  listener(state);
  if (remote) {
    try {
      await remote.updateDoc(remote.ref, new remote.FieldPath(...path), value === undefined ? remote.deleteField() : value);
    } catch (e) { lastError = e.message; }
  }
}

export function replaceAll(newState) {
  state = { ...EMPTY(), ...newState };
  writeLocal();
  listener(state);
  if (remote) {
    for (const k of Object.keys(EMPTY())) remote.updateDoc(remote.ref, k, state[k]).catch((e) => (lastError = e.message));
  }
}
