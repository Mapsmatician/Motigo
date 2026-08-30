// Motigo — Firebase Authentication Wrapper
import { auth, db } from './firebase.js';

export function recordUserRegistration(userProfile) {
  try {
    let list = JSON.parse(localStorage.getItem('motigo_registered_users') || '[]');
    const idx = list.findIndex(u => u.id === userProfile.id || u.email === userProfile.email);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...userProfile };
    } else {
      list.unshift(userProfile);
    }
    localStorage.setItem('motigo_registered_users', JSON.stringify(list));
  } catch (e) {
    console.warn('Could not record registration in local cache:', e);
  }
}

/**
 * Register a new user with Email/Password and create their profile doc in Firestore.
 */
export async function signUpUser(email, password, firstName, lastName, phone = '') {
  if (!auth) throw new Error('Firebase Auth unavailable');
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
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

  recordUserRegistration(profileData);

  try {
    if (db) await db.collection('users').doc(user.uid).set(profileData, { merge: true });
  } catch (err) {
    console.warn('Could not write initial profile to Firestore:', err);
  }

  return { user, profile: profileData };
}

/**
 * Sign in an existing user with Email/Password.
 */
export async function signInUser(email, password) {
  if (!auth) throw new Error('Firebase Auth unavailable');
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  const user = userCredential.user;

  try {
    if (db) await db.collection('users').doc(user.uid).update({ lastLoginAt: new Date().toISOString() });
  } catch (err) {
    console.warn('Could not update lastLoginAt:', err);
  }

  return user;
}

/**
 * Check if a given user email or UID is registered in the admins collection.
 */
export async function checkIsAdmin(user) {
  if (!user || !db) return false;
  try {
    const snap = await db.collection('admins').doc(user.email.toLowerCase()).get();
    if (snap.exists) return snap.data();
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
  if (auth) await auth.signOut();
}

/**
 * Listen for auth state changes.
 */
export function subscribeToAuth(callback) {
  if (!auth) {
    callback({ firebaseUser: null, profile: null, isAdmin: false, adminData: null });
    return () => {};
  }
  return auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      let profile = {
        id: firebaseUser.uid,
        firstName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        email: firebaseUser.email
      };

      try {
        if (db) {
          const snap = await db.collection('users').doc(firebaseUser.uid).get();
          if (snap.exists) profile = snap.data();
        }
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
