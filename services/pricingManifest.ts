/**
 * Single source of truth for the Alert restoration rate card, tier table, and
 * large-loss display strings.
 *
 * Generated from `pricing_engine.py --emit-config` (the Python engine is the
 * canonical owner of these values); `scripts/test_pricing.ts` byte-matches
 * `pricing_manifest.json` against the live Python output so any drift fails
 * the `npm test` parity check.
 */

import manifest from "../pricing_manifest.json";

export type RateUnit = "LF" | "SF" | "EA" | "Day";

export interface ManifestRateItem {
  readonly id: string;
  readonly description: string;
  readonly unit: RateUnit;
  readonly rate: number;
}

export interface ManifestTier {
  readonly threshold: number;
  readonly name: string;
  readonly description: string;
}

export interface ManifestLargeLoss {
  readonly name: string;
  readonly description: string;
}

export interface PricingManifest {
  readonly items: readonly ManifestRateItem[];
  readonly tiers: readonly ManifestTier[];
  readonly largeLoss: ManifestLargeLoss;
}

const raw = manifest as unknown as PricingManifest;

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      freeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/**
 * Frozen copy of the checked-in manifest. `services/pricingEngine.ts` reads its
 * RATE_SCHEDULE / TIERS / large-loss text from here so no string is
 * hand-maintained in TS.
 */
export const pricingManifest: PricingManifest = freeze({
  items: raw.items.map((item) => freeze({ ...item })),
  tiers: raw.tiers.map((tier) => freeze({ ...tier })),
  largeLoss: freeze({ ...raw.largeLoss }),
});