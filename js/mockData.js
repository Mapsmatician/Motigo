// Motigo Mock & Seed Data (Aligned with Master Build Prompt)

export const initialUser = {
  id: 'usr-1',
  firstName: 'Christopher',
  lastName: 'Okonkwo',
  email: 'christopher@motigo.app',
  currency: 'NGN',
  currencySymbol: '₦',
  distanceUnit: 'km',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
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

// No demo vehicles — users start with an empty garage
export const initialVehicles = [];


// No demo maintenance records — only real user-logged records load
export const initialMaintenanceRecords = [];


export const maintenanceTypeOptions = [
  'Full service',
  'Engine oil change',
  'Oil filter',
  'Air filter',
  'Cabin filter',
  'Brake inspection',
  'Brake pad replacement',
  'Brake fluid',
  'Tyre replacement',
  'Tyre rotation',
  'Wheel alignment',
  'Battery replacement',
  'Coolant replacement',
  'Transmission service',
  'General repair',
  'Other'
];

export const vehicleMakesList = [
  'Toyota',
  'Lexus',
  'Honda',
  'Mercedes-Benz',
  'BMW',
  'Ford',
  'Hyundai',
  'Kia',
  'Nissan',
  'Peugeot',
  'Volkswagen',
  'Audi',
  'Mazda',
  'Land Rover',
  'Chevrolet',
  'Other'
];

// No demo notifications — clean slate for real users
export const initialNotifications = [];

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PORTAL DATA
// ─────────────────────────────────────────────────────────────────────────────

export const adminCredentials = {
  email: 'admin@motigo.app',
  password: 'motigo@admin',
  firstName: 'Admin',
  lastName: 'Portal',
  role: 'Super Administrator'
};

// Simulated user registry visible to the admin
export const mockUserRegistry = [
  {
    id: 'usr-1',
    firstName: 'Christopher',
    lastName: 'Okonkwo',
    email: 'christopher@motigo.app',
    phone: '+234 802 345 6789',
    avatarInitials: 'CO',
    avatarColor: '#3b82f6',
    createdAt: '2026-01-10T08:00:00Z',
    lastLoginAt: null, // filled dynamically on login
    isActive: true,
    vehicleCount: 1,
    vehicles: [
      { make: 'Honda', model: 'Accord', year: 2011, status: 'overdue', plate: 'AKD464' }
    ]
  },
  {
    id: 'usr-2',
    firstName: 'Amaka',
    lastName: 'Eze',
    email: 'amaka.eze@gmail.com',
    phone: '+234 706 198 4421',
    avatarInitials: 'AE',
    avatarColor: '#10b981',
    createdAt: '2026-02-14T11:30:00Z',
    lastLoginAt: '2026-08-28T09:14:22Z',
    isActive: true,
    vehicleCount: 2,
    vehicles: [
      { make: 'Toyota', model: 'Corolla', year: 2018, status: 'on_track', plate: 'LSD-291-AA' },
      { make: 'Honda', model: 'HR-V', year: 2021, status: 'due_soon', plate: 'LSD-004-BB' }
    ]
  },
  {
    id: 'usr-3',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    email: 'emeka.nwosu@yahoo.com',
    phone: '+234 814 552 0033',
    avatarInitials: 'EN',
    avatarColor: '#f59e0b',
    createdAt: '2026-03-01T07:45:00Z',
    lastLoginAt: '2026-08-22T16:03:55Z',
    isActive: true,
    vehicleCount: 1,
    vehicles: [
      { make: 'Toyota', model: 'Camry', year: 2019, status: 'on_track', plate: 'KJA-772-AA' }
    ]
  },
  {
    id: 'usr-4',
    firstName: 'Fatima',
    lastName: 'Bello',
    email: 'fatima.b@hotmail.com',
    phone: '+234 903 671 2200',
    avatarInitials: 'FB',
    avatarColor: '#8b5cf6',
    createdAt: '2026-04-20T13:15:00Z',
    lastLoginAt: '2026-07-15T10:30:00Z',
    isActive: false,
    vehicleCount: 3,
    vehicles: [
      { make: 'Lexus', model: 'RX350', year: 2020, status: 'on_track', plate: 'ABJ-550-LX' },
      { make: 'Toyota', model: 'Hiace', year: 2018, status: 'overdue', plate: 'ABJ-102-YD' },
      { make: 'Mercedes-Benz', model: 'GLE', year: 2022, status: 'on_track', plate: 'ABJ-GLE-22' }
    ]
  },
  {
    id: 'usr-5',
    firstName: 'Tunde',
    lastName: 'Adeyemi',
    email: 'tunde.adeyemi@motigo.app',
    phone: '+234 812 004 8810',
    avatarInitials: 'TA',
    avatarColor: '#ef4444',
    createdAt: '2026-05-08T09:00:00Z',
    lastLoginAt: '2026-08-29T07:52:00Z',
    isActive: true,
    vehicleCount: 1,
    vehicles: [
      { make: 'Ford', model: 'Explorer', year: 2017, status: 'due_soon', plate: 'OYO-490-FD' }
    ]
  },
  {
    id: 'usr-6',
    firstName: 'Ngozi',
    lastName: 'Uche',
    email: 'ngozi.uche@outlook.com',
    phone: '+234 708 321 9945',
    avatarInitials: 'NU',
    avatarColor: '#06b6d4',
    createdAt: '2026-06-30T15:20:00Z',
    lastLoginAt: '2026-08-27T14:10:00Z',
    isActive: true,
    vehicleCount: 2,
    vehicles: [
      { make: 'Hyundai', model: 'Tucson', year: 2020, status: 'on_track', plate: 'PH-221-HY' },
      { make: 'Kia', model: 'Sportage', year: 2021, status: 'on_track', plate: 'PH-889-KA' }
    ]
  }
];
