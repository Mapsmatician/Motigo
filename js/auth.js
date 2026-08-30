// Motigo — Firebase Authentication Wrapper
import { auth, db } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Register a new user with Email/Password and create their profile doc in Firestore.
 */
export async function signUpUser(email, password, firstName, lastName, phone = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create initial profile in Firestore
  const userDocRef = doc(db, 'users', user.uid);
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
    isVerified: true,
    notificationPreferences: {
      email: true,
      sevenDaysBefore: true,
      oneDayBefore: true,
      dueDate: true,
      overdue: true,
      push: true,
      sms: false,
      whatsapp: false
    }
  };

  await setDoc(userDocRef, profileData);
  return { user, profile: profileData };
}

/**
 * Sign in an existing user with Email/Password.
 */
export async function signInUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update lastLoginAt in Firestore
  const userDocRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userDocRef, {
      lastLoginAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not update lastLoginAt', err);
  }

  return user;
}

/**
 * Check if a given user email or UID is registered in the admins collection.
 */
export async function checkIsAdmin(user) {
  if (!user) return false;
  try {
    // Check by email in admins collection or doc id
    const adminDocRef = doc(db, 'admins', user.email.toLowerCase());
    const snap = await getDoc(adminDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    // Fallback: check fallback hardcoded admin email if not set up in Firestore yet
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
      // Fetch user profile doc
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userDocRef);
      let profile = snap.exists() ? snap.data() : {
        id: firebaseUser.uid,
        firstName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email
      };

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
