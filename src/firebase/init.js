// This file ensures Firebase is initialized immediately
import { app, auth, db } from "./config";

console.log("[Firebase Init] Checking initialization...");
console.log("[Firebase Init] App:", app ? "✅" : "❌");
console.log("[Firebase Init] Auth:", auth ? "✅" : "❌");
console.log("[Firebase Init] Firestore:", db ? "✅" : "❌");

if (!app || !auth || !db) {
  throw new Error("Firebase initialization failed. Check your config.");
}

export { app, auth, db };
