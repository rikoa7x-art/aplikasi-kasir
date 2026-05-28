/* ================================================
   SablonKas - Firebase Configuration
   ================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyA7cAhR5Ri_d6ElYBqYdRGxzFRaMQ97NlQ",
  authDomain: "kasir-4179e.firebaseapp.com",
  projectId: "kasir-4179e",
  storageBucket: "kasir-4179e.firebasestorage.app",
  messagingSenderId: "672408938992",
  appId: "1:672408938992:web:712b3bb05b329833895535",
  measurementId: "G-L8DRKYD5VQ"
};

firebase.initializeApp(firebaseConfig);

// Expose Firestore instance globally untuk digunakan di data.js
window._firestoreDB = firebase.firestore();

// Aktifkan offline persistence (data tetap bisa dibaca saat offline)
window._firestoreDB.enablePersistence({ synchronizeTabs: true })
  .then(() => console.log('[Firebase] Offline persistence aktif ✅'))
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistence gagal: multiple tabs terbuka.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Browser tidak support offline persistence.');
    }
  });
