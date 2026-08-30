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
  if (!db) return [];
  try {
    const snapshot = await db.collection('users').get();
    const userList = await Promise.all(snapshot.docs.map(async (userDoc) => {
      const uData = userDoc.data();
      const uId = userDoc.id;

      const vehSnap = await db.collection('users').doc(uId).collection('vehicles').get();
      const vehicles = vehSnap.docs.map(v => v.data());

      const firstName = uData.firstName || 'User';
      const lastName = uData.lastName || '';
      const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase() || 'U';

      return {
        id: uId,
        firstName,
        lastName,
        email: uData.email || '',
        phone: uData.phone || 'N/A',
        avatarInitials: initials,
        avatarColor: '#3b82f6',
        createdAt: uData.createdAt || new Date().toISOString(),
        lastLoginAt: uData.lastLoginAt || null,
        isActive: uData.lastLoginAt ? (Date.now() - new Date(uData.lastLoginAt).getTime() < 30 * 86400000) : true,
        vehicleCount: vehicles.length,
        vehicles: vehicles.map(v => ({
          make: v.make,
          model: v.model,
          year: v.year,
          status: v.status || 'on_track',
          plate: v.registrationNumber || 'N/A'
        }))
      };
    }));

    return userList;
  } catch (err) {
    console.error('Error fetching admin user list:', err);
    return [];
  }
}

export async function deleteUserFromDbByAdmin(userId) {
  if (!userId || !db) return;
  try {
    await db.collection('users').doc(userId).delete();
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
    throw err;
  }
}
