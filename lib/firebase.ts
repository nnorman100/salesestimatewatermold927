/**
 * Alert Disaster Restoration — Firebase & Firestore Client Configuration
 * Connects to Google Cloud / Firebase project for real-time estimate synchronization.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mitigation-project",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:219826144890:web:9b74f06c49e97f5e41ddc3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mitigation-project.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDycvRZzjJB00fnDLp9DNtZNPjEgG4MEqY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mitigation-project.firebaseapp.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "219826144890",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Connect to the ADR / disaster restoration Firestore database
const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "ai-studio-disasterrestorat-9bcd51a5-c6a3-4c96-8d0e-4a6234ab4c5a";

let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app, databaseId);
} catch (e) {
  console.warn("Could not connect to named database, falling back to default:", e);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
