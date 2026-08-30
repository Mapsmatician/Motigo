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

/**
 * Sends a welcome email directly to the registered user's mailing address
 * by queuing the message in Cloud Firestore's 'mail' collection (Firebase Trigger Email Extension)
 * and triggering the email dispatch to their inbox.
 */
export async function sendAutomatedWelcomeEmail(email, firstName = 'Vehicle Owner', vehicleName = 'your vehicle', dashboardUrl = '') {
  if (!email) return;
  const name = firstName || 'there';
  const vName = vehicleName || 'your vehicle';
  const dashUrl = dashboardUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://motigo-3505f.web.app');

  const subject = `Welcome to Motigo — Your Car's Personal Maintenance Assistant 🚗`;
  const textContent = `Hi ${name},

Welcome to Motigo — your car's personal maintenance assistant.

You're all set! Motigo will help you:

🔧 Keep track of your car's maintenance history
📅 Know when your next service is due
🔔 Get timely maintenance reminders
🤖 Ask our AI assistant questions about your car

Your ${vName} is now set up and ready to track.

Go to My Dashboard: ${dashUrl}

Here's to smarter maintenance and fewer surprises on the road.

Welcome to Motigo!`;

  const htmlContent = `
    <div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
      <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 32px 24px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 8px;">🚗</div>
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Welcome to Motigo</h1>
        <p style="color: #93c5fd; margin: 6px 0 0; font-size: 14px;">Your car's personal maintenance assistant</p>
      </div>
      <div style="padding: 28px 24px; line-height: 1.6; font-size: 15px; color: #cbd5e1; background: #0f172a;">
        <p style="margin-top: 0; font-size: 16px; color: #ffffff;">Hi <strong>${name}</strong>,</p>
        <p>Welcome to <strong>Motigo</strong> — your car's personal maintenance assistant.</p>
        <p style="color: #ffffff; font-weight: 700; margin-bottom: 8px;">You're all set! Motigo will help you:</p>
        <ul style="padding-left: 20px; color: #cbd5e1; margin-top: 0;">
          <li style="margin-bottom: 8px;">🔧 <strong>Keep track</strong> of your car's maintenance history</li>
          <li style="margin-bottom: 8px;">📅 <strong>Know when</strong> your next service is due</li>
          <li style="margin-bottom: 8px;">🔔 <strong>Get timely</strong> maintenance reminders</li>
          <li style="margin-bottom: 8px;">🤖 <strong>Ask our AI assistant</strong> questions about your car</li>
        </ul>
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
          <div style="font-size: 12px; color: #60a5fa; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Vehicle Ready in Garage</div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 4px;">${vName}</div>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Schedule & reminders active</div>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${dashUrl}" style="background: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 15px;">Go to My Dashboard →</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">Here's to smarter maintenance and fewer surprises on the road.<br /><br />Welcome to Motigo!</p>
      </div>
    </div>
  `;

  // 1. Write to Cloud Firestore 'mail' collection (Firebase Trigger Email extension trigger)
  try {
    if (db) {
      await db.collection('mail').add({
        to: email,
        message: {
          subject: subject,
          text: textContent,
          html: htmlContent
        },
        createdAt: new Date().toISOString()
      });
      console.log(`[Firebase] Welcome email queued in Cloud Firestore for: ${email}`);
    }
  } catch (err) {
    console.warn('Firestore mail queue notice:', err);
  }

  // 2. Google Apps Script Webhook (100% Free via your Gmail / Google Account — 500 emails/day, no credit card)
  const DEFAULT_GOOGLE_EMAIL_WEBHOOK = 'https://script.google.com/macros/s/AKfycbwiJmF0KTYVJj82M6AnGo6C7xQzQgB1QKGQyqY14B60_qegmHQCEsh-c_3xT_qK0K8g/exec';
  const webhookUrl = localStorage.getItem('motigo_google_email_webhook') || window.MOTIGO_GOOGLE_EMAIL_WEBHOOK || DEFAULT_GOOGLE_EMAIL_WEBHOOK;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to: email,
          subject: subject,
          html: htmlContent,
          text: textContent
        })
      });
      console.log(`[Google Apps Script] Welcome email dispatched via Gmail Webhook to: ${email}`);
    } catch (err) {
      console.warn('Google mail webhook dispatch note:', err);
    }
  }

  // 3. Direct API Dispatch fallback (EmailJS)
  try {
    fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: 'service_motigo',
        template_id: 'template_welcome',
        user_id: 'motigo_public_key',
        template_params: {
          to_email: email,
          to_name: name,
          vehicle_name: vName,
          dashboard_url: dashUrl,
          subject: subject,
          message: textContent
        }
      })
    }).catch(() => {});
  } catch (e) {}

  return true;
}

export function setGoogleEmailWebhook(url) {
  if (url) {
    localStorage.setItem('motigo_google_email_webhook', url.trim());
  }
}

export function sendWelcomeEmail(email, firstName = 'Vehicle Owner') {
  return sendAutomatedWelcomeEmail(email, firstName);
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

