/**
 * Alert Disaster Restoration — Firestore Database Service
 * Provides CRUD operations for field estimates, chamber scopes, and moisture logs.
 *
 * Client-side (browser) access. Firestore is obtained lazily via lib/firebase's
 * `getDb()` so a missing env var fails at the call site, not at import time.
 * When an owner's uid is supplied, operations are pinned to that user's own
 * documents (`ownerUid`) so they stay compatible with `firestore.rules`.
 */

import { getDb } from "@/lib/firebase";
import { JobState } from "@/types/estimator";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const ESTIMATES_COLLECTION = "estimates";

/**
 * Saves or updates an estimate in Firestore. When `ownerUid` is provided (the
 * signed-in user), it is recorded on the document so `firestore.rules` can keep
 * reads/writes scoped to the document's owner.
 */
export async function saveEstimateToFirestore(job: JobState, ownerUid?: string): Promise<string> {
  const docId = job.lossId || `ADR-${Date.now()}`;
  const docRef = doc(getDb(), ESTIMATES_COLLECTION, docId);

  const payload: Record<string, unknown> = {
    ...job,
    lossId: docId,
    updatedAt: serverTimestamp(),
  };
  if (ownerUid) {
    payload.ownerUid = ownerUid;
  }

  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Fetches saved estimates. When `ownerUid` is provided, results are narrowed to
 * that user's documents (required by `firestore.rules`, which denies unfiltered
 * collection reads).
 */
export async function getEstimatesFromFirestore(ownerUid?: string): Promise<JobState[]> {
  try {
    const colRef = collection(getDb(), ESTIMATES_COLLECTION);
    const q = ownerUid
      ? query(colRef, where("ownerUid", "==", ownerUid), orderBy("inspectionDate", "desc"))
      : query(colRef, orderBy("inspectionDate", "desc"));
    const snapshot = await getDocs(q);

    const list: JobState[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as JobState);
    });
    return list;
  } catch (error) {
    console.warn("Error fetching estimates from Firestore:", error);
    // If the index or query fails, try a simple owner-scoped collection fetch.
    try {
      const colRef = collection(getDb(), ESTIMATES_COLLECTION);
      const snapshot = ownerUid
        ? await getDocs(query(colRef, where("ownerUid", "==", ownerUid)))
        : await getDocs(colRef);
      const list: JobState[] = [];
      snapshot.forEach((d) => list.push(d.data() as JobState));
      return list;
    } catch (e2) {
      console.error("Fallback fetch also failed:", e2);
      return [];
    }
  }
}

/**
 * Fetches a single estimate by ID, scoped to the owner when provided.
 */
export async function getEstimateById(id: string, ownerUid?: string): Promise<JobState | null> {
  try {
    const docRef = doc(getDb(), ESTIMATES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as JobState & { ownerUid?: string };
      if (ownerUid && data.ownerUid && data.ownerUid !== ownerUid) {
        return null;
      }
      return data as JobState;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching estimate ${id}:`, error);
    return null;
  }
}

/**
 * Deletes an estimate by ID.
 */
export async function deleteEstimateFromFirestore(id: string): Promise<void> {
  const docRef = doc(getDb(), ESTIMATES_COLLECTION, id);
  await deleteDoc(docRef);
}