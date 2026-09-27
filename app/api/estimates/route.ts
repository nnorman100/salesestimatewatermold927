import { NextRequest, NextResponse } from "next/server";
import { saveEstimateToFirestore, getEstimatesFromFirestore } from "@/services/firestoreService";

export async function GET() {
  try {
    const estimates = await getEstimatesFromFirestore();
    return NextResponse.json({ success: true, count: estimates.length, estimates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed fetching estimates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobState } = body;
    if (!jobState) {
      return NextResponse.json({ error: "Missing jobState payload" }, { status: 400 });
    }

    const docId = await saveEstimateToFirestore(jobState);
    return NextResponse.json({ success: true, docId, message: "Estimate successfully saved to Firestore" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed saving estimate" }, { status: 500 });
  }
}
