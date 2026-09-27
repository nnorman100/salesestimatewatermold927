/**
 * Alert Disaster Restoration — Client-Side Deterministic Pricing & Psychrometrics
 * Mirror of pricing_engine.py for instant UI updates and tier snapping.
 */

import { FinancialTierInfo, ScopeLineItem, JobState } from '../types/estimator';
import { pricingManifest, RateUnit } from './pricingManifest';

// Derived from the single-source-of-truth `pricing_manifest.json` (see services/pricingManifest.ts).
// No rate, tier name, tier description, or large-loss string is hand-maintained in this file.
const RATE_SCHEDULE: Record<
  string,
  { description: string; unit: RateUnit; rate: number }
> = Object.fromEntries(
  pricingManifest.items.map((item) => [
    item.id,
    { description: item.description, unit: item.unit, rate: item.rate },
  ]),
);

const TIERS = pricingManifest.tiers.map((tier) => ({
  tier: tier.threshold,
  name: tier.name,
  description: tier.description,
}));

const LARGE_LOSS = pricingManifest.largeLoss;

export function snapToFinancialTier(subtotal: number): FinancialTierInfo {
  for (const t of TIERS) {
    if (subtotal <= t.tier) {
      return {
        subtotal: Math.round(subtotal * 100) / 100,
        snappedTier: t.tier,
        tierName: t.name,
        tierDescription: t.description,
        isCustomLargeLoss: false,
      };
    }
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    snappedTier: Math.round(subtotal * 100) / 100,
    tierName: LARGE_LOSS.name,
    tierDescription: LARGE_LOSS.description,
    isCustomLargeLoss: true,
  };
}

export function calculatePsychrometrics(tempF: number, rhPercent: number) {
  // Math.round is half-up; matches pricing_engine.py's _round_half_up so both engines agree on .x5 boundaries.
  const tempC = ((tempF - 32.0) * 5.0) / 9.0;
  const rhClamped = Math.max(0.01, Math.min(100.0, rhPercent));
  const eS = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const e = eS * (rhClamped / 100.0);
  const pAtm = 1013.25;
  const humidityRatio = (0.62198 * e) / (pAtm - e);
  const gpp = Math.round(humidityRatio * 7000.0 * 10) / 10;

  const alpha = (17.67 * tempC) / (tempC + 243.5) + Math.log(rhClamped / 100.0);
  const dewPointC = (243.5 * alpha) / (17.67 - alpha);
  const dewPointF = Math.round((dewPointC * 1.8 + 32.0) * 10) / 10;

  return {
    tempF,
    rhPercent,
    dewPointF,
    humidityRatioGPP: gpp,
  };
}

