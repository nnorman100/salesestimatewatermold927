/**
 * Alert Disaster Restoration — Authentic Field Remediation Estimates
 * Ground Truth records from Kern County, California field operations.
 * Company: Alert Disaster Restoration | CA License #950983
 * Physical: 3300 Patton Way Ste. 1, Bakersfield, CA 93308 | Tel: (661) 396-7908
 * Lead Estimator: Matthew Myers
 */

import { JobState } from '../types/estimator';

export const SAMPLE_JOBS: Record<string, JobState> = {
  // 1. Tier 3 ($2,499) — 1518 Old Stage St, Bakersfield (Built 1991 - Post-1978)
  bakersfieldOldStage_Tier3: {
    lossId: 'ADR-2026-BK-1518',
    inspectionDate: '2026-06-10',
    status: 'IN_PROGRESS',
    isAfterHours: false,
    customer: {
      name: 'Homeowner',
      serviceAddress: '1518 Old Stage St, Bakersfield, CA 93312',
      phone: '(661) 396-7908',
      email: 'client-1518@alertdisaster.com',
      claimNumber: 'CLM-BK-91823',
      carrier: 'State Farm Insurance',
      dateOfLoss: '2026-06-08',
      technician: 'Matthew Myers, Alert Disaster Restoration (CA Lic #950983)',
    },
    property: {
      buildYear: 1991,
      isPre1978: false,
      asbestosLeadTestingMandated: false,
      statutoryCitations: [
        'Federal 1978 CPSC Ban on Lead-Containing Paint (16 CFR Part 1303)',
        'EPA Asbestos Ban Clarification Standard',
      ],
      statutoryNotice:
        'The home was built in 1991. Therefore, no lead or asbestos testing is required prior to the start of work.',
      plumbingEra: '1978–1995 Era / Polybutylene & Acetal',
      forensicPlumbingDiagnostic:
        '1978–1995 construction: Micro-fracturing and angle stop valve failure on laundry supply line with microbial propagation into shared bedroom cavity.',
    },
    psychrometricBaseline: {
      unaffectedRoom: 'Front Living Room',
      drywallBaselineWME: 9.0,
      tempF: 72.0,
      rhPercent: 44.0,
      dewPointF: 48.8,
      humidityRatioGPP: 50.8,
    },
    chambers: [
      {
        roomId: 'bedroom_1',
        name: '1st Bedroom to the right',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 2 (Structural Absorption)',
        moistureReadings: [
          {
            location: 'Shared wall with laundry room (around 3x3 opening)',
            substrate: 'Drywall',
            readingWME: 8.8,
            classification: 'Dry',
            thermalDeltaF: -1.2,
            notes: 'Moisture in standard dry range. 3x3 drywall missing from shared wall with laundry. Suspected microbial growth inside exposed wall cavity.',
          },
        ],
        demolition: {
          floodCuts: {
            heightFt: 4,
            linearFeet: 4,
            locations: '4-ft cut up to 2 LF extending towards door; 2-ft cut up to 2 LF on east wall in closet',
          },
          baseboards: {
            linearFeet: 4,
            action: 'Baseboard removal and disposal',
          },
        },
        cabinetry: [],
        homeownerObligations: [],
        equipment: [
          { type: 'Centrifugal Air Mover', count: 1, days: 3 },
          { type: 'HEPA 500 Air Scrubber', count: 1, days: 3 },
        ],
        verified: true,
        verificationSummary: '1st Bedroom verified: 4 LF flood cuts (4-ft and 2-ft sections) with containment.',
      },
      {
        roomId: 'laundry_room',
        name: 'Laundry Room',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 2 (Structural Absorption)',
        moistureReadings: [
          {
            location: 'Lower cabinet backing and perimeter wall',
            substrate: 'Drywall / Wood Cabinet',
            readingWME: 9.2,
            classification: 'Dry',
            thermalDeltaF: -1.5,
            notes: 'Moisture in standard dry range. Suspected microbial growth in lower cabinet on shared wall, south/west wall where baseboards removed.',
          },
        ],
        demolition: {
          floodCuts: {
            heightFt: 4,
            linearFeet: 10,
            locations: '4-ft cut up to 7 LF on shared wall; 2-ft cut up to 3 LF on water heater closet shared wall',
          },
          baseboards: {
            linearFeet: 10,
            action: 'Baseboard removal and disposal',
          },
        },
        cabinetry: [
          {
            item: 'Lower Cabinet on Shared Bedroom Wall',
            action: 'Detach & Reset',
            waiver:
              'Countertops have a high probability of breaking during removal. Countertop breakage waiver applies.',
          },
        ],
        homeownerObligations: [
          '*The homeowner to remove all the contents from the lower cabinet that shares with the bedroom before the scheduled start of the job.*',
        ],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 2, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Laundry Room verified: 10 LF flood cuts, lower cabinet detached with countertop waiver, drying chamber active.',
      },
    ],
    scopeItems: [
      {
        key: 'standard_service_call',
        description: 'Standard Service Call / Field Inspection',
        quantity: 1,
        unit: 'EA',
        unitRate: 350.0,
        lineTotal: 350.0,
      },
      {
        key: 'four_ft_flood_cut',
        description: '4-ft Flood Cut (Drywall + Insulation Removal)',
        quantity: 9,
        unit: 'LF',
        unitRate: 22.0,
        lineTotal: 198.0,
      },
      {
        key: 'two_ft_flood_cut',
        description: '2-ft Flood Cut (Drywall + Insulation Removal)',
        quantity: 5,
        unit: 'LF',
        unitRate: 14.5,
        lineTotal: 72.5,
      },
      {
        key: 'baseboard_removal',
        description: 'Baseboard Removal & Disposal',
        quantity: 14,
        unit: 'LF',
        unitRate: 2.85,
        lineTotal: 39.9,
      },
      {
        key: 'vanity_detach_reset',
        description: 'Lower Cabinet Detach & Reset (Countertop Waiver)',
        quantity: 1,
        unit: 'EA',
        unitRate: 285.0,
        lineTotal: 285.0,
      },
      {
        key: 'lgr_dehumidifier_day',
        description: 'LGR Dehumidifier Rental (3 Days)',
        quantity: 1,
        days: 3,
        unit: 'Day',
        unitRate: 145.0,
        lineTotal: 435.0,
      },
      {
        key: 'air_mover_day',
        description: 'Centrifugal Air Movers (3 Units x 3 Days)',
        quantity: 3,
        days: 3,
        unit: 'Day',
        unitRate: 38.0,
        lineTotal: 342.0,
      },
    ],
    financialTier: {
      subtotal: 1722.4,
      snappedTier: 2499.0,
      tierName: 'Tier 3 - Multi-Room Loss & Vanity Detach',
      tierDescription: 'Multi-room loss, lower cabinet detach, and structural containment.',
      isCustomLargeLoss: false,
    },
  },

  // 2. Tier 1 ($1,499) — 5 Shadowglen Way, Wofford Heights (Built 2006 - Post-1978)
  woffordHeightsShadowglen_Tier1: {
    lossId: 'ADR-2026-WH-502',
    inspectionDate: '2026-06-10',
    status: 'IN_PROGRESS',
    isAfterHours: false,
    customer: {
      name: 'Homeowner',
      serviceAddress: '5 Shadowglen Way, Wofford Heights, CA 93285',
      phone: '(661) 396-7908',
      email: 'client-shadowglen@alertdisaster.com',
      claimNumber: 'CLM-WH-4401',
      carrier: 'Allstate Insurance',
      dateOfLoss: '2026-06-09',
      technician: 'Matthew Myers, Alert Disaster Restoration (CA Lic #950983)',
    },
    property: {
      buildYear: 2006,
      isPre1978: false,
      asbestosLeadTestingMandated: false,
      statutoryCitations: [
        'Federal 1978 CPSC Ban on Lead-Containing Paint (16 CFR Part 1303)',
        'EPA Standard Mold Remediation in Schools and Commercial Buildings',
      ],
      statutoryNotice:
        'The home was built in 2006. Therefore, no lead or asbestos testing is required prior to the start of work.',
      plumbingEra: '1996–2010 Era / CPVC & Brass',
      forensicPlumbingDiagnostic:
        '1996–2010 construction: Overhead plumbing joint seepage causing ceiling drywall saturation and microbial propagation in ceiling framing cavity.',
    },
    psychrometricBaseline: {
      unaffectedRoom: 'Main Hallway / Living Area',
      drywallBaselineWME: 8.5,
      tempF: 70.0,
      rhPercent: 40.0,
      dewPointF: 45.0,
      humidityRatioGPP: 44.2,
    },
    chambers: [
      {
        roomId: 'primary_bedroom',
        name: 'Downstairs Primary Bedroom',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 1 (Minimal Moisture Absorption)',
        moistureReadings: [
          {
            location: 'Ceiling drywall surrounding 1x1 missing section',
            substrate: 'Ceiling Drywall & Joists',
            readingWME: 8.5,
            classification: 'Dry',
            thermalDeltaF: -0.8,
            notes: 'Moisture in standard dry range around ceiling with small section missing. Suspected microbial growth on exposed framing.',
          },
        ],
        demolition: {
          flooring: {
            substrate: 'Ceiling Drywall & Insulation Cutout',
            squareFeet: 8,
            action: 'Cut and remove up to 8 SF ceiling drywall and insulation; scrub and clean exposed framing',
          },
        },
        cabinetry: [],
        homeownerObligations: [
          '*The homeowner to clear furniture beneath ceiling work area before the scheduled start of the job.*',
        ],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'HEPA 500 Air Scrubber', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 1, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Downstairs Primary Bedroom verified: 8 SF ceiling demo, framing scrub, antimicrobial primer applied.',
      },
    ],
    scopeItems: [
      {
        key: 'standard_service_call',
        description: 'Standard Service Call / Field Inspection',
        quantity: 1,
        unit: 'EA',
        unitRate: 350.0,
        lineTotal: 350.0,
      },
      {
        key: 'carpet_pad_pull',
        description: 'Ceiling Drywall & Batt Insulation Removal (8 SF)',
        quantity: 8,
        unit: 'SF',
        unitRate: 8.5,
        lineTotal: 68.0,
      },
      {
        key: 'lgr_dehumidifier_day',
        description: 'LGR Dehumidifier Rental (3 Days)',
        quantity: 1,
        days: 3,
        unit: 'Day',
        unitRate: 145.0,
        lineTotal: 435.0,
      },
      {
        key: 'air_mover_day',
        description: 'Centrifugal Air Mover (1 Unit x 3 Days)',
        quantity: 1,
        days: 3,
        unit: 'Day',
        unitRate: 38.0,
        lineTotal: 114.0,
      },
      {
        key: 'antimicrobial_spray',
        description: 'Antimicrobial Botanical Spray & Mold-Inhibiting Primer',
        quantity: 50,
        unit: 'SF',
        unitRate: 0.42,
        lineTotal: 21.0,
      },
    ],
    financialTier: {
      subtotal: 988.0,
      snappedTier: 1499.0,
      tierName: 'Tier 1 - Minor Chamber Containment & Drying',
      tierDescription: 'Minor single-room ceiling demo, framing scrub, and light structural drying run.',
      isCustomLargeLoss: false,
    },
  },

  // 3. Tier 2 ($1,999) — 1111 E Planz Rd, Bakersfield (Built 1946 - Pre-1978 Mandate)
  bakersfieldPlanz_Tier2: {
    lossId: 'ADR-2026-BK-1111',
    inspectionDate: '2026-06-11',
    status: 'IN_PROGRESS',
    isAfterHours: false,
    customer: {
      name: 'Homeowner',
      serviceAddress: '1111 E Planz Rd, Bakersfield, CA 93307',
      phone: '(661) 396-7908',
      email: 'client-planz@alertdisaster.com',
      claimNumber: 'CLM-BK-3391',
      carrier: 'Liberty Mutual',
      dateOfLoss: '2026-06-10',
      technician: 'Matthew Myers, Alert Disaster Restoration (CA Lic #950983)',
    },
    property: {
      buildYear: 1946,
      isPre1978: true,
      asbestosLeadTestingMandated: true,
      statutoryCitations: [
        'California Cal/OSHA Title 8 CCR § 1529 (Asbestos Standard in Construction)',
        'California Health & Safety Code § 25914 (Asbestos & Hazardous Substance Removal Contracts)',
        'Cal/OSHA Title 8 CCR § 1532.1 / EPA RRP (Lead-Based Paint Rule)',
      ],
      statutoryNotice:
        'The home was built in 1946. Before any disturbance to building materials, lead and asbestos testing must be conducted prior to the start of work under California State Law. Testing must be performed by an accredited third-party testing company.',
      plumbingEra: 'Pre-1970 Era / Galvanized & Cast Iron',
      forensicPlumbingDiagnostic:
        'Pre-1970 construction: Failure consistent with internal galvanized pipe tuberculation and angle stop joint failure behind toilet.',
    },
    psychrometricBaseline: {
      unaffectedRoom: 'Living Room',
      drywallBaselineWME: 9.0,
      tempF: 72.0,
      rhPercent: 45.0,
      dewPointF: 49.5,
      humidityRatioGPP: 52.4,
    },
    chambers: [
      {
        roomId: 'hallway_bathroom',
        name: 'Hallway Bathroom',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 2 (Structural Absorption)',
        moistureReadings: [
          {
            location: 'Behind toilet and south window wall baseboards',
            substrate: 'Plaster / Lath & Insulation',
            readingWME: 34.6,
            classification: 'Saturated',
            thermalDeltaF: -4.4,
            notes: 'Suspected microbial growth behind toilet and on baseboards. Elevated to saturated moisture.',
          },
        ],
        demolition: {
          floodCuts: {
            heightFt: 2,
            linearFeet: 13,
            locations: 'South wall window (2-ft cut, 7 LF); Behind toilet (4-ft cut, 4 LF); Right of toilet (2-ft cut, 2 LF)',
          },
          baseboards: {
            linearFeet: 13,
            action: 'Remove baseboard south wall (7 LF), behind toilet (4 LF), right of toilet (2 LF)',
          },
        },
        cabinetry: [
          {
            item: 'Toilet Fixture',
            action: 'Detach & Reset',
            waiver: 'Move toilet to access wet plaster and framing; reset on new wax ring following drying.',
          },
        ],
        homeownerObligations: [
          '*The homeowner to clear toiletries and bathroom accessories prior to scheduled remediation.*',
        ],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 2, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Hallway Bathroom verified: Toilet moved, 13 LF plaster flood cuts, third-party testing disclosed.',
      },
    ],
    scopeItems: [
      {
        key: 'standard_service_call',
        description: 'Standard Service Call / Field Inspection',
        quantity: 1,
        unit: 'EA',
        unitRate: 350.0,
        lineTotal: 350.0,
      },
      {
        key: 'four_ft_flood_cut',
        description: '4-ft Flood Cut (Plaster + Insulation behind toilet)',
        quantity: 4,
        unit: 'LF',
        unitRate: 22.0,
        lineTotal: 88.0,
      },
      {
        key: 'two_ft_flood_cut',
        description: '2-ft Flood Cut (Plaster + Insulation on perimeter)',
        quantity: 9,
        unit: 'LF',
        unitRate: 14.5,
        lineTotal: 130.5,
      },
      {
        key: 'baseboard_removal',
        description: 'Baseboard Removal & Disposal (13 LF)',
        quantity: 13,
        unit: 'LF',
        unitRate: 2.85,
        lineTotal: 37.05,
      },
      {
        key: 'lgr_dehumidifier_day',
        description: 'LGR Dehumidifier Rental (3 Days)',
        quantity: 1,
        days: 3,
        unit: 'Day',
        unitRate: 145.0,
        lineTotal: 435.0,
      },
      {
        key: 'air_mover_day',
        description: 'Centrifugal Air Movers (2 Units x 3 Days)',
        quantity: 2,
        days: 3,
        unit: 'Day',
        unitRate: 38.0,
        lineTotal: 228.0,
      },
    ],
    financialTier: {
      subtotal: 1268.55,
      snappedTier: 1999.0,
      tierName: 'Tier 2 - Standard Room Mitigation',
      tierDescription: 'Standard room mitigation with 2-ft cuts and 3-day commercial drying.',
      isCustomLargeLoss: false,
    },
  },

  // 4. Tier 4 ($2,799) — 11411 Andretti Ave, Bakersfield (Built 2004 - Post-1978)
  bakersfieldAndretti_Tier4: {
    lossId: 'ADR-2026-BK-11411',
    inspectionDate: '2026-06-15',
    status: 'IN_PROGRESS',
    isAfterHours: false,
    customer: {
      name: 'Homeowner',
      serviceAddress: '11411 Andretti Ave, Bakersfield, CA 93312',
      phone: '(661) 396-7908',
      email: 'client-andretti@alertdisaster.com',
      claimNumber: 'CLM-BK-5821',
      carrier: 'Nationwide Insurance',
      dateOfLoss: '2026-06-13',
      technician: 'Matthew Myers, Alert Disaster Restoration (CA Lic #950983)',
    },
    property: {
      buildYear: 2004,
      isPre1978: false,
      asbestosLeadTestingMandated: false,
      statutoryCitations: [
        'Federal 1978 CPSC Ban on Lead-Containing Paint (16 CFR Part 1303)',
        'EPA Standard Environmental Containment Protocol',
      ],
      statutoryNotice:
        'The home was built in 2004. Therefore, no lead or asbestos testing is required prior to the start of work.',
      plumbingEra: '1996–2010 Era / CPVC & Brass',
      forensicPlumbingDiagnostic:
        '1996–2010 construction: Toilet supply valve dezincification and sub-slab shower pan perimeter weeping.',
    },
    psychrometricBaseline: {
      unaffectedRoom: 'Master Bedroom Foyer',
      drywallBaselineWME: 8.8,
      tempF: 71.0,
      rhPercent: 43.0,
      dewPointF: 47.5,
      humidityRatioGPP: 48.6,
    },
    chambers: [
      {
        roomId: 'primary_water_closet',
        name: 'Primary water closet',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 3 (Deep Structural Absorption)',
        moistureReadings: [
          {
            location: 'Perimeter drywall and baseboards around toilet',
            substrate: 'Drywall & Tile Floor',
            readingWME: 24.2,
            classification: 'Wet',
            thermalDeltaF: -3.8,
            notes: 'Standard dry to slightly elevated on baseboards and walls. Elevated on tile flooring.',
          },
        ],
        demolition: {
          floodCuts: {
            heightFt: 2,
            linearFeet: 7,
            locations: 'Shower shared wall (4-ft cut, 2 LF); Exterior wall (2-ft cut, 3 LF); Closet shared wall (2-ft cut, 2 LF)',
          },
          baseboards: {
            linearFeet: 12,
            action: 'Baseboard removal around toilet area',
          },
          flooring: {
            substrate: 'Ceramic Tile',
            squareFeet: 18,
            action: 'Tile demolition to concrete slab (18 SF)',
          },
        },
        cabinetry: [],
        homeownerObligations: [],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 2, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Primary water closet verified: 7 LF cuts, 18 SF tile demo to slab, baseboards pulled.',
      },
      {
        roomId: 'primary_closet',
        name: 'Primary closet',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 3 (Deep Structural Absorption)',
        moistureReadings: [
          {
            location: 'Tile flooring extending from exterior wall',
            substrate: 'Ceramic Tile to Slab',
            readingWME: 22.0,
            classification: 'Wet',
            thermalDeltaF: -3.2,
            notes: 'Elevated moisture trapped beneath tile mortar bed extending from exterior wall.',
          },
        ],
        demolition: {
          baseboards: {
            linearFeet: 14,
            action: 'Baseboard removal along left perimeter',
          },
          flooring: {
            substrate: 'Ceramic Tile',
            squareFeet: 36,
            action: '36 SF tile flooring demo extending from exterior wall (Total 54 SF tile demo)',
          },
        },
        cabinetry: [],
        homeownerObligations: [
          '*The homeowner to remove the contents from left section of the closet before the scheduled start of the job.*',
        ],
        equipment: [
          { type: 'Centrifugal Air Mover', count: 1, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Primary closet verified: 36 SF tile demo, 14 LF baseboards, drying containment running.',
      },
    ],
    scopeItems: [
      {
        key: 'standard_service_call',
        description: 'Standard Service Call / Field Inspection',
        quantity: 1,
        unit: 'EA',
        unitRate: 350.0,
        lineTotal: 350.0,
      },
      {
        key: 'four_ft_flood_cut',
        description: '4-ft Flood Cut (Drywall on Shower Shared Wall)',
        quantity: 2,
        unit: 'LF',
        unitRate: 22.0,
        lineTotal: 44.0,
      },
      {
        key: 'two_ft_flood_cut',
        description: '2-ft Flood Cut (Drywall + Insulation on exterior & closet walls)',
        quantity: 5,
        unit: 'LF',
        unitRate: 14.5,
        lineTotal: 72.5,
      },
      {
        key: 'baseboard_removal',
        description: 'Baseboard Removal & Disposal (26 LF)',
        quantity: 26,
        unit: 'LF',
        unitRate: 2.85,
        lineTotal: 74.1,
      },
      {
        key: 'tile_flooring_demo',
        description: 'Ceramic Tile Flooring Demolition to Slab (54 SF total)',
        quantity: 54,
        unit: 'SF',
        unitRate: 8.5,
        lineTotal: 459.0,
      },
      {
        key: 'lgr_dehumidifier_day',
        description: 'LGR Dehumidifier Rental (3 Days)',
        quantity: 1,
        days: 3,
        unit: 'Day',
        unitRate: 145.0,
        lineTotal: 435.0,
      },
      {
        key: 'air_mover_day',
        description: 'Centrifugal Air Movers (3 Units x 3 Days)',
        quantity: 3,
        days: 3,
        unit: 'Day',
        unitRate: 38.0,
        lineTotal: 342.0,
      },
    ],
    financialTier: {
      subtotal: 1776.6,
      snappedTier: 2799.0,
      tierName: 'Tier 4 - Extensive Structural Mitigation',
      tierDescription: 'Extensive structural mitigation, 54 SF tile demo, 7 LF flood cuts, and drying containment.',
      isCustomLargeLoss: false,
    },
  },

  // 5. Tier 5 ($3,999) — 6304 Ellis Ave, Bakersfield (Built 1962 - Pre-1978 Mandate, 5 Rooms)
  bakersfieldEllis_Tier5: {
    lossId: 'ADR-2026-BK-6304',
    inspectionDate: '2026-06-15',
    status: 'IN_PROGRESS',
    isAfterHours: true,
    customer: {
      name: 'Homeowner',
      serviceAddress: '6304 Ellis Ave, Bakersfield, CA 93309',
      phone: '(661) 396-7908',
      email: 'client-ellis@alertdisaster.com',
      claimNumber: 'CLM-BK-7704',
      carrier: 'Travelers Insurance',
      dateOfLoss: '2026-06-12',
      technician: 'Matthew Myers, Alert Disaster Restoration (CA Lic #950983)',
    },
    property: {
      buildYear: 1962,
      isPre1978: true,
      asbestosLeadTestingMandated: true,
      statutoryCitations: [
        'California Cal/OSHA Title 8 CCR § 1529 (Asbestos Standard in Construction)',
        'California Health & Safety Code § 25914 (Asbestos & Hazardous Substance Removal Contracts)',
        'Cal/OSHA Title 8 CCR § 1532.1 / EPA RRP (Lead-Based Paint Rule)',
      ],
      statutoryNotice:
        'The home was built in 1962. Before any disturbance to building materials, lead and asbestos testing must be conducted prior to the start of work under California State Law. Testing must be performed by an accredited third-party testing company.',
      plumbingEra: 'Pre-1970 Era / Galvanized & Cast Iron',
      forensicPlumbingDiagnostic:
        'Pre-1970 construction: Failure consistent with internal galvanized pipe tuberculation and kitchen sink supply line burst causing multi-room slab flood.',
    },
    psychrometricBaseline: {
      unaffectedRoom: 'Rear Den / Unaffected Zone',
      drywallBaselineWME: 9.2,
      tempF: 73.0,
      rhPercent: 46.0,
      dewPointF: 51.2,
      humidityRatioGPP: 55.6,
    },
    chambers: [
      {
        roomId: 'kitchen',
        name: 'Kitchen',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 3 (Deep Structural Absorption)',
        moistureReadings: [
          {
            location: 'Perimeter drywall, toe kicks, and sheet vinyl',
            substrate: 'Drywall / Wood Cabinet / Vinyl Sheet',
            readingWME: 44.8,
            classification: 'Saturated',
            thermalDeltaF: -5.4,
            notes: 'Elevated moisture across all areas. Cabinetry evaluation: highly saturated, low probability of drying in place.',
          },
        ],
        demolition: {
          baseboards: {
            linearFeet: 34,
            action: 'Baseboard & toe kick removal',
          },
          flooring: {
            substrate: 'Sheet Vinyl Flooring',
            squareFeet: 120,
            action: 'Vinyl sheet demo to slab substrate',
          },
        },
        cabinetry: [
          {
            item: 'Kitchen Base Cabinetry',
            action: 'Detach & Reset',
            waiver:
              'Cabinetry saturated with low probability of drying in place. Potential for substrate swelling and delamination.',
          },
        ],
        homeownerObligations: [
          '*The homeowner to remove all contents from kitchen lower cabinetry prior to scheduled remediation.*',
        ],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 2, days: 3 },
          { type: 'HEPA 500 Air Scrubber', count: 1, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Kitchen verified: 120 SF sheet vinyl demo, toe kicks removed, base cabinet evaluation noted.',
      },
      {
        roomId: 'living_entry_hallway',
        name: 'Living Room, Entry, Hallway, Hall Closet',
        waterCategory: 'Category 2 (Grey Water)',
        waterClass: 'Class 3 (Deep Structural Absorption)',
        moistureReadings: [
          {
            location: 'Carpet pad and perimeter drywall throughout main corridor',
            substrate: 'Carpet / Pad / Drywall',
            readingWME: 38.0,
            classification: 'Saturated',
            thermalDeltaF: -4.8,
            notes: 'Saturated carpet pad and moisture wicking up baseplates into drywall.',
          },
        ],
        demolition: {
          floodCuts: {
            heightFt: 2,
            linearFeet: 4,
            locations: 'Entryway 2-ft flood cut (4 LF)',
          },
          baseboards: {
            linearFeet: 102,
            action: 'Baseboard removal across Living Room (42 LF), Entry (16 LF), Hallway (28 LF), Hall Closet (16 LF)',
          },
          flooring: {
            substrate: 'Carpet & Wet Pad',
            squareFeet: 303,
            action: 'Carpet and wet pad extraction and removal: Living Room (180 SF), Entry (40 SF), Hallway (65 SF), Hall Closet (18 SF)',
          },
        },
        cabinetry: [],
        homeownerObligations: [
          '*The homeowner to remove all floor-level furniture, storage boxes, and closet items prior to emergency extraction and demolition.*',
        ],
        equipment: [
          { type: 'Low Grain Refrigerant (LGR) Dehumidifier', count: 1, days: 3 },
          { type: 'Centrifugal Air Mover', count: 4, days: 3 },
          { type: 'HEPA 500 Air Scrubber', count: 1, days: 3 },
        ],
        verified: true,
        verificationSummary: 'Living/Entry/Hall verified: 303 SF carpet pull, 102 LF baseboards, 4 LF cuts, 2nd LGR drying chamber.',
      },
    ],
    scopeItems: [
      {
        key: 'after_hours_service_call',
        description: 'After-Hours Emergency Service Call & Field Inspection',
        quantity: 1,
        unit: 'EA',
        unitRate: 525.0,
        lineTotal: 525.0,
      },
      {
        key: 'two_ft_flood_cut',
        description: '2-ft Flood Cut (Drywall + Insulation Removal, Entryway)',
        quantity: 4,
        unit: 'LF',
        unitRate: 14.5,
        lineTotal: 58.0,
      },
      {
        key: 'baseboard_removal',
        description: 'Baseboard Removal & Disposal (136 LF total)',
        quantity: 136,
        unit: 'LF',
        unitRate: 2.85,
        lineTotal: 387.6,
      },
      {
        key: 'vinyl_flooring_demo',
        description: 'Vinyl Sheet Flooring Demolition to Slab (120 SF)',
        quantity: 120,
        unit: 'SF',
        unitRate: 3.5,
        lineTotal: 420.0,
      },
      {
        key: 'carpet_pad_pull',
        description: 'Carpet & Wet Pad Extraction, Cut & Removal (303 SF total)',
        quantity: 303,
        unit: 'SF',
        unitRate: 1.65,
        lineTotal: 499.95,
      },
      {
        key: 'lgr_dehumidifier_day',
        description: 'LGR Dehumidifier Rental (2 Units x 3 Days)',
        quantity: 2,
        days: 3,
        unit: 'Day',
        unitRate: 145.0,
        lineTotal: 870.0,
      },
      {
        key: 'air_mover_day',
        description: 'Centrifugal Air Movers (6 Units x 3 Days)',
        quantity: 6,
        days: 3,
        unit: 'Day',
        unitRate: 38.0,
        lineTotal: 684.0,
      },
    ],
    financialTier: {
      subtotal: 3444.55,
      snappedTier: 3999.0,
      tierName: 'Tier 5 - Heavy Multi-Chamber Mitigation',
      tierDescription: 'Heavy multi-chamber mitigation, whole-structure drying, extensive demo.',
      isCustomLargeLoss: false,
    },
  },
};

// Aliases for backward compatibility with previous sample keys
SAMPLE_JOBS.glendalePre1978 = SAMPLE_JOBS.bakersfieldPlanz_Tier2;
SAMPLE_JOBS.irvinePost1978 = SAMPLE_JOBS.bakersfieldOldStage_Tier3;
