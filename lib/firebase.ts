/**
 * Alert Disaster Restoration — Firebase & Firestore Client Configuration
 * Connects to Google Cloud / Firebase project for real-time estimate synchronization.
 *
 * SECURITY: no production Firebase values are hardcoded here. Every value is read
 * from `NEXT_PUBLIC_FIREBASE_*` env vars, and a missing value throws a clear error
 * at module load (no silent fallback to a production project).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const REQUIRED_CLIENT_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const missingVars = REQUIRED_CLIENT_ENV_VARS.filter((name) => !process.env[name]);
if (missingVars.length > 0) {
  throw new Error(
    [
      "Firebase client configuration is incomplete.",
      `Missing env vars: ${missingVars.join(", ")}.`,
      'Copy .env.example to .env.local and fill in the Firebase "Web app" values',
      "from the Firebase console (Project settings -> General).",
    ].join(" ")
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth | null = null;

/**
 * Returns the Firebase Auth instance, initializing it lazily on first use.
 * Returns `null` during server-side rendering, where `window` is unavailable —
 * callers must treat the result as possibly-null.
 */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

let firestoreInstance: Firestore | null = null;

/**
 * Returns the Firestore instance for the named database, initializing it lazily.
 * A missing `NEXT_PUBLIC_FIRESTORE_DATABASE_ID` therefore fails loudly at this
 * call site (rather than at module load), which keeps server renders that never
 * touch Firestore working even when the database id is not configured.
 */
export function getDb(): Firestore {
  if (!firestoreInstance) {
    const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID;
    if (!databaseId) {
      throw new Error(
        "Missing NEXT_PUBLIC_FIRESTORE_DATABASE_ID — set it in .env.local before using Firestore."
      );
    }
    firestoreInstance = getFirestore(app, databaseId);
  }
  return firestoreInstance;
}