/*
  firebase.js — Firebase Configuration & Data Layer
  Handles all Firestore CRUD operations.
  Reads Firebase configuration dynamically from credentials.js
*/

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = (typeof window !== 'undefined' && window.APP_CREDENTIALS && window.APP_CREDENTIALS.firebase)
    ? window.APP_CREDENTIALS.firebase
    : {
        apiKey: "PASTE_FIREBASE_API_KEY",
        authDomain: "PASTE_AUTH_DOMAIN",
        projectId: "PASTE_PROJECT_ID",
        storageBucket: "PASTE_STORAGE_BUCKET",
        messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
        appId: "PASTE_APP_ID"
    };

let db = null;

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('PASTE_')) {
    console.warn('Firebase config contains placeholder values.');
} else {
    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
        } else {
            console.warn('Firebase SDK scripts not loaded yet.');
        }
    } catch (err) {
        console.error('Firebase initialization error:', err);
    }
}

/* ===== STATE ===== */
let boys = [];
let girls = [];
let holidays = [];
let dailyEntries = [];
let currentTab = 'Dashboard';
let boysSearch = '', girlsSearch = '', boysFilter = 'All', girlsFilter = 'All';
let boysSort = 'Newest', girlsSort = 'Newest';

/* ===== CRUD OPERATIONS ===== */
async function loadCollection(name) {
    if (!db) {
        console.warn('Database connection not available for collection:', name);
        return [];
    }
    try {
        const fetchPromise = db.collection(name).get();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Connection timeout loading '${name}'`)), 2000)
        );
        const snap = await Promise.race([fetchPromise, timeoutPromise]);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.warn(`Could not load collection '${name}':`, err.message);
        throw err;
    }
}

async function addRecord(collection, data) {
    if (!navigator.onLine) {
        showToast('You are offline — changes may not save.', 'warning');
    }
    if (!db) {
        throw new Error('Database connection is not available.');
    }
    data.lastUpdated = new Date().toISOString();
    const ref = await db.collection(collection).add(data);
    return { id: ref.id, ...data };
}

async function updateRecord(collection, id, data) {
    if (!db) {
        throw new Error('Database connection is not available.');
    }
    data.lastUpdated = new Date().toISOString();
    await db.collection(collection).doc(id).set(data, { merge: true });
}

async function deleteRecord(collection, id) {
    if (!db) {
        throw new Error('Database connection is not available.');
    }
    await db.collection(collection).doc(id).delete();
}
