import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, collection, getDocs, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

// ─── CONFIGURE HERE ────────────────────────────────────────────────────────────
// Crea un progetto su https://console.firebase.google.com
// Abilita Authentication > Email/Password e Firestore Database
// Incolla la tua configurazione sotto:
const FIREBASE_CONFIG = {
  apiKey:            "PLACEHOLDER",
  authDomain:        "PLACEHOLDER.firebaseapp.com",
  projectId:         "PLACEHOLDER",
  storageBucket:     "PLACEHOLDER.firebasestorage.app",
  messagingSenderId: "PLACEHOLDER",
  appId:             "PLACEHOLDER",
};
// ───────────────────────────────────────────────────────────────────────────────

// LS keys that are synced to Firestore (without the 'bazi_' prefix as Firestore doc id)
export const SYNC_KEYS = [
  'bazi_cfg','bazi_note','bazi_events',
  'bazi_routine_cfg','bazi_routine_log','bazi_routine_del',
  'bazi_habit_cfg','bazi_habit_log','bazi_habit_del',
  'bazi_todo_lists','bazi_todo_del','bazi_promemoria','bazi_personal',
];

// Detect if Firebase is actually configured
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

// ─── Auth helpers ──────────────────────────────────────────────────────────────

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

// ─── Firestore helpers ─────────────────────────────────────────────────────────

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
  snap.forEach(d => {
    const { lsKey, value } = d.data();
    if (lsKey) {
      try { out[lsKey] = JSON.parse(value); }
      catch { out[lsKey] = value; }
    }
  });
  return out;
}

export function listenUserData(uid, onChange) {
  if (!firebaseEnabled || !uid) return () => {};
  return onSnapshot(collection(_db, 'users', uid, 'data'), snap => {
    snap.docChanges().forEach(ch => {
      if (ch.type === 'modified') {
        const { lsKey, value } = ch.doc.data();
        if (!lsKey) return;
        try { onChange(lsKey, JSON.parse(value)); }
        catch { onChange(lsKey, value); }
      }
    });
  });
}
