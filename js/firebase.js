// Motigo — Firebase Initialisation (Universal Compat Layer)

const firebaseConfig = {
  apiKey: "AIzaSyCtYyuEFPXMSwQmOclFL1-T10wbLP5llzs",
  authDomain: "motigo-3505f.firebaseapp.com",
  projectId: "motigo-3505f",
  storageBucket: "motigo-3505f.firebasestorage.app",
  messagingSenderId: "832051933137",
  appId: "1:832051933137:web:5f3b2a718c71816f81faf0",
  measurementId: "G-63YV0T0J08"
};

let app = null;
let auth = null;
let db = null;

try {
  if (typeof window !== 'undefined' && window.firebase) {
    if (!window.firebase.apps.length) {
      app = window.firebase.initializeApp(firebaseConfig);
    } else {
      app = window.firebase.app();
    }
    auth = window.firebase.auth();
    db = window.firebase.firestore();
  }
} catch (e) {
  console.warn('Firebase init notice:', e);
}

export { app, auth, db };
