import { initialVehicles, initialMaintenanceRecords, initialNotifications, initialUser, adminCredentials, mockUserRegistry } from './mockData.js';
import { calculateVehicleStatus, calculateNextDueDate } from './maintenanceEngine.js';
import { signUpUser, signInUser, signOutUser, subscribeToAuth } from './auth.js';
import { 
  listenToVehicles, 
  saveVehicleToDb, 
  deleteVehicleFromDb, 
  listenToRecords, 
  saveRecordToDb, 
  listenToNotifications, 
  saveNotificationToDb, 
  updateUserProfile,
  getAllUsersForAdmin 
} from './db.js';

// Admin user registry — updated from Firestore or fallback mock
export let adminUserRegistry = JSON.parse(JSON.stringify(mockUserRegistry));

class StateStore {
  constructor() {
    this.STORAGE_KEY = 'motigo_app_state_v3';
    this.STORAGE_KEY_LEGACY = 'motigo_app_state_v2';
    this.CHAT_KEY = 'motigo_ai_chat_v2';
    this.subscribers = [];
    this.isAdmin = false;
    this.adminUser = null;
    this.isAuthLoading = true;

    this.unsubVehicles = null;
    this.unsubRecords = null;
    this.unsubNotifications = null;

    this.resetToDefaults();
    this.initFirebaseAuth();
  }

  initFirebaseAuth() {
    subscribeToAuth(async ({ firebaseUser, profile, isAdmin, adminData }) => {
      this.isAuthLoading = false;
      if (firebaseUser) {
        this.isLoggedIn = true;
        this.isAdmin = isAdmin;
        if (isAdmin) {
          this.adminUser = adminData;
          this.loadAdminData();
        }

        this.user = {
          id: firebaseUser.uid,
          firstName: profile?.firstName || firebaseUser.displayName || 'User',
          lastName: profile?.lastName || '',
          email: firebaseUser.email,
          phone: profile?.phone || '',
          currency: profile?.currency || 'NGN',
          currencySymbol: profile?.currencySymbol || '₦',
          distanceUnit: profile?.distanceUnit || 'km',
          avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          isVerified: true
        };

        // Attach Firestore Real-Time Snapshot Listeners
        this.attachDbListeners(firebaseUser.uid);
      } else {
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.adminUser = null;
        this.detachDbListeners();
        this.vehicles = [];
        this.records = [];
        this.notifications = [];
      }
      this.notify();
    });
  }

  attachDbListeners(userId) {
    this.detachDbListeners();

    this.unsubVehicles = listenToVehicles(userId, (vehicles) => {
      this.vehicles = vehicles;
      if (!this.activeVehicleId && vehicles.length > 0) {
        this.activeVehicleId = vehicles[0].id;
        this.selectedVehicleDetailId = vehicles[0].id;
      }
      this.notify();
    });

    this.unsubRecords = listenToRecords(userId, (records) => {
      this.records = records;
      this.notify();
    });

    this.unsubNotifications = listenToNotifications(userId, (notifications) => {
      this.notifications = notifications;
      this.notify();
    });
  }

  detachDbListeners() {
    if (this.unsubVehicles) { this.unsubVehicles(); this.unsubVehicles = null; }
    if (this.unsubRecords) { this.unsubRecords(); this.unsubRecords = null; }
    if (this.unsubNotifications) { this.unsubNotifications(); this.unsubNotifications = null; }
  }

  async loadAdminData() {
    const firestoreUsers = await getAllUsersForAdmin();
    if (firestoreUsers && firestoreUsers.length > 0) {
      adminUserRegistry = firestoreUsers;
      this.notify();
    }
  }

