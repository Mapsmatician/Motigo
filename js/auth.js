// Motigo — Firebase Authentication Wrapper
import { auth, db } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * Register a new user with Email/Password and create their profile doc in Firestore.
 */
export async function signUpUser(email, password, firstName, lastName, phone = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const profileData = {
    id: user.uid,
    firstName: firstName || 'User',
    lastName: lastName || '',
    email: email,
    phone: phone,
    currency: 'NGN',
    currencySymbol: '₦',
    distanceUnit: 'km',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isVerified: true
  };

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (err) {
    console.warn('Could not write initial profile to Firestore (check Security Rules):', err);
  }

  return { user, profile: profileData };
}

/**
 * Sign in an existing user with Email/Password.
 */
export async function signInUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      lastLoginAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not update lastLoginAt:', err);
  }

  return user;
}

/**
 * Check if a given user email or UID is registered in the admins collection.
 */
export async function checkIsAdmin(user) {
  if (!user) return false;
  try {
    const adminDocRef = doc(db, 'admins', user.email.toLowerCase());
    const snap = await getDoc(adminDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    if (user.email.toLowerCase() === 'admin@motigo.app') {
      return { role: 'Super Administrator', email: user.email };
    }
  } catch (e) {
    console.warn('Error checking admin status:', e);
  }
  return false;
}

/**
 * Sign out current user.
 */
export async function signOutUser() {
  await firebaseSignOut(auth);
}

/**
 * Listen for auth state changes.
 */
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      let profile = {
        id: firebaseUser.uid,
        firstName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email
      };

      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) profile = snap.data();
      } catch (err) {
        console.warn('Could not read user profile from Firestore:', err);
      }

      const adminData = await checkIsAdmin(firebaseUser);

      callback({
        firebaseUser,
        profile,
        isAdmin: !!adminData,
        adminData
      });
    } else {
      callback({
        firebaseUser: null,
        profile: null,
        isAdmin: false,
        adminData: null
      });
    }
  });
}
