import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calculatePricingFromJob,
  snapToFinancialTier,
  calculatePsychrometrics,
} from "../services/pricingEngine";
import { pricingManifest } from "../services/pricingManifest";
import type { JobState } from "../types/estimator";

// npm runs test scripts from the repo root (where pricing_engine.py lives).
const ROOT = process.cwd();
const pythonBin = process.platform === "win32" ? "python" : "python3";

function runPython(args: string[]): string {
  return execFileSync(pythonBin, args, { encoding: "utf-8", cwd: ROOT });
}

// --- Python driver snippets (mirror of how compile_proposal.py / copilot_engine.py invoke the engine) ---
const PY_CALC = `
import json, sys
from pricing_engine import calculate_pricing
payload = json.loads(sys.argv[1])
print(json.dumps(calculate_pricing(payload)))
`;

const PY_SNAP = `
import json, sys
from decimal import Decimal
from pricing_engine import snap_to_tier
sub = json.loads(sys.argv[1])
print(json.dumps(snap_to_tier(Decimal(str(sub)))))
`;

const PY_PSYCH = `
import json, sys
from pricing_engine import calculate_psychrometrics
t, rh = json.loads(sys.argv[1])
print(json.dumps(calculate_psychrometrics(t, rh)))
`;

function pythonPricing(payload: unknown): any {
  return JSON.parse(runPython(["-c", PY_CALC, JSON.stringify(payload)]).trim());
}

function pythonSnap(subtotal: number): any {
  return JSON.parse(runPython(["-c", PY_SNAP, JSON.stringify(subtotal)]).trim());
}

function pythonPsychrometrics(t: number, rh: number): any {
  return JSON.parse(runPython(["-c", PY_PSYCH, JSON.stringify([t, rh])]).trim());
}

