/**
 * Alert Disaster Restoration — Client-Side Deterministic Pricing & Psychrometrics
 * Mirror of pricing_engine.py for instant UI updates and tier snapping.
 */

import { FinancialTierInfo, ScopeLineItem, JobState } from '../types/estimator';

export const RATE_SCHEDULE: Record<
  string,
  { description: string; unit: 'LF' | 'SF' | 'EA' | 'Day'; rate: number }
> = {
  standard_service_call: {
    description: 'Standard Service Call / Field Inspection',
    unit: 'EA',
    rate: 350.0,
  },
  after_hours_service_call: {
    description: 'After-Hours Emergency Service Call',
    unit: 'EA',
    rate: 525.0,
  },
  two_ft_flood_cut: {
    description: '2-ft Flood Cut (Drywall + Batt Insulation Removal)',
    unit: 'LF',
    rate: 14.5,
  },
  four_ft_flood_cut: {
    description: '4-ft Flood Cut (Drywall + Batt Insulation Removal)',
    unit: 'LF',
    rate: 22.0,
  },
  baseboard_removal: {
    description: 'Baseboard Removal & Debris Disposal',
    unit: 'LF',
    rate: 2.85,
  },
  tile_flooring_demo: {
    description: 'Ceramic / Porcelain Tile Flooring Demolition to Slab',
    unit: 'SF',
    rate: 8.5,
  },
  carpet_pad_pull: {
    description: 'Carpet & Wet Pad Extraction, Cut & Pull',
    unit: 'SF',
    rate: 1.65,
  },
  vanity_detach_reset: {
    description: 'Vanity Cabinet Detach & Reset (with Collateral Waiver)',
    unit: 'EA',
    rate: 285.0,
  },
  lgr_dehumidifier_day: {
    description: 'Low Grain Refrigerant (LGR) Dehumidifier Rental',
    unit: 'Day',
    rate: 145.0,
  },
  air_mover_day: {
    description: 'Centrifugal Air Mover Rental (Floor / Cavity)',
    unit: 'Day',
    rate: 38.0,
  },
  antimicrobial_spray: {
    description: 'Antimicrobial Botanical Spray Application',
    unit: 'SF',
    rate: 0.42,
  },
  vinyl_flooring_demo: {
    description: 'Vinyl / Linoleum Sheet Flooring Demolition to Subfloor',
    unit: 'SF',
    rate: 3.5,
  },
};

export const TIERS = [
  {
    tier: 1499.0,
    name: 'Tier 1 - Minor Chamber Containment & Drying',
    description: 'Minor single-room containment and light structural drying run.',
  },
  {
    tier: 1999.0,
    name: 'Tier 2 - Standard Room Mitigation',
    description: 'Standard room mitigation with 2-ft cuts and 3-day commercial drying.',
  },
  {
    tier: 2499.0,
    name: 'Tier 3 - Multi-Room Loss & Vanity Detach',
    description: 'Multi-room loss, vanity detachment, tile demo, and structural containment.',
  },
  {
    tier: 2799.0,
    name: 'Tier 4 - Extensive Structural Mitigation',
    description: 'Extensive structural mitigation, heavy demo, Category 3 black water protocols.',
  },
  {
    tier: 3999.0,
    name: 'Tier 5 - Heavy Multi-Chamber Mitigation',
    description: 'Heavy multi-chamber mitigation, whole-structure drying, extensive demo.',
  },
];

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
    tierName: 'Custom Large-Loss Itemized Contract',
    tierDescription: 'Exceeds standard Flat-Fee tiers. Custom multi-day carrier audit schedule.',
    isCustomLargeLoss: true,
  };
}

export function calculatePsychrometrics(tempF: number, rhPercent: number) {
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
  const serviceRate = serviceInfo?.rate || (job.isAfterHours ? 525.0 : 350.0);
  const serviceDesc =
    serviceInfo?.description ||
    (job.isAfterHours
      ? 'After-Hours Emergency Service Call'
      : 'Standard Service Call / Field Inspection');

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
      const rate = RATE_SCHEDULE[key]?.rate || (ht === 4 ? 22.0 : 14.5);
      const desc = RATE_SCHEDULE[key]?.description || `${ht}-ft Flood Cut`;
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
      const rate = RATE_SCHEDULE[key]?.rate || 2.85;
      const desc = RATE_SCHEDULE[key]?.description || 'Baseboard Removal & Debris Disposal';
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
      const rate = RATE_SCHEDULE[key]?.rate || 8.5;
      const desc = RATE_SCHEDULE[key]?.description || 'Flooring Demolition';
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
      const rate = RATE_SCHEDULE[key]?.rate || 285.0;
      const desc = RATE_SCHEDULE[key]?.description || 'Vanity Cabinet Detach & Reset';
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
        const rate = RATE_SCHEDULE[key]?.rate || (isLGR ? 145.0 : 38.0);
        const desc =
          RATE_SCHEDULE[key]?.description ||
          (isLGR ? 'LGR Dehumidifier Rental' : 'Centrifugal Air Mover Rental');
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
