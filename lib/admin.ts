/**
 * Alert Disaster Restoration — Firebase Admin SDK bootstrap (server-only)
 *
 * Initializes the Firebase Admin app exactly once per Node process (cached on
 * `globalThis` so Next.js dev-mode HMR does not re-initialize it) and exposes the
 * server-side Firestore instance. This module must never be imported into client
 * bundles — it reads server-only `FIREBASE_ADMIN_*` credentials.
 */

import {
  getApps,
  initializeApp,
  cert,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Cache the initialized Admin app on globalThis so Next.js dev-mode HMR does not
// re-initialize it on every reload. The Admin SDK also dedupes its own default app,
// but the globalThis guard makes the "one app per process" invariant explicit.
const globalForAdmin = globalThis as unknown as { __firebaseAdminApp?: App };

export function getAdminApp(): App {
  if (!globalForAdmin.__firebaseAdminApp) {
    const existing = getApps().length > 0 ? getApps()[0] : undefined;
    if (existing) {
      globalForAdmin.__firebaseAdminApp = existing;
    } else {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          [
            "Firebase Admin credentials are not configured.",
            "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and",
            "FIREBASE_ADMIN_PRIVATE_KEY in .env.local using the values from the",
            "Firebase service-account JSON (Project settings -> Service accounts).",
          ].join(" ")
        );
      }
      globalForAdmin.__firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
  return globalForAdmin.__firebaseAdminApp;
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}