/**
 * ====================================================================
 * credentials.js — Central Configuration & Credentials File
 * ====================================================================
 * 
 * Customize this single file to rebrand or deploy this app for any Mess client!
 * Each mess client can have their own:
 *   1. Mess Branding & Names
 *   2. Admin Login Credentials (User ID & Password)
 *   3. Payment Details (UPI ID & WhatsApp Group Links)
 *   4. Dedicated Firebase Cloud Project
 * 
 * ====================================================================
 */

const APP_CREDENTIALS = {

    // ===== 1. MESS BRANDING =====
    messName: "Mess Manager",
    tagline: "Student Mess & Attendance Management System",

    // ===== 2. ADMIN LOGIN CREDENTIALS =====
    adminUser: "admin",
    adminPass: "admin123",

    // ===== 3. PAYMENT & WHATSAPP LINKS =====
    upiId: "",
    boysGroupLink: "",
    girlsGroupLink: "",

    // ===== 4. FIREBASE CLOUD PROJECT =====
    // Replace with the client's Firebase project config from Firebase Console:
    // (Project Settings > General > Your apps > Config)
    firebase: {
        apiKey: "AIzaSyD4MlG0xavdjDU2tD27-Y04kLJFRsn_fDc",
        authDomain: "mess-management-2026.firebaseapp.com",
        projectId: "mess-management-2026",
        storageBucket: "mess-management-2026.firebasestorage.app",
        messagingSenderId: "130509949261",
        appId: "1:130509949261:web:a00f8e64d43b64671acf04",
        measurementId: "G-GZ0W3R9NNT"
    }
};

// Export to window for browser access
if (typeof window !== 'undefined') {
    window.APP_CREDENTIALS = APP_CREDENTIALS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CREDENTIALS;
}