// Recursively surface every mismatched field as a readable "path: a !== b" line.
function collectDiffs(label: string, a: unknown, b: unknown, diffs: string[]): void {
  if (Object.is(a, b)) return;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return;
    if (Math.abs(a - b) > 1e-9) diffs.push(`${label}: ${a} !== ${b}`);
    return;
  }
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") {
    diffs.push(`${label}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
    return;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) collectDiffs(`${label}.${k}`, ao[k], bo[k], diffs);
}

function loadFixture(): JobState {
  return JSON.parse(readFileSync(join(ROOT, "scripts", "job_state.fixture.json"), "utf-8"));
}

function main(): void {
  const failures: string[] = [];
  console.log("--- RUNNING SUITE: Pricing Parity (Python <-> TypeScript) ---");

  // 1. Manifest byte-match: pricing_engine.py --emit-config == checked-in pricing_manifest.json.
  {
    const generated = runPython(["pricing_engine.py", "--emit-config"]);
    const checkedIn = readFileSync(join(ROOT, "pricing_manifest.json"), "utf-8");
    if (generated !== checkedIn) {
      failures.push("pricing_manifest.json drifted from pricing_engine.py --emit-config output");
    } else {
      console.log("✓ Manifest byte-match: pricing_manifest.json == pricing_engine.py --emit-config.");
    }
  }

  // 2. All 12 rate-card items (including the antimicrobial line) vs the manifest.
  {
    assert.strictEqual(pricingManifest.items.length, 12, "expected 12 rate-card items in manifest");
    for (const item of pricingManifest.items) {
      const py = pythonPricing({ items: [{ key: item.id, qty: 1 }] });
      const line = py.lineItems[0];
      collectDiffs(`rate[${item.id}].description`, line.description, item.description, failures);
      collectDiffs(`rate[${item.id}].unitRate`, line.unitRate, item.rate, failures);
      collectDiffs(`rate[${item.id}].lineTotal`, line.lineTotal, item.rate, failures);
    }
    const rateDrift = failures.some((f) => f.startsWith("rate["));
    console.log(
      rateDrift
        ? "✗ Rate card drift detected (see failures below)."
        : "✓ All 12 rate-card descriptions, unit rates, and line totals match (incl. antimicrobial).",
    );
  }

  // 3. Psychrometrics parity — half-up rounding aligned in both engines (see _round_half_up in
  //    pricing_engine.py and Math.round in pricingEngine.ts). Exact equality catches any regression.
  {
    const cases: Array<[number, number]> = [
      [72, 45],
      [85, 55],
      [60, 30],
      [95, 70],
      [68, 38],
      [100, 100],
      [40, 20],
    ];
    for (const [t, rh] of cases) {
      const ts = calculatePsychrometrics(t, rh);
      const py = pythonPsychrometrics(t, rh);
      collectDiffs(`psychrometrics(${t},${rh})`, ts, py, failures);
    }
    console.log("✓ Psychrometrics parity across temperature/RH matrix (dew point + GPP).");
  }

  // 4. Tier snapping parity across Tier 1..5 and the large-loss boundary.
  {
    const subtotals = [350, 1499.0, 1499.01, 1999.0, 2208.8, 2499.0, 2799.0, 3999.0, 3999.01, 4750.0];
    for (const sub of subtotals) {
      const ts = snapToFinancialTier(sub);
      const py = pythonSnap(sub);
      collectDiffs(`snap(${sub}).tierName`, ts.tierName, py.tierName, failures);
      collectDiffs(`snap(${sub}).tierDescription`, ts.tierDescription, py.tierDescription, failures);
      collectDiffs(`snap(${sub}).snappedTier`, ts.snappedTier, py.snappedTier, failures);
      collectDiffs(`snap(${sub}).isCustomLargeLoss`, ts.isCustomLargeLoss, py.isCustomLargeLoss, failures);
    }
    console.log("✓ Tier snapping parity (Tier 1 / 2 / 3 / 4 / 5 + large-loss boundary strings).");
  }

  // 5. Full-job parity over the fixture and its Tier-1 / large-loss variants.
  {
    const base = loadFixture();
    const tier1 = JSON.parse(JSON.stringify(base)) as JobState;
    tier1.chambers = [];

    const largeLoss = JSON.parse(JSON.stringify(base)) as JobState;
    largeLoss.chambers[0].demolition = {
      floodCuts: { heightFt: 4, linearFeet: 200, locations: "All walls" },
    };

    const scenarios: Array<[string, JobState]> = [
      ["Tier 1 small scope", tier1],
      ["Tier 3 mid-scope (fixture)", base],
      ["Tier 5 / large-loss boundary", largeLoss],
    ];

    for (const [name, job] of scenarios) {
      const ts = calculatePricingFromJob(job);
      const py = pythonPricing({ items: ts.lineItems });

      collectDiffs(`${name}.financialTier.subtotal`, ts.financialTier.subtotal, py.financialTier.subtotal, failures);
      collectDiffs(`${name}.financialTier.snappedTier`, ts.financialTier.snappedTier, py.financialTier.snappedTier, failures);
      collectDiffs(`${name}.financialTier.tierName`, ts.financialTier.tierName, py.financialTier.tierName, failures);
      collectDiffs(`${name}.financialTier.tierDescription`, ts.financialTier.tierDescription, py.financialTier.tierDescription, failures);
      collectDiffs(`${name}.financialTier.isCustomLargeLoss`, ts.financialTier.isCustomLargeLoss, py.financialTier.isCustomLargeLoss, failures);

      if (ts.lineItems.length !== py.lineItems.length) {
        failures.push(`${name}.lineItems.length: ${ts.lineItems.length} !== ${py.lineItems.length}`);
      }
      const n = Math.min(ts.lineItems.length, py.lineItems.length);
      for (let i = 0; i < n; i++) {
        const t = ts.lineItems[i];
        const p = py.lineItems[i];
        collectDiffs(`${name}.lineItems[${i}].description`, t.description, p.description, failures);
        collectDiffs(`${name}.lineItems[${i}].unitRate`, t.unitRate, p.unitRate, failures);
        collectDiffs(`${name}.lineItems[${i}].lineTotal`, t.lineTotal, p.lineTotal, failures);
      }
      console.log(`✓ ${name}: ${n} line items + financialTier match across engines.`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n=== PRICING PARITY FAILURES (${failures.length}) ===`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log("\n=== PRICING PARITY TEST PASSED ===");
}

try {
  main();
} catch (err) {
  console.error("Pricing parity test failure:", err);
  process.exit(1);
}