  loadState() {
    try {
      // Try new v3 key first, fall back to legacy v2 key for migration
      let saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        saved = localStorage.getItem(this.STORAGE_KEY_LEGACY);
      }

      if (saved) {
        const parsed = JSON.parse(saved);

        // --- MIGRATION: strip out the three original seeded demo vehicles ---
        const demoIds = this.DEMO_VEHICLE_IDS;
        const rawVehicles = parsed.vehicles || initialVehicles;
        const rawRecords = parsed.records || initialMaintenanceRecords;
        const rawNotifs  = parsed.notifications || initialNotifications;

        this.vehicles      = rawVehicles.filter(v => !demoIds.includes(v.id));
        this.records       = rawRecords.filter(r => !demoIds.includes(r.vehicleId));
        this.notifications = rawNotifs.filter(n => !demoIds.includes(n.vehicleId));
        // ------------------------------------------------------------------

        this.user = parsed.user || initialUser;
        this.activeVehicleId = (this.vehicles.find(v => v.id === parsed.activeVehicleId))
          ? parsed.activeVehicleId
          : (this.vehicles[0] ? this.vehicles[0].id : null);
        this.activeView = parsed.activeView || 'dashboard';
        this.selectedVehicleDetailId = this.activeVehicleId;
        this.isLoggedIn = parsed.isLoggedIn !== undefined ? parsed.isLoggedIn : true;
        this.isVerified = parsed.isVerified !== undefined ? parsed.isVerified : true;
        this.onboarding = parsed.onboarding || {
          isActive: false,
          step: 1,
          totalSteps: 5,
          data: {
            make: 'Toyota',
            model: 'Camry',
            year: 2022,
            engineType: 'Petrol',
            currentMileage: 45000,
            nickname: 'My Camry',
            registrationNumber: '',
            vin: '',
            lastServiceDate: '2026-06-15',
            lastServiceMileage: 40000,
            serviceItems: ['Full service', 'Engine oil change', 'Oil filter'],
            serviceCost: 65000,
            serviceProvider: 'Master AutoCare',
            frequencyMonths: 6,
            trackMileage: true,
            mileageInterval: 10000,
            reminders: {
              sevenDays: true,
              oneDay: true,
              dueDate: true,
              overdue: true
            }
          }
        };
      } else {
        this.resetToDefaults();
      }

      const chatSaved = localStorage.getItem(this.CHAT_KEY);
      if (chatSaved) {
        this.aiChatHistory = JSON.parse(chatSaved);
      } else {
        this.initDefaultChat();
      }
    } catch (e) {
      console.error('Error loading Motigo state from localStorage', e);
      this.resetToDefaults();
      this.initDefaultChat();
    }
  }


  initDefaultChat() {
    this.aiChatHistory = [
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: `Hello ${this.user.firstName}! 👋 I am **Motigo AI**, your car's personal maintenance assistant.\n\nI have loaded the full history and technical specs for your **Toyota Camry** (82,000 km). Ask me anything about your service schedule, strange sounds, pre-road trip checklists, or upcoming maintenance!`,
        actions: [
          { label: '📅 When is my next service?', action: 'ask_next_service' },
          { label: '⚠️ Which car is overdue?', action: 'ask_overdue' },
          { label: '✓ Log Completed Service', action: 'complete_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What maintenance should I do next?',
          'What should I check before a long road trip?'
        ],
        timestamp: new Date().toISOString()
      }
    ];
  }

  saveState() {
    try {
      const stateObj = {
        user: this.user,
        vehicles: this.vehicles,
        records: this.records,
        notifications: this.notifications,
        activeVehicleId: this.activeVehicleId,
        activeView: this.activeView,
        selectedVehicleDetailId: this.selectedVehicleDetailId,
        isLoggedIn: this.isLoggedIn,
        isVerified: this.isVerified,
        onboarding: this.onboarding
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateObj));
      localStorage.setItem(this.CHAT_KEY, JSON.stringify(this.aiChatHistory));
    } catch (e) {
      console.warn('Could not write to localStorage', e);
    }
    this.notify();
  }

  resetToDefaults() {
    this.user = { ...initialUser };
    this.vehicles = JSON.parse(JSON.stringify(initialVehicles));
    this.records = JSON.parse(JSON.stringify(initialMaintenanceRecords));
    this.notifications = JSON.parse(JSON.stringify(initialNotifications));
    this.activeVehicleId = this.vehicles[0] ? this.vehicles[0].id : null;
    this.selectedVehicleDetailId = this.activeVehicleId;
    this.activeView = 'dashboard';
    this.isLoggedIn = true;
    this.isVerified = true;
    this.onboarding = {
      isActive: false,
      step: 1,
      totalSteps: 5,
      data: {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        engineType: 'Petrol',
        currentMileage: 45000,
        nickname: 'My Camry',
        registrationNumber: '',
        vin: '',
        lastServiceDate: '2026-06-15',
        lastServiceMileage: 40000,
        serviceItems: ['Full service', 'Engine oil change', 'Oil filter'],
        serviceCost: 65000,
        serviceProvider: 'Master AutoCare',
        frequencyMonths: 6,
        trackMileage: true,
        mileageInterval: 10000,
        reminders: {
          sevenDays: true,
          oneDay: true,
          dueDate: true,
          overdue: true
        }
      }
    };
    this.initDefaultChat();
    this.saveState();
  }

  subscribe(listener) {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== listener);
    };
  }

  notify() {
    this.subscribers.forEach(sub => {
      try {
        sub(this);
      } catch (err) {
        console.error('State subscriber error:', err);
      }
    });
  }

  // --- Navigation & View Controls ---
  setView(viewName) {
    this.activeView = viewName;
    this.saveState();
  }

  viewVehicleDetail(vehicleId) {
    this.selectedVehicleDetailId = vehicleId;
    this.activeVehicleId = vehicleId;
    this.activeView = 'vehicle-detail';
    this.saveState();
  }

  setActiveVehicle(vehicleId) {
    const exists = this.vehicles.find(v => v.id === vehicleId);
    if (exists) {
      this.activeVehicleId = vehicleId;
      this.selectedVehicleDetailId = vehicleId;
      this.saveState();
    }
  }

  getActiveVehicle() {
    return this.vehicles.find(v => v.id === this.activeVehicleId) || this.vehicles[0] || null;
  }

  getSelectedVehicleDetail() {
    return this.vehicles.find(v => v.id === this.selectedVehicleDetailId) || this.getActiveVehicle();
  }

  // --- Authentication Actions ---
  async adminLoginUser(email, password) {
    try {
      if (
        email.trim().toLowerCase() === adminCredentials.email &&
        password === adminCredentials.password
      ) {
        this.isAdmin = true;
        this.adminUser = { ...adminCredentials };
        this.isLoggedIn = false;
        this.notify();
        return true;
      }
      // Or sign in via Firebase Auth and verify admin status
      const user = await signInUser(email, password);
      if (user && this.isAdmin) {
        this.activeView = 'admin-dashboard';
        this.notify();
        return true;
      }
    } catch (err) {
      console.error('Admin login error:', err);
    }
    return false;
  }

  async loginUser(email, password) {
    try {
      await signInUser(email, password);
      this.activeView = 'dashboard';
      this.notify();
      return true;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  async registerUser(formData) {
    try {
      const email = formData.email || 'user@motigo.app';
      const password = formData.password || 'password123';
      const firstName = formData.firstName || 'User';
      const lastName = formData.lastName || '';
      const phone = formData.phone || '';

      await signUpUser(email, password, firstName, lastName, phone);
      this.activeView = 'verify-email';
      this.notify();
      return true;
    } catch (err) {
      console.error('Register error:', err);
      throw err;
    }
  }

  verifyEmail(code) {
    this.isVerified = true;
    this.startOnboarding();
  }

  async logoutUser() {
    this.detachDbListeners();
    this.isLoggedIn = false;
    this.isAdmin = false;
    this.adminUser = null;
    this.activeView = 'landing';
    await signOutUser();
    this.notify();
  }

  // --- Onboarding Wizard Actions (Sections 9-14) ---
  startOnboarding() {
    this.onboarding.isActive = true;
    this.onboarding.step = 1;
    this.activeView = 'onboarding';
    this.saveState();
  }

  updateOnboardingData(stepData) {
    this.onboarding.data = { ...this.onboarding.data, ...stepData };
    this.saveState();
  }

  setOnboardingStep(stepNumber) {
    this.onboarding.step = stepNumber;
    this.saveState();
  }

  completeOnboarding() {
    const data = this.onboarding.data;
    
    // Create new vehicle from onboarding
    const freqMonths = Number(data.frequencyMonths) || 6;
    const mileageInt = data.trackMileage ? (Number(data.mileageInterval) || 10000) : null;
    const curMileage = Number(data.currentMileage) || 45000;
    const lastDate = data.lastServiceDate || new Date().toISOString().split('T')[0];
    const lastMileage = Number(data.lastServiceMileage) || curMileage;

    const nextDueDate = calculateNextDueDate(lastDate, freqMonths);
    const nextDueMileage = mileageInt ? lastMileage + mileageInt : curMileage + 10000;

    const newVehicle = {
      id: 'veh-' + Date.now(),
      userId: this.user.id,
      make: data.make || 'Toyota',
      model: data.model || 'Camry',
      year: Number(data.year) || 2022,
      engineType: data.engineType || 'Petrol',
      currentMileage: curMileage,
      registrationNumber: data.registrationNumber || 'MOT-2026',
      vin: data.vin || '',
      colour: 'Obsidian Black',
      nickname: data.nickname || `${data.make} ${data.model}`,
      photoUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&auto=format&fit=crop&q=80',
      schedule: {
        id: 'sch-' + Date.now(),
        frequencyMonths: freqMonths,
        mileageInterval: mileageInt || 10000,
        lastServiceDate: lastDate,
        lastServiceMileage: lastMileage,
        nextDueDate: nextDueDate,
        nextDueMileage: nextDueMileage,
        type: mileageInt ? 'combined' : 'time'
      }
    };

    this.vehicles.unshift(newVehicle);
    this.activeVehicleId = newVehicle.id;
    this.selectedVehicleDetailId = newVehicle.id;

    // If last service was recorded during onboarding
    if (data.serviceItems && data.serviceItems.length > 0 && !data.skipLastService) {
      const initialRecord = {
        id: 'rec-' + Date.now(),
        vehicleId: newVehicle.id,
        maintenanceType: data.serviceItems[0] || 'Full service',
        date: lastDate,
        mileage: lastMileage,
        totalCost: Number(data.serviceCost) || 0,
        partsCost: Math.round((Number(data.serviceCost) || 0) * 0.7),
        labourCost: Math.round((Number(data.serviceCost) || 0) * 0.3),
        serviceProvider: data.serviceProvider || 'Auto Care Specialist',
        description: `Initial maintenance logged during onboarding.`,
        documentName: data.documentName || null,
        documentData: data.documentData || null,
        items: data.serviceItems
      };
      this.records.unshift(initialRecord);
    }

    // Add Welcome notification & reminder notification
    await this.addNotification({
      userId: this.user.id,
      vehicleId: newVehicle.id,
      type: 'welcome',
      title: `Welcome to Motigo! 🚗`,
      message: `Hi ${this.user.firstName || 'there'}, welcome to Motigo — your car's personal maintenance assistant. Your ${newVehicle.year} ${newVehicle.make} ${newVehicle.model} is now set up and ready to track.`,
      actionRequired: false,
      scheduledDueDate: nextDueDate
    });

    await this.addNotification({
      userId: this.user.id,
      vehicleId: newVehicle.id,
      type: 'on_track',
      title: `Vehicle Registered: ${newVehicle.year} ${newVehicle.make} ${newVehicle.model}`,
      message: `Maintenance schedule established: Next due ${nextDueDate} or at ${nextDueMileage.toLocaleString()} km.`,
      actionRequired: false,
      scheduledDueDate: nextDueDate
    });

    this.onboarding.isActive = false;
    this.activeView = 'dashboard';
    this.saveState();
  }

  // --- Vehicle Management (Section 18) ---
  async addVehicle(vehicleData) {
    const frequencyMonths = Number(vehicleData.frequencyMonths) || 6;
    const mileageInterval = Number(vehicleData.mileageInterval) || 10000;
    const currentMileage = Number(vehicleData.currentMileage) || 0;
    const today = new Date().toISOString().split('T')[0];

    const nextDueDate = calculateNextDueDate(today, frequencyMonths);
    const nextDueMileage = currentMileage + mileageInterval;

    const newVehicle = {
      id: 'veh-' + Date.now(),
      userId: this.user.id,
      make: vehicleData.make || 'Toyota',
      model: vehicleData.model || 'Corolla',
      year: Number(vehicleData.year) || 2022,
      engineType: vehicleData.engineType || 'Petrol',
      currentMileage: currentMileage,
      registrationNumber: vehicleData.registrationNumber || 'KJA-000-XX',
      vin: vehicleData.vin || '',
      colour: vehicleData.colour || 'Silver',
      nickname: vehicleData.nickname || `${vehicleData.make} ${vehicleData.model}`,
      photoUrl: vehicleData.photoUrl || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80',
      schedule: {
        id: 'sch-' + Date.now(),
        frequencyMonths: frequencyMonths,
        mileageInterval: mileageInterval,
        lastServiceDate: today,
        lastServiceMileage: currentMileage,
        nextDueDate: nextDueDate,
        nextDueMileage: nextDueMileage,
        type: 'combined'
      }
    };

    if (this.user.id) {
      await saveVehicleToDb(this.user.id, newVehicle);
    } else {
      this.vehicles.unshift(newVehicle);
    }
    this.activeVehicleId = newVehicle.id;
    this.selectedVehicleDetailId = newVehicle.id;

    this.addNotification({
      userId: this.user.id,
      vehicleId: newVehicle.id,
      type: 'on_track',
      title: `Vehicle Registered: ${newVehicle.year} ${newVehicle.make} ${newVehicle.model}`,
      message: `Maintenance schedule established: Every ${frequencyMonths} months or ${mileageInterval.toLocaleString()} km.`,
      actionRequired: false,
      scheduledDueDate: nextDueDate
    });

    this.saveState();
    return newVehicle;
  }

  async updateVehicle(id, updateData) {
    const idx = this.vehicles.findIndex(v => v.id === id);
    if (idx !== -1) {
      this.vehicles[idx] = { ...this.vehicles[idx], ...updateData };
      if (this.user.id) {
        await saveVehicleToDb(this.user.id, this.vehicles[idx]);
      }
      this.saveState();
    }
  }

  async deleteVehicle(id) {
    this.vehicles = this.vehicles.filter(v => v.id !== id);
    this.records = this.records.filter(r => r.vehicleId !== id);
    this.notifications = this.notifications.filter(n => n.vehicleId !== id);
    if (this.activeVehicleId === id) {
      this.activeVehicleId = this.vehicles[0] ? this.vehicles[0].id : null;
    }
    if (this.selectedVehicleDetailId === id) {
      this.selectedVehicleDetailId = this.activeVehicleId;
    }
    if (this.user.id) {
      await deleteVehicleFromDb(this.user.id, id);
    }
    this.saveState();
  }

  async updateMileage(vehicleId, newMileage) {
    const num = Number(newMileage);
    const veh = this.vehicles.find(v => v.id === vehicleId);
    if (!veh) return null;

    const previousMileage = veh.currentMileage;
    const isLower = num < previousMileage;
    
    veh.currentMileage = num;
    if (this.user.id) {
      await saveVehicleToDb(this.user.id, veh);
    }

    // Check if status changed
    const statusObj = calculateVehicleStatus(veh);
    if (statusObj.isOverdue) {
      this.addNotification({
        userId: this.user.id,
        vehicleId: veh.id,
        type: 'overdue',
        title: `Your ${veh.make} ${veh.model} maintenance is overdue`,
        message: `Odometer reached ${num.toLocaleString()} km (Scheduled threshold was ${veh.schedule.nextDueMileage.toLocaleString()} km).`,
        actionRequired: true,
        scheduledDueDate: veh.schedule.nextDueDate
      });
    }

    this.saveState();
    return {
      previousMileage,
      newMileage: num,
      delta: num - previousMileage,
      isLower
    };
  }

  // --- Maintenance Records & Completion (Sections 20, 21, 23) ---
  async completeMaintenance(data) {
    const veh = this.vehicles.find(v => v.id === data.vehicleId);
    if (!veh) return;

    const newMileage = Number(data.mileage) || veh.currentMileage;
    const completionDate = data.date || new Date().toISOString().split('T')[0];

    // 1. Create Maintenance Record
    const newRecord = {
      id: 'rec-' + Date.now(),
      vehicleId: veh.id,
      maintenanceType: data.maintenanceType || 'Full service',
      date: completionDate,
      mileage: newMileage,
      totalCost: Number(data.totalCost) || 0,
      partsCost: Number(data.partsCost) || 0,
      labourCost: Number(data.labourCost) || 0,
      serviceProvider: data.serviceProvider || 'Certified Auto Care',
      description: data.description || 'Routine scheduled maintenance performed.',
      documentName: data.documentName || (data.hasDocument ? 'Service_Invoice_' + completionDate + '.pdf' : null),
      documentData: data.documentData || null,
      documentSize: data.documentSize || null,
      documentType: data.documentType || null,
      items: data.items && data.items.length > 0 ? data.items : [data.maintenanceType || 'Full service']
    };

    if (this.user.id) {
      await saveRecordToDb(this.user.id, newRecord);
    } else {
      this.records.unshift(newRecord);
    }

    // 2. Rollover Schedule (Dual-Trigger: Next Date & Next Mileage)
    const frequencyMonths = veh.schedule.frequencyMonths || 6;
    const mileageInterval = veh.schedule.mileageInterval || 10000;

    const nextDueDate = calculateNextDueDate(completionDate, frequencyMonths);
    const nextDueMileage = newMileage + mileageInterval;

    veh.currentMileage = newMileage;
    veh.schedule.lastServiceDate = completionDate;
    veh.schedule.lastServiceMileage = newMileage;
    veh.schedule.nextDueDate = nextDueDate;
    veh.schedule.nextDueMileage = nextDueMileage;

    if (this.user.id) {
      await saveVehicleToDb(this.user.id, veh);
    }

    // 3. Clear pending overdue notifications for this vehicle
    this.notifications.forEach(n => {
      if (n.vehicleId === veh.id && n.actionRequired) {
        n.actionRequired = false;
        n.isRead = true;
        if (this.user.id) saveNotificationToDb(this.user.id, n);
      }
    });

    // 4. Create confirmation notification
    await this.addNotification({
      userId: this.user.id,
      vehicleId: veh.id,
      type: 'on_track',
      title: `Maintenance Completed: ${veh.make} ${veh.model}`,
      message: `Service logged at ${newMileage.toLocaleString()} km. Next service scheduled for ${nextDueDate} or ${nextDueMileage.toLocaleString()} km.`,
      actionRequired: false,
      scheduledDueDate: nextDueDate
    });

    this.saveState();
    return { record: newRecord, nextDueDate, nextDueMileage };
  }

  updateSchedule(vehicleId, scheduleData) {
    const veh = this.vehicles.find(v => v.id === vehicleId);
    if (!veh) return;

    if (scheduleData.frequencyMonths) veh.schedule.frequencyMonths = Number(scheduleData.frequencyMonths);
    if (scheduleData.mileageInterval) veh.schedule.mileageInterval = Number(scheduleData.mileageInterval);
    if (scheduleData.nextDueDate) veh.schedule.nextDueDate = scheduleData.nextDueDate;
    if (scheduleData.nextDueMileage) veh.schedule.nextDueMileage = Number(scheduleData.nextDueMileage);

    this.saveState();
  }

  // --- Notification Management (Sections 31-33) ---
  addNotification(notif) {
    const newNotif = {
      id: 'notif-' + Date.now(),
      userId: this.user.id,
      vehicleId: notif.vehicleId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      timestamp: new Date().toISOString(),
      isRead: false,
      actionRequired: notif.actionRequired || false,
      scheduledDueDate: notif.scheduledDueDate || ''
    };
    this.notifications.unshift(newNotif);
    this.saveState();
  }

  markAllNotificationsRead() {
    this.notifications.forEach(n => { n.isRead = true; });
    this.saveState();
  }

  // --- AI Chat History ---
  addChatMessage(sender, text, options = {}) {
    const msg = {
      id: 'msg-' + Date.now(),
      sender,
      text,
      diagnostic: options.diagnostic || null,
      actions: options.actions || [],
      suggestions: options.suggestions || [],
      timestamp: new Date().toISOString()
    };
    this.aiChatHistory.push(msg);
    this.saveState();
    return msg;
  }

  clearAiChat() {
    this.initDefaultChat();
    this.saveState();
  }

  // --- User Preferences ---
  updateUserPreferences(prefs) {
    this.user = { ...this.user, ...prefs };
    this.saveState();
  }
}

export const store = new StateStore();
