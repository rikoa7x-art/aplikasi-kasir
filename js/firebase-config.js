/* ================================================
   SablonKas - Firebase Configuration
   ================================================ */

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyA7cAhR5Ri_d6ElYBqYdRGxzFRaMQ97NlQ",
    authDomain: "kasir-4179e.firebaseapp.com",
    projectId: "kasir-4179e",
    storageBucket: "kasir-4179e.firebasestorage.app",
    messagingSenderId: "672408938992",
    appId: "1:672408938992:web:712b3bb05b329833895535",
    measurementId: "G-L8DRKYD5VQ"
  };

  try {
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore(app);

    // Aktifkan offline persistence (supaya bisa dipakai saat offline)
    db.enablePersistence({ synchronizeTabs: true })
      .catch(err => {
        if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
          console.warn('[Firebase] Persistence error:', err.code);
        }
      });

    // Expose ke global untuk dipakai data.js
    window._firestoreDB = db;
    console.log('[Firebase] Initialized ✅');
  } catch (err) {
    console.error('[Firebase] Init GAGAL:', err);
    window._firestoreDB = null;
  }
})();
