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
  let userCredential;
  try {
    userCredential = await auth.createUserWithEmailAndPassword(email, password);
  } catch (authErr) {
    if (authErr.code === 'auth/email-already-in-use') {
      try {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } catch (signInErr) {
        // If password was reset or changed, log sign up error cleanly
        throw new Error('This email is already registered. Please sign in or reset your password.');
      }
    } else {
      throw authErr;
    }
  }

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
    if (db) {
      await db.collection('users').doc(user.uid).set(profileData, { merge: true });
      await db.collection('admin_user_registry').doc(user.uid).set(profileData, { merge: true });
    }
  } catch (err) {
    console.warn('Could not write profile to Firestore:', err);
  }

  try {
    sendWelcomeEmail(email, firstName);
  } catch (e) {}

  return { user, profile: profileData };
}

/**
 * Sign in an existing user with Email/Password.
 */
export async function signInUser(email, password) {
  if (!auth) throw new Error('Firebase Auth unavailable');
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  const user = userCredential.user;

  const profileData = {
    id: user.uid,
    firstName: email.split('@')[0],
    lastName: '',
    email: email,
    phone: '',
    currency: 'NGN',
    currencySymbol: '₦',
    distanceUnit: 'km',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    isVerified: true
  };

  try {
    if (db) {
      const userRef = db.collection('users').doc(user.uid);
      const doc = await userRef.get();
      if (!doc.exists) {
        await userRef.set(profileData, { merge: true });
        await db.collection('admin_user_registry').doc(user.uid).set(profileData, { merge: true });
        recordUserRegistration(profileData);
      } else {
        const existingData = doc.data() || {};
        const updated = { ...profileData, ...existingData, lastLoginAt: new Date().toISOString() };
        await userRef.update({ lastLoginAt: new Date().toISOString() });
        await db.collection('admin_user_registry').doc(user.uid).set(updated, { merge: true });
        recordUserRegistration(updated);
      }
    } else {
      recordUserRegistration(profileData);
    }
  } catch (err) {
    console.warn('Profile sync error on login:', err);
  }

  return { user, profile: profileData };
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
 * Send password reset email via Firebase Auth.
 */
export async function sendResetPassword(email) {
  if (!auth) throw new Error('Firebase Auth unavailable');
  await auth.sendPasswordResetEmail(email);
  return true;
}

export async function updatePasswordDirectly(email, newPassword) {
  if (!email || !newPassword) throw new Error('Please enter both email and new password');
  
  if (auth) {
    try {
      if (auth.currentUser && auth.currentUser.email === email) {
        await auth.currentUser.updatePassword(newPassword);
      } else {
        await auth.sendPasswordResetEmail(email);
      }
    } catch (e) {
      console.warn('Firebase Auth password update notice:', e);
    }
  }

  try {
    let list = JSON.parse(localStorage.getItem('motigo_registered_users') || '[]');
    const idx = list.findIndex(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) {
      list[idx].updatedAt = new Date().toISOString();
      localStorage.setItem('motigo_registered_users', JSON.stringify(list));
    }
  } catch (e) {}

  return true;
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

export function sendWelcomeEmail(email, firstName = 'Vehicle Owner') {
  if (!email) return;
  try {
    const subject = encodeURIComponent('Welcome to Motigo — Your Car\'s Personal Maintenance Assistant 🚗');
    const body = encodeURIComponent(`Hi ${firstName},\n\nWelcome to Motigo! We’re thrilled to help you keep your vehicle running smoothly, safely, and cost-effectively.\n\nWith Motigo, you can:\n- Never miss a service with automated date and mileage-based reminders\n- Access personalized vehicle specs and AI-powered diagnostic guidance\n- Maintain a complete service history for higher resale value\n\nGet started by adding your first vehicle to your garage!\n\nBest regards,\nThe Motigo Team`);
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    if (typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
  } catch (e) {
    console.warn('Welcome email trigger notice:', e);
  }
}
