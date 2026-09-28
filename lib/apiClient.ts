/**
 * Alert Disaster Restoration — Client-side fetch helper with Firebase Auth
 *
 * The server-side `/api` routes added by the security fix gate every request
 * behind Firebase ID-token verification. The browser therefore has to attach
 * `Authorization: Bearer <Firebase ID token>` to every fetch. This module is
 * the single place that owns that header.
 *
 *   - On first import in the browser it subscribes to Firebase's auth state and
 *     caches the latest ID token in a module-level variable.
 *   - `fetchWithAuth` is a drop-in replacement for `fetch` that injects the
 *     bearer header when a token is available and leaves the request alone
 *     (so the server still answers 401) when the user is signed out.
 *   - `signInWithGoogle` is the primary sign-in path; `signInWithEmailPassword`
 *     is a fallback for browsers where `signInWithPopup` is blocked.
 */

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

let currentUser: User | null = null;
let currentIdToken: string | null = null;
let subscriptionStarted = false;
const authSubscribers = new Set<(user: User | null) => void>();

function ensureAuthSubscription(): void {
  if (subscriptionStarted) return;
  if (typeof window === "undefined") return;
  const auth = getFirebaseAuth();
  if (!auth) return;
  subscriptionStarted = true;
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      try {
        currentIdToken = await user.getIdToken();
      } catch {
        currentIdToken = null;
      }
    } else {
      currentIdToken = null;
    }
    authSubscribers.forEach((cb) => {
      try {
        cb(user);
      } catch {
        // Subscriber threw; ignore so other subscribers still see the update.
      }
    });
  });
}

export function getCurrentUser(): User | null {
  ensureAuthSubscription();
  // `auth.currentUser` is the synchronous source of truth; fall back to the
  // cached value while we are still waiting for the first auth-state callback.
  const auth = getFirebaseAuth();
  return auth?.currentUser ?? currentUser;
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  ensureAuthSubscription();
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return null;
  try {
    currentIdToken = await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    // Keep whatever token we last cached; a refresh failure should not blank
    // out the header on the next request.
  }
  return currentIdToken;
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  ensureAuthSubscription();
  authSubscribers.add(cb);
  cb(getCurrentUser());
  return () => {
    authSubscribers.delete(cb);
  };
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is unavailable in this environment.");
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is unavailable in this environment.");
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export interface FetchWithAuthOptions extends Omit<RequestInit, "headers"> {
  headers?: HeadersInit;
}

/**
 * Drop-in replacement for `fetch` that attaches the current Firebase ID token
 * as `Authorization: Bearer <token>`. If the user is signed out the request is
 * sent without the header so the server can answer 401 and the caller can show
 * a sign-in prompt.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: FetchWithAuthOptions = {}
): Promise<Response> {
  const token = await getCurrentIdToken();
  const headers = new Headers(init.headers ?? undefined);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    init.body !== undefined &&
    init.body !== null &&
    !headers.has("Content-Type") &&
    typeof init.body === "string"
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}