# Alert Disaster Restoration — Real-Time Field Scoping Copilot

An AI-powered, real-time forensic restoration engineering and field scoping copilot designed for emergency water, fire, and mold loss inspections. Built for field technicians operating single-ear Bluetooth headsets in high-noise environments (air movers / LGR dehumidifiers running at 65–75 dB).

---

## Key Features

- **Gemini Live Multimodal Voice Copilot:**
  - Configured with the **`Charon`** voice (authoritative, grounded clinical dispatch tone).
  - Silent during routine dictation (`spokenResponse: ""`); speaks only 1–2 sentence verifications upon room verification (`verify_room_scope`) or walkthrough completion (`complete_walkthrough`).
  - Pre-warmed Web Audio context with automated `.resume()` to satisfy mobile iOS/WebKit audio policies.

- **Deterministic Pricing Engine & Tier Snapping:**
  - Code-backed rate schedule strictly enforces non-hallucinated math.
  - Automatically snaps subtotal to standard Alert Disaster Restoration Flat Fee Tiers ($1,499, $1,999, $2,499, $2,799, $3,999) or transitions into custom large-loss contracts.
  - Rates and dollar totals match across Python (`pricing_engine.py`) and TypeScript (`pricingEngine.ts`); string display and the parity test live in `pricing_manifest.json` and `scripts/test_pricing.ts`.

- **California Statutory Compliance & Forensic Plumbing:**
  - Automated detection of building age against the California 1978 cutoff.
  - Strict Cal/OSHA Title 8 CCR § 1529 (Asbestos), § 1532.1 (Lead), and Health & Safety Code § 25914 compliance notices on all pre-1978 scopes.
  - Era-specific forensic plumbing failure analysis (Galvanized, Polybutylene PB-2110, CPVC, and PEX).

- **Offline Dead-Zone Resilience:**
  - IndexedDB storage engine (`lib/offlineStorage.ts`) caches field inspection turns in subgrade basements and crawlspaces with zero cell reception.
  - State-chaining queue replay automatically pushes pending turns to the backend sequentially upon signal recovery.

- **Google Maps Platform Integration:**
  - Modern Places API (New) address search with session tokens (`AutocompleteSessionToken`) to bundle keystrokes into single billed sessions.
  - Instant property geocoding and Kern County / Central California field presets.

- **Official 2-Page Proposal Generation:**
  - Client-side digital signature pad with Retina DPR scaling.
  - Headless Chromium and Python PDF compilation engine (`compile_proposal.py`) outputs print-ready Alert Disaster Restoration proposals with complete letterhead and assignment of benefits.

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router, Standalone Output), React 19, Tailwind CSS, Lucide Icons, Shadcn UI
- **AI & Audio:** Google GenAI SDK (Gemini 2.0 Flash / Gemini Multimodal Live, Gemini 3.8 TTS), Web Speech API, Web Audio API
- **Backend & Cloud:** Node.js, Python 3, Google Cloud Run (Containerized via Docker), Firebase / Firestore
- **Mapping:** `@googlemaps/js-api-loader`, Google Places API (New)

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment configuration and add your API keys:

```bash
cp .env.example .env.local
```

Configure your keys in `.env.local`:
```env
GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
LIVE_MODEL="gemini-2.0-flash-exp"
LIVE_VOICE="Charon"
```

### 3. Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Verification Tests

```bash
npm test
```

Executes the 14-test end-to-end integration suite covering service calls, tier snapping, large-loss conversions, room verification phrasing, thermal delta extraction, and Python/TypeScript pricing interoperability.

### 5. Production Build & Deployment

```bash
npm run build
```

Deploy to Google Cloud Run:
```bash
gcloud run deploy alert-disaster-field-estimator \
  --source . \
  --project mitigation-project \
  --region us-west2 \
  --allow-unauthenticated
```
