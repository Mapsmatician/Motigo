// Motigo — Firebase Initialisation
// All other modules import { auth, db } from './firebase.js'

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCtYyuEFPXMSwQmOclFL1-T10wbLP5llzs",
  authDomain: "motigo-3505f.firebaseapp.com",
  projectId: "motigo-3505f",
  storageBucket: "motigo-3505f.firebasestorage.app",
  messagingSenderId: "832051933137",
  appId: "1:832051933137:web:5f3b2a718c71816f81faf0",
  measurementId: "G-63YV0T0J08"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);

// Analytics — only in browser, not during Netlify build
if (typeof window !== 'undefined') {
  try { getAnalytics(app); } catch (_) { /* safe to skip */ }
}
