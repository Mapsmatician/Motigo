// Motigo — Firestore Database CRUD Layer (Robust Direct CDN Imports)
import { db } from './firebase.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * --- VEHICLES ---
 */
export function listenToVehicles(userId, callback) {
  if (!userId) return () => {};
  const vehRef = collection(db, 'users', userId, 'vehicles');
  return onSnapshot(vehRef, (snapshot) => {
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
  const vehId = vehicle.id || 'veh-' + Date.now();
  const vehRef = doc(db, 'users', userId, 'vehicles', vehId);
  const dataToSave = { ...vehicle, id: vehId, userId };
  await setDoc(vehRef, dataToSave, { merge: true });
  return dataToSave;
}

export async function deleteVehicleFromDb(userId, vehicleId) {
  const vehRef = doc(db, 'users', userId, 'vehicles', vehicleId);
  await deleteDoc(vehRef);
}

/**
 * --- MAINTENANCE RECORDS ---
 */
export function listenToRecords(userId, callback) {
  if (!userId) return () => {};
  const recRef = collection(db, 'users', userId, 'records');
  return onSnapshot(recRef, (snapshot) => {
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
  const recId = record.id || 'rec-' + Date.now();
  const recRef = doc(db, 'users', userId, 'records', recId);
  const dataToSave = { ...record, id: recId, userId };
  await setDoc(recRef, dataToSave, { merge: true });
  return dataToSave;
}

/**
 * --- NOTIFICATIONS ---
 */
export function listenToNotifications(userId, callback) {
  if (!userId) return () => {};
  const notifRef = collection(db, 'users', userId, 'notifications');
  return onSnapshot(notifRef, (snapshot) => {
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
  const notifId = notification.id || 'notif-' + Date.now();
  const notifRef = doc(db, 'users', userId, 'notifications', notifId);
  const dataToSave = { ...notification, id: notifId, userId };
  await setDoc(notifRef, dataToSave, { merge: true });
  return dataToSave;
}

/**
 * --- USER PROFILE ---
 */
export async function updateUserProfile(userId, profileData) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, profileData);
}

/**
 * --- ADMIN FUNCTIONS ---
 */
export async function getAllUsersForAdmin() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const userList = await Promise.all(snapshot.docs.map(async (userDoc) => {
      const uData = userDoc.data();
      const uId = userDoc.id;

      const vehRef = collection(db, 'users', uId, 'vehicles');
      const vehSnap = await getDocs(vehRef);
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
