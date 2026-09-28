import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { verifyIdToken } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/admin";

const ESTIMATES_COLLECTION = "estimates";

export async function GET(req: NextRequest) {
  const user = await verifyIdToken(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!user.emailVerified) {
    // Mirrors firestore.rules: only email-verified users may touch `estimates`.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection(ESTIMATES_COLLECTION)
      .where("ownerUid", "==", user.uid)
      .get();

    const estimates = snapshot.docs
      .map((d: QueryDocumentSnapshot) => d.data())
      // Sort newest-first in memory (avoids requiring a composite index).
      .sort((a: { inspectionDate?: string }, b: { inspectionDate?: string }) =>
        String(b.inspectionDate ?? "").localeCompare(String(a.inspectionDate ?? "")));
    return NextResponse.json({ success: true, count: estimates.length, estimates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed fetching estimates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyIdToken(req);
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!user.emailVerified) {
    // Mirrors firestore.rules: only email-verified users may touch `estimates`.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { jobState } = body;
    if (!jobState) {
      return NextResponse.json({ error: "Missing jobState payload" }, { status: 400 });
    }

    const docId = jobState.lossId || `ADR-${Date.now()}`;
    const db = getAdminFirestore();
    const docRef = db.collection(ESTIMATES_COLLECTION).doc(docId);

    // Reject the write when the target doc already belongs to another user.
    // The Admin SDK bypasses firestore.rules, so this server-side check is the
    // only thing standing between an authenticated attacker and an ownership
    // takeover of a document they did not create.
    const existing = await docRef.get();
    if (existing.exists) {
      const existingOwnerUid = existing.get("ownerUid");
      if (existingOwnerUid && existingOwnerUid !== user.uid) {
        return NextResponse.json(
          { error: "forbidden", message: "Estimate already belongs to another user" },
          { status: 403 }
        );
      }
    }

    const payload = {
      ...jobState,
      lossId: docId,
      // Ownership is pinned to the authenticated caller so firestore.rules and
      // this write path can never attribute a document to another user.
      ownerUid: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.set(payload, { merge: true });
    return NextResponse.json({ success: true, docId, message: "Estimate successfully saved to Firestore" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed saving estimate" }, { status: 500 });
  }
}