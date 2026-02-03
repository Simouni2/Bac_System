import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQH6hhXz2Miz0DThxHOKECwhfSSNF4cuE",
  authDomain: "bacdashboard-7ad02.firebaseapp.com",
  projectId: "bacdashboard-7ad02",
  storageBucket: "bacdashboard-7ad02.firebasestorage.app",
  messagingSenderId: "591037921226",
  appId: "1:591037921226:web:4494355b3c472f9ab84133",
  measurementId: "G-JPRDD2FYX1"
};

console.log("[Firebase] Starting initialization with project:", firebaseConfig.projectId);

// Initialize Firebase app
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  console.log("[Firebase] ✅ App initialized");

  // Get Auth instance
  auth = getAuth(app);
  console.log("[Firebase] ✅ Auth service initialized");

  // Get Firestore instance
  db = getFirestore(app);
  console.log("[Firebase] ✅ Firestore database initialized");

  console.log("[Firebase] ✅ ALL SERVICES READY");
} catch (error) {
  console.error("[Firebase] ❌ CRITICAL ERROR:", error.message);
  console.error("[Firebase] Error details:", error);
}

export { app, auth, db };

