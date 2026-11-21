// ─────────────────────────────────────────────────────────────
// Paste your Firebase web-app config here to sync progress between
// Tom's phone and the parents' phones (see README.md, step 2).
// Leave it as null and progress is saved on each device only.
// These keys are safe to publish – they identify the project, they
// aren't passwords.
// ─────────────────────────────────────────────────────────────
export const FIREBASE_CONFIG = null;
/* Example:
export const FIREBASE_CONFIG = {
  apiKey: "AIza…",
  authDomain: "tom-revision.firebaseapp.com",
  projectId: "tom-revision",
  storageBucket: "tom-revision.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
*/

// The Firestore document that holds Tom's progress.
export const DOC_PATH = ['revision', 'tom-gcse-mocks-2027'];
