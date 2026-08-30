// Motigo — Firebase Initialisation (Robust Direct CDN Imports)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