export function calculatePricingFromJob(job: JobState): {
  subtotal: number;
  lineItems: ScopeLineItem[];
  financialTier: FinancialTierInfo;
} {
  const lineItems: ScopeLineItem[] = [];
  let subtotal = 0;

  // 1. Service Call
  const serviceKey = job.isAfterHours ? 'after_hours_service_call' : 'standard_service_call';
  const serviceInfo = RATE_SCHEDULE[serviceKey];
  const serviceRate = serviceInfo.rate;
  const serviceDesc = serviceInfo.description;

  lineItems.push({
    key: serviceKey,
    description: serviceDesc,
    quantity: 1,
    qty: 1,
    unit: 'EA',
    unitRate: serviceRate,
    lineTotal: serviceRate,
    notes: job.isAfterHours ? 'After-hours emergency response' : 'Standard field assessment',
  });
  subtotal += serviceRate;

  // 2. Iterate Chambers
  for (const ch of job.chambers || []) {
    if (ch.demolition?.floodCuts && ch.demolition.floodCuts.linearFeet > 0) {
      const ht = ch.demolition.floodCuts.heightFt;
      const key = ht === 4 ? 'four_ft_flood_cut' : 'two_ft_flood_cut';
      const rate = RATE_SCHEDULE[key].rate;
      const desc = RATE_SCHEDULE[key].description;
      const lf = ch.demolition.floodCuts.linearFeet;
      const total = Math.round(lf * rate * 100) / 100;
      lineItems.push({
        key,
        description: `${desc} (${ch.name})`,
        quantity: lf,
        qty: lf,
        unit: 'LF',
        unitRate: rate,
        lineTotal: total,
        notes: ch.demolition.floodCuts.locations || `Demolition cut in ${ch.name}`,
      });
      subtotal += total;
    }

    if (ch.demolition?.baseboards && ch.demolition.baseboards.linearFeet > 0) {
      const key = 'baseboard_removal';
      const rate = RATE_SCHEDULE[key].rate;
      const desc = RATE_SCHEDULE[key].description;
      const lf = ch.demolition.baseboards.linearFeet;
      const total = Math.round(lf * rate * 100) / 100;
      lineItems.push({
        key,
        description: `${desc} (${ch.name})`,
        quantity: lf,
        qty: lf,
        unit: 'LF',
        unitRate: rate,
        lineTotal: total,
        notes: ch.demolition.baseboards.action || `Baseboards in ${ch.name}`,
      });
      subtotal += total;
    }

    if (ch.demolition?.flooring && ch.demolition.flooring.squareFeet > 0) {
      const substrate = (ch.demolition.flooring.substrate || '').toLowerCase();
      let key = 'tile_flooring_demo';
      if (substrate.includes('carpet') || substrate.includes('pad')) {
        key = 'carpet_pad_pull';
      } else if (
        substrate.includes('vinyl') ||
        substrate.includes('sheet') ||
        substrate.includes('linoleum')
      ) {
        key = 'vinyl_flooring_demo';
      }
      const rate = RATE_SCHEDULE[key].rate;
      const desc = RATE_SCHEDULE[key].description;
      const sf = ch.demolition.flooring.squareFeet;
      const total = Math.round(sf * rate * 100) / 100;
      lineItems.push({
        key,
        description: `${desc} (${ch.name})`,
        quantity: sf,
        qty: sf,
        unit: 'SF',
        unitRate: rate,
        lineTotal: total,
        notes: ch.demolition.flooring.substrate || `Flooring demo in ${ch.name}`,
      });
      subtotal += total;
    }

    if (ch.cabinetry && ch.cabinetry.length > 0) {
      const key = 'vanity_detach_reset';
      const rate = RATE_SCHEDULE[key].rate;
      const desc = RATE_SCHEDULE[key].description;
      const count = ch.cabinetry.length;
      const total = Math.round(count * rate * 100) / 100;
      lineItems.push({
        key,
        description: `${desc} (${ch.name})`,
        quantity: count,
        qty: count,
        unit: 'EA',
        unitRate: rate,
        lineTotal: total,
        notes: ch.cabinetry.map((c) => c.item).join(', '),
      });
      subtotal += total;
    }

    for (const eq of ch.equipment || []) {
      if (eq.count > 0 && eq.days > 0) {
        const isLGR = eq.type.includes('LGR') || eq.type.toLowerCase().includes('dehumidifier');
        const key = isLGR ? 'lgr_dehumidifier_day' : 'air_mover_day';
        const rate = RATE_SCHEDULE[key].rate;
        const desc = RATE_SCHEDULE[key].description;
        const total = Math.round(eq.count * eq.days * rate * 100) / 100;
        lineItems.push({
          key,
          description: `${desc} (${ch.name})`,
          quantity: eq.count,
          qty: eq.count,
          days: eq.days,
          unit: 'Day',
          unitRate: rate,
          lineTotal: total,
          notes: `${eq.count} units x ${eq.days} days in ${ch.name}`,
        });
        subtotal += total;
      }
    }
  }

  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const financialTier = snapToFinancialTier(roundedSubtotal);

  return {
    subtotal: roundedSubtotal,
    lineItems,
    financialTier,
  };
}
