// Motigo — Firestore Database CRUD Layer (Universal Compat)
import { db } from './firebase.js';

/**
 * --- VEHICLES ---
 */
export function listenToVehicles(userId, callback) {
  if (!userId || !db) return () => {};
  return db.collection('users').doc(userId).collection('vehicles').onSnapshot((snapshot) => {
    const vehicles = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(vehicles);
  }, (err) => {
    console.error('Error listening to vehicles:', err);
  });
}

export async function saveVehicleToDb(userId, vehicle) {
  if (!userId || !db) return vehicle;
  const vehId = vehicle.id || 'veh-' + Date.now();
  const dataToSave = { ...vehicle, id: vehId, userId };
  await db.collection('users').doc(userId).collection('vehicles').doc(vehId).set(dataToSave, { merge: true });
  return dataToSave;
}

export async function deleteVehicleFromDb(userId, vehicleId) {
  if (!userId || !db) return;
  await db.collection('users').doc(userId).collection('vehicles').doc(vehicleId).delete();
}

/**
 * --- MAINTENANCE RECORDS ---
 */
export function listenToRecords(userId, callback) {
  if (!userId || !db) return () => {};
  return db.collection('users').doc(userId).collection('records').onSnapshot((snapshot) => {
    const records = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    callback(records);
  }, (err) => {
    console.error('Error listening to records:', err);
  });
}

export async function saveRecordToDb(userId, record) {
  if (!userId || !db) return record;
  const recId = record.id || 'rec-' + Date.now();
  const dataToSave = { ...record, id: recId, userId };
  await db.collection('users').doc(userId).collection('records').doc(recId).set(dataToSave, { merge: true });
  return dataToSave;
}

/**
 * --- NOTIFICATIONS ---
 */
export function listenToNotifications(userId, callback) {
  if (!userId || !db) return () => {};
  return db.collection('users').doc(userId).collection('notifications').onSnapshot((snapshot) => {
    const notifications = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    callback(notifications);
  }, (err) => {
    console.error('Error listening to notifications:', err);
  });
}

export async function saveNotificationToDb(userId, notification) {
  if (!userId || !db) return notification;
  const notifId = notification.id || 'notif-' + Date.now();
  const dataToSave = { ...notification, id: notifId, userId };
  await db.collection('users').doc(userId).collection('notifications').doc(notifId).set(dataToSave, { merge: true });
  return dataToSave;
}

/**
 * --- USER PROFILE ---
 */
export async function updateUserProfile(userId, profileData) {
  if (!userId || !db) return;
  await db.collection('users').doc(userId).update(profileData);
}

/**
 * --- ADMIN FUNCTIONS ---
 */
export async function getAllUsersForAdmin() {
  let rawList = [];

  if (db) {
    try {
      let snapshot = await db.collection('users').get();
      if (!snapshot || snapshot.empty) {
        snapshot = await db.collection('admin_user_registry').get();
      }

      if (snapshot && !snapshot.empty) {
        rawList = await Promise.all(snapshot.docs.map(async (userDoc) => {
          const uData = userDoc.data();
          const uId = userDoc.id;
          let vehicles = [];
          try {
            const vehSnap = await db.collection('users').doc(uId).collection('vehicles').get();
            if (vehSnap && !vehSnap.empty) {
              vehicles = vehSnap.docs.map(v => v.data());
            }
          } catch (e) {}
          return { id: uId, ...uData, vehicles };
        }));
      }
    } catch (err) {
      console.warn('Firestore admin query notice:', err);
    }
  }

  try {
    const localCache = JSON.parse(localStorage.getItem('motigo_registered_users') || '[]');
    const mergedMap = new Map();
    localCache.forEach(u => mergedMap.set(u.id || u.email, u));
    rawList.forEach(u => mergedMap.set(u.id || u.email, u));
    rawList = Array.from(mergedMap.values());
  } catch (e) {}

  return rawList.map(u => {
    const firstName = u.firstName || 'User';
    const lastName = u.lastName || '';
    const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase() || 'U';
    const vehArr = u.vehicles || [];

    return {
      id: u.id || u.email,
      firstName,
      lastName,
      email: u.email || '',
      phone: u.phone || 'N/A',
      avatarInitials: initials,
      avatarColor: '#3b82f6',
      createdAt: u.createdAt || new Date().toISOString(),
      lastLoginAt: u.lastLoginAt || null,
      isActive: true,
      vehicleCount: vehArr.length || u.vehicleCount || 0,
      vehicles: vehArr.map(v => ({
        make: v.make || 'Toyota',
        model: v.model || 'Corolla',
        year: v.year || 2022,
        status: v.status || 'on_track',
        plate: v.registrationNumber || v.plate || 'N/A'
      }))
    };
  });
}

export async function deleteUserFromDbByAdmin(userId) {
  if (!userId) return;
  
  // 1. Remove from local cache
  try {
    let list = JSON.parse(localStorage.getItem('motigo_registered_users') || '[]');
    list = list.filter(u => u.id !== userId && u.email !== userId);
    localStorage.setItem('motigo_registered_users', JSON.stringify(list));
  } catch (e) {}

  // 2. Remove from Firestore
  if (db) {
    try {
      await db.collection('users').doc(userId).delete();
      await db.collection('admin_user_registry').doc(userId).delete();
    } catch (err) {
      console.warn('Could not delete user from Firestore:', err);
    }
  }

  // 3. Delete from Firebase Auth if auth user matches
  if (typeof auth !== 'undefined' && auth && auth.currentUser && auth.currentUser.uid === userId) {
    try {
      await auth.currentUser.delete();
    } catch (e) {
      console.warn('Auth user deletion note:', e);
    }
  }
}

export async function purgeUserByEmailFromDb(targetEmail) {
  if (!targetEmail) return;
  const lowerEmail = targetEmail.toLowerCase().trim();

  // 1. Remove from local cache
  try {
    let list = JSON.parse(localStorage.getItem('motigo_registered_users') || '[]');
    list = list.filter(u => u.email && u.email.toLowerCase().trim() !== lowerEmail);
    localStorage.setItem('motigo_registered_users', JSON.stringify(list));
  } catch (e) {}

  // 2. Query and delete from Firestore
  if (db) {
    try {
      const snap1 = await db.collection('users').where('email', '==', lowerEmail).get();
      snap1.forEach(doc => doc.ref.delete());

      const snap2 = await db.collection('admin_user_registry').where('email', '==', lowerEmail).get();
      snap2.forEach(doc => doc.ref.delete());
    } catch (err) {
      console.warn('Could not purge email from Firestore:', err);
    }
  }
}
