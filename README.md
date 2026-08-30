# Motigo 🚗 — Your Car's Personal Maintenance Assistant

Motigo is a modern, responsive web application for tracking vehicle maintenance schedules, logging service records, calculating cost analytics, and consulting an AI maintenance assistant.

Powered by **Firebase Authentication** & **Cloud Firestore Database**, and built for 1-click deployment on **Netlify**.

---

## 🌟 Features

- **Multi-Vehicle Garage**: Manage one or multiple vehicles with custom service intervals.
- **Dual-Trigger Maintenance Engine**: Tracks maintenance deadlines by **date** and **odometer mileage** (whichever comes first).
- **Automated Welcome Email & Reminders**: Automatically sends a personalized welcome email upon user registration and vehicle setup, plus 7-day, 1-day, and due date reminder alerts.
- **Automotive Knowledge Base**: Built-in manufacturer specs library (oil grades, fluids, known issues, mileage milestones) integrated directly into Motigo AI.
- **Interactive AI Assistant**: Real-time vehicle-aware companion for diagnostics and checklists.
- **Cost Analytics**: Visualise maintenance expenses, parts vs. labour split, and monthly trends.
- **Admin Portal**: Super-admin dashboard for monitoring all registered users and active vehicles.
- **Firebase Auth & Firestore**: Real-time cloud sync across devices.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Vanilla CSS
- **Backend / Database**: Google Firebase (Authentication & Cloud Firestore)
- **Deployment**: Netlify (Static site hosting with client-side SPA routing)

---

## 🚀 Pushing to GitHub

Open PowerShell / Terminal in this folder and run:

```bash
# 1. Initialize Git repository
git init

# 2. Add all files and commit
git add .
git commit -m "feat: Motigo with Firebase Authentication & Cloud Firestore"

# 3. Rename branch to main
git branch -M main

# 4. Connect to your GitHub repository (replace with your repository URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/motigo.git

# 5. Push to GitHub
git push -u origin main
```

---

## 🌐 Deploying to Netlify

1. Go to **[netlify.com](https://app.netlify.com)** and sign in.
2. Click **"Add new site"** → **"Import an existing project"**.
3. Select **GitHub** and authorize Netlify.
4. Pick your `motigo` repository.
5. Set the build settings:
   - **Build command**: *(Leave blank)*
   - **Publish directory**: `.` (or leave as root)
6. Click **Deploy motigo**.
7. Netlify will build your site in seconds and give you a live domain URL (e.g. `https://motigo-app.netlify.app`).

---

## 🔥 Firebase Security Rules

To ensure your Firestore database is secure in production, set these rules in the **Firebase Console → Firestore Database → Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profile document and subcollections (vehicles, records, notifications)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Admins collection (Read-only for authenticated admin users)
    match /admins/{adminDoc} {
      allow read: if request.auth != null;
    }
    
    // Allow admins to view user documents
    match /users/{userId} {
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }
  }
}
```

---

## 🔑 Default Credentials

### User Registration
Click **"Create one now"** on the login page to register a new account stored in your Firebase project.

### Admin Portal Login
Access the **Admin Login** tab on the login screen using:
- **Email**: `admin@motigo.app`
- **Password**: `motigo@admin`

---

## 💻 Local Development

Run the lightweight PowerShell static server:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Open `http://localhost:8080` in your browser.
