/**
 * Alert Disaster Restoration — Firestore Database Service
 * Provides CRUD operations for field estimates, chamber scopes, and moisture logs.
 */

import { db } from "@/lib/firebase";
import { JobState } from "@/types/estimator";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const ESTIMATES_COLLECTION = "estimates";

/**
 * Saves or updates an estimate in Firestore
 */
export async function saveEstimateToFirestore(job: JobState): Promise<string> {
  const docId = job.lossId || `ADR-${Date.now()}`;
  const docRef = doc(db, ESTIMATES_COLLECTION, docId);

  const payload = {
    ...job,
    lossId: docId,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Fetches all saved estimates ordered by inspection date or update time
 */
export async function getEstimatesFromFirestore(): Promise<JobState[]> {
  try {
    const colRef = collection(db, ESTIMATES_COLLECTION);
    const q = query(colRef, orderBy("inspectionDate", "desc"));
    const snapshot = await getDocs(q);

    const list: JobState[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as JobState;
      list.push(data);
    });
    return list;
  } catch (error) {
    console.warn("Error fetching estimates from Firestore:", error);
    // If the index or query fails, try simple collection fetch
    try {
      const colRef = collection(db, ESTIMATES_COLLECTION);
      const snapshot = await getDocs(colRef);
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
 * Fetches a single estimate by ID
 */
export async function getEstimateById(id: string): Promise<JobState | null> {
  try {
    const docRef = doc(db, ESTIMATES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as JobState;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching estimate ${id}:`, error);
    return null;
  }
}

/**
 * Deletes an estimate by ID
 */
export async function deleteEstimateFromFirestore(id: string): Promise<void> {
  const docRef = doc(db, ESTIMATES_COLLECTION, id);
  await deleteDoc(docRef);
}
