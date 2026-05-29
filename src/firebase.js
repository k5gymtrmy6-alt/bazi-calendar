import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
  sendPasswordResetEmail, updateEmail as fbUpdateEmail,
  reauthenticateWithCredential, EmailAuthProvider,
  GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, collection, getDocs, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

// ─── Firebase config ───────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDAuUW1UHAywSgD5kPRb4ehFT8G1AzQQVg",
  authDomain:        "ba-zi-calendar.firebaseapp.com",
  projectId:         "ba-zi-calendar",
  storageBucket:     "ba-zi-calendar.firebasestorage.app",
  messagingSenderId: "855381438695",
  appId:             "1:855381438695:web:82d9731016fc9c67637242",
};
// ───────────────────────────────────────────────────────────────────────────────

export const SYNC_KEYS = [
  'bazi_cfg','bazi_note','bazi_events',
  'bazi_routine_cfg','bazi_routine_log','bazi_routine_del',
  'bazi_habit_cfg','bazi_habit_log','bazi_habit_del',
  'bazi_todo_lists','bazi_todo_del','bazi_promemoria','bazi_personal',
];

const configured = !FIREBASE_CONFIG.apiKey.startsWith('PLACEHOLDER');

let _app, _auth, _db;

if (configured) {
  try {
    _app  = initializeApp(FIREBASE_CONFIG);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
  } catch (e) {
    console.warn('[Firebase] init error:', e.message);
  }
}

export const firebaseEnabled = configured && !!_auth;
export const auth = _auth;
export const db   = _db;

export function onAuthChange(cb) {
  if (!firebaseEnabled) { cb(null); return () => {}; }
  return onAuthStateChanged(_auth, cb);
}

export async function signInAnon() {
  return signInAnonymously(_auth);
}

export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(_auth, email, password);
}

export async function createAccount(email, password) {
  return createUserWithEmailAndPassword(_auth, email, password);
}

export async function signOutUser() {
  return fbSignOut(_auth);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(_auth, provider);
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(_auth, email);
}

export async function updateUserEmail(newEmail, currentPassword) {
  const user = _auth.currentUser;
  if (!user || !user.email) throw new Error('Nessun utente loggato');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  return fbUpdateEmail(user, newEmail);
}

function docRef(uid, lsKey) {
  return doc(_db, 'users', uid, 'data', lsKey);
}

export async function pushKey(uid, lsKey, value) {
  if (!firebaseEnabled || !uid) return;
  await setDoc(docRef(uid, lsKey), {
    value:  JSON.stringify(value),
    lsKey,
    ts:     serverTimestamp(),
    device: navigator.userAgent.slice(0, 40),
  });
}

export async function loadAllKeys(uid) {
  if (!firebaseEnabled || !uid) return null;
  const snap = await getDocs(collection(_db, 'users', uid, 'data'));
  const out  = {};
  let maxTs = 0;
  snap.forEach(d => {
    const { lsKey, value, ts } = d.data();
    if (lsKey) {
      try { out[lsKey] = JSON.parse(value); }
      catch { out[lsKey] = value; }
    }
    if (ts?.toMillis) maxTs = Math.max(maxTs, ts.toMillis());
  });
  out.__remoteTs = maxTs;
  return out;
}

export function listenUserData(uid, onChange) {
  if (!firebaseEnabled || !uid) return () => {};
  let firstBatch = true;
  return onSnapshot(collection(_db, 'users', uid, 'data'), snap => {
    if (firstBatch) { firstBatch = false; return; }
    snap.docChanges().forEach(ch => {
      if (ch.type === 'modified' || ch.type === 'added') {
        const { lsKey, value } = ch.doc.data();
        if (!lsKey) return;
        try { onChange(lsKey, JSON.parse(value)); }
        catch { onChange(lsKey, value); }
      }
    });
  });
}
