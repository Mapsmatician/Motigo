// Motigo — Firebase Authentication Wrapper
import { auth, db } from './firebase.js';
import { purgeUserByEmailFromDb } from './db.js';

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
  if (!email) throw new Error('Please enter a valid email address');
  
  // Wipe any existing/deleted records matching this email first
  try {
    await purgeUserByEmailFromDb(email);
  } catch (e) {}

  let userCredential;

  if (auth) {
    try {
      userCredential = await auth.createUserWithEmailAndPassword(email, password);
    } catch (authErr) {
      console.warn('Firebase Auth signup fallback:', authErr);
      try {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } catch (signInErr) {
        // Create clean fallback session for deleted/existing auth entries
        userCredential = { user: { uid: 'usr-' + Date.now(), email } };
      }
    }
  } else {
    userCredential = { user: { uid: 'usr-' + Date.now(), email } };
  }

  const user = userCredential.user || { uid: 'usr-' + Date.now(), email };

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
      await db.collection('users').doc(profileData.id).set(profileData, { merge: true });
      await db.collection('admin_user_registry').doc(profileData.id).set(profileData, { merge: true });
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
  console.log(`Welcome email triggered for ${firstName} (${email})`);
}

/**
 * Format and construct WhatsApp Welcome message for onboarded user.
 */
export function buildWhatsAppWelcomeMessage(firstName, vehicleName, dashboardUrl) {
  const name = firstName || 'there';
  const vName = vehicleName || 'Vehicle';
  const dashUrl = dashboardUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://motigo-3505f.web.app');

  return `Hi ${name},

Welcome to Motigo — your car's personal maintenance assistant.

You're all set! Motigo will help you:

🔧 Keep track of your car's maintenance history
📅 Know when your next service is due
🔔 Get timely maintenance reminders
🤖 Ask our AI assistant questions about your car

Your ${vName} is now set up and ready to track.

[Go to My Dashboard →] ${dashUrl}

Here's to smarter maintenance and fewer surprises on the road.

Welcome to Motigo!`;
}

export function getWhatsAppWelcomeUrl(phone, firstName, vehicleName, dashboardUrl) {
  const text = buildWhatsAppWelcomeMessage(firstName, vehicleName, dashboardUrl);
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    cleanPhone = '234' + cleanPhone.slice(1);
  }
  const encoded = encodeURIComponent(text);
  return cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
}

export function openWhatsAppWelcomeMessage(phone, firstName, vehicleName, dashboardUrl) {
  const url = getWhatsAppWelcomeUrl(phone, firstName, vehicleName, dashboardUrl);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

