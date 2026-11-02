# 🍽️ Mess Manager — Student & Hostel Mess Management System

A modern, responsive, mobile-first web application designed for mess owners and hostel managers to track student subscriptions, calculate holidays, log daily dining entries, and automate WhatsApp communications with integrated fee reminders.

Built with pure vanilla web technologies (HTML5, CSS3, JavaScript) and powered by **Google Cloud Firestore**, this application requires **zero npm dependencies or build tools** and is engineered for instant deployment and easy multi-client white-labeling.

---

## 🚀 Key Features

- **👥 Multi-Gender Student Management**: Separate tracking for Boys and Girls with complete profiles, phone numbers, plans, join dates, and fee statuses.
- **🏖️ Smart Holiday Management**:
  - **Global Holidays**: Mess-wide closures that automatically extend all active student subscriptions.
  - **Personal Holidays**: Individual leave requests that dynamically recalculate the student's renewal date.
- **💰 Fee & Balance Tracking**: Instant visibility into paid amounts, pending balances, and overdue accounts.
- **💬 Automated WhatsApp Notifications**:
  - **Welcome Message**: One-click welcome text with subscription details and automatic gender-specific WhatsApp group links.
  - **Payment Reminders**: Includes student name, amount pending, and a clickable direct UPI payment link.
  - **Renewal Notifications**: Automatic computation of previous joining date, holidays taken, end date, and renewal terms.
- **☀️ Daily Dining & Collection Logs**: Daily meal tracking (Breakfast, Lunch, Dinner) with cash and online payment splits.
- **📋 Audit & Activity Logs**: Comprehensive timestamped history of all student additions, updates, renewals, and deletions.
- **🎨 Modern Dark & Light Mode**: Seamless theme switching with high-contrast accessibility.
- **💾 Cloud Sync & Local Backup**: Real-time synchronization via Firebase Firestore, plus 1-click JSON Data Export and Import.
- **🏢 Multi-Client Ready**: Easily sell and deploy to different mess clients using a single configuration file ([`credentials.js`](./credentials.js)).

---

## 📂 Project Structure

```text
mess-manager/
├── credentials.js       # ⭐ Central configuration (Mess branding, admin credentials, Firebase keys)
├── index.html           # Main application layout and modal containers
├── styles.css           # Complete responsive stylesheet (light/dark themes, desktop/mobile)
├── README.md            # Documentation and deployment guide
└── js/
    ├── actions.js       # User actions, modals, holiday calculators, import/export
    ├── auth.js          # Authentication overlay, session management, branding sync
    ├── calculations.js  # Date arithmetic, fee computations, holiday logic
    ├── firebase.js      # Firestore database integration & CRUD methods
    ├── helpers.js       # Date formatting, currency formatters, message templates
    ├── logs.js          # Activity logging system
    ├── render.js        # Dynamic HTML rendering for dashboard, student lists, holidays
    └── ui.js            # Toast alerts, modal controller, navigation tab switcher
```

---

## ⚡ Quick Start (Running Locally)

Because the project uses standard web standards without heavy frameworks, it runs instantly on any local web server:

### Option A: Using Python (Recommended)
```bash
# From the project root directory:
python -m http.server 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option B: Using Node.js
```bash
npx serve . -l 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔐 Default Admin Credentials

When opening the app for the first time, log in using:
- **User ID:** `admin`
- **Password:** `admin123`

*(You can customize these credentials in `credentials.js`).*

---

## 💼 Deploying to Multiple Mess Clients (White-Labeling)

To sell or set up this software for different mess owners, **you only need to edit [`credentials.js`](./credentials.js)**:

```javascript
const APP_CREDENTIALS = {

    // 1. Mess Branding
    messName: "Annapurna Mess",               // Name shown in Header, Login screen & WhatsApp
    tagline: "Student Mess & Dining System",

    // 2. Admin Login for the Mess Owner
    adminUser: "owner",                       // Custom username
    adminPass: "securePass2026",              // Custom password

    // 3. Payment & Group Links
    upiId: "merchant@upi",                    // Owner's UPI ID for payments
    boysGroupLink: "https://chat.whatsapp.com/...", // WhatsApp group link for boys
    girlsGroupLink: "https://chat.whatsapp.com/...", // WhatsApp group link for girls

    // 4. Client's Firebase Project
    firebase: {
        apiKey: "AIzaSy...",
        authDomain: "client-mess.firebaseapp.com",
        projectId: "client-mess",
        storageBucket: "client-mess.firebasestorage.app",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:abcdef"
    }
};
```

---

## ☁️ Firebase Cloud Database Setup

Each mess client should have their own isolated Firebase Cloud project:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Under **Build** > **Firestore Database**, click **Create Database**.
3. Choose a region closest to your users (e.g. `asia-south1`) and start in **Production mode**.
4. Register a **Web App** (`</>`) in **Project Settings > General** and copy the configuration snippet into `credentials.js`.
5. Under **Firestore Database > Rules**, paste the following security rules and click **Publish**:

### Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Allow full access only to the 5 collections used by Mess Manager
    match /boys/{document} {
      allow read, write: if true;
    }

    match /girls/{document} {
      allow read, write: if true;
    }

    match /holidays/{document} {
      allow read, write: if true;
    }

    match /dailyEntries/{document} {
      allow read, write: if true;
    }

    match /logs/{document} {
      allow read, write: if true;
    }

    // Deny access to any other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🌐 Production Hosting Options

Deploy this static web app in seconds to any web host:

- **Vercel (Recommended)**:
  - **Framework Preset**: `Other`
  - **Build Command**: `echo 'Static build ready'` (or leave empty)
  - **Output Directory**: `.` (or leave empty)
  - **Install Command**: (leave empty)
  - Via Vercel CLI:
    ```bash
    npx vercel
    ```
- **Firebase Hosting**:
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init hosting
  firebase deploy
  ```
- **Netlify**:
  Drag-and-drop the project folder directly into the Netlify dashboard.
- **GitHub Pages**:
  Push to a GitHub repository and turn on **GitHub Pages** from the repository settings.

---

## 🛡️ License & Commercial Use

Designed for commercial redistribution, hostel automation, and independent mess management. Feel free to rebrand, customize, and deploy across as many client facilities as needed.

