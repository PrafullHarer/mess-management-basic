/*
  firebase.js — Firebase Configuration & Data Layer
  Handles all Firestore CRUD operations.
*/

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = {
    apiKey: "AIzaSyD27xHfUNhhr33GhSJPI71Q7gF7VEujzwo",
    authDomain: "sagar-mess.firebaseapp.com",
    projectId: "sagar-mess",
    storageBucket: "sagar-mess.firebasestorage.app",
    messagingSenderId: "725510265978",
    appId: "1:725510265978:web:60bbbac8262f88e9a9efc3"
};

if (firebaseConfig.apiKey.includes('PASTE_')) {
    document.body.innerHTML = `<div style="padding:40px;text-align:center;font-family:sans-serif">
        <h2>⚙️ Setup Required</h2>
        <p>Firebase config not set. Open <code>js/firebase.js</code> and replace the placeholder values with your Firebase project config.</p>
    </div>`;
    throw new Error('Firebase config not configured');
}

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

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
    const snap = await db.collection(name).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addRecord(collection, data) {
    if (!navigator.onLine) {
        showToast('You are offline — changes may not save.', 'warning');
    }
    data.lastUpdated = new Date().toISOString();
    const ref = await db.collection(collection).add(data);
    return { id: ref.id, ...data };
}

async function updateRecord(collection, id, data) {
    data.lastUpdated = new Date().toISOString();
    await db.collection(collection).doc(id).set(data, { merge: true });
}

async function deleteRecord(collection, id) {
    await db.collection(collection).doc(id).delete();
}
