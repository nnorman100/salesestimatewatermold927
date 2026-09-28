/**
 * Alert Disaster Restoration — Server-Side Firebase Auth Verification
 *
 * Verifies the Firebase ID token from the `Authorization: Bearer <idToken>` header
 * on API routes, using the Firebase Admin SDK (server-only, bootstrapped in
 * lib/admin.ts). This module must never be imported into client bundles.
 */

import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { getAdminApp } from "@/lib/admin";

export interface VerifiedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

type TokenVerifier = (token: string) => Promise<VerifiedUser | null>;

async function verifyWithAdmin(token: string): Promise<VerifiedUser | null> {
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    emailVerified: decoded.email_verified === true,
  };
}

// Test-only injection point. Lets the test suite exercise the route auth guard
// without real Firebase credentials by substituting a fake verifier. This is the
// only place tests can divert the token path; production code never sets this.
let testTokenVerifier: TokenVerifier | null = null;
export function __setTokenVerifierForTests(fn: TokenVerifier | null): void {
  testTokenVerifier = fn;
}

/**
 * Verifies the `Authorization: Bearer <idToken>` header on an API request and
 * returns `{ uid, email }` for a valid token, or `null` on any failure (missing
 * header, malformed bearer, expired token, verification error, or missing Admin
 * credentials). Never throws — the caller decides whether `null` is a 401 or 403.
 */
export async function verifyIdToken(req: NextRequest): Promise<VerifiedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  try {
    const verifier = testTokenVerifier ?? verifyWithAdmin;
    return await verifier(token);
  } catch {
    return null;
  }
}