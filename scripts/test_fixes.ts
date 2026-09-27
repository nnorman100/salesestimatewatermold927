import assert from "node:assert";
import { calculatePricingFromJob, snapToFinancialTier } from "../services/pricingEngine";
import { POST } from "../app/api/gemini/live-scope/route";
import { JobState } from "../types/estimator";
import { NextRequest } from "next/server";

function createBaseJob(): JobState {
  return {
    lossId: "ADR-TEST-001",
    inspectionDate: "2026-09-26",
    status: "IN_PROGRESS",
    isAfterHours: false,
    customer: {
      name: "Test Customer",
      serviceAddress: "123 Test St",
      phone: "555-0100",
      email: "test@example.com",
      dateOfLoss: "2026-09-25",
      technician: "Tech 1",
    },
    property: {
      buildYear: 1985,
      isPre1978: false,
      asbestosLeadTestingMandated: false,
      statutoryCitations: [],
      statutoryNotice: "",
      plumbingEra: "1978-1995",
      forensicPlumbingDiagnostic: "",
    },
    psychrometricBaseline: {
      unaffectedRoom: "Living Room",
      drywallBaselineWME: 9.2,
      tempF: 72,
      rhPercent: 45,
    },
    chambers: [
      {
        roomId: "room_1",
        name: "Master Bath",
        waterCategory: "Category 2",
        waterClass: "Class 2",
        moistureReadings: [],
        demolition: {},
        cabinetry: [],
        homeownerObligations: [],
        equipment: [],
        verified: false,
      },
    ],
    scopeItems: [],
    financialTier: {
      subtotal: 350.0,
      snappedTier: 1499.0,
      tierName: "Tier 1 - Minor Chamber Containment & Drying",
      tierDescription: "Minor single-room containment and light drying",
      isCustomLargeLoss: false,
    },
  };
}

async function runTests() {
  console.log("=== RUNNING SUITE: Pricing Engine & Field Scoping Fixes ===");

  // Test 1: Pricing engine basic service call
  console.log("\n[Test 1] Standard & After-Hours Service Calls...");
  const baseJob = createBaseJob();
  const pricingStandard = calculatePricingFromJob(baseJob);
  assert.strictEqual(pricingStandard.subtotal, 350.0);
  assert.strictEqual(pricingStandard.financialTier.snappedTier, 1499.0);
  assert.strictEqual(pricingStandard.lineItems[0].key, "standard_service_call");

  const afterHoursJob = { ...createBaseJob(), isAfterHours: true };
  const pricingAfterHours = calculatePricingFromJob(afterHoursJob);
  assert.strictEqual(pricingAfterHours.subtotal, 525.0);
  assert.strictEqual(pricingAfterHours.financialTier.snappedTier, 1499.0);
  assert.strictEqual(pricingAfterHours.lineItems[0].key, "after_hours_service_call");
  console.log("✓ Service call rates validated ($350.00 standard, $525.00 after-hours).");

  // Test 2: Full line item rates and tier calculation
  console.log("\n[Test 2] Comprehensive Line Items (Cuts, Flooring, Equipment)...");
  const complexJob = createBaseJob();
  complexJob.chambers[0].demolition = {
    floodCuts: { heightFt: 2, linearFeet: 28, locations: "South and West walls" },
    baseboards: { linearFeet: 28, action: "Removal & Disposal" },
    flooring: { substrate: "Ceramic tile demo to slab", squareFeet: 50 },
  };
  complexJob.chambers[0].cabinetry = [
    { item: "Double Vanity", action: "Detach & Reset", waiver: "Waiver applies" },
  ];
  complexJob.chambers[0].equipment = [
    { type: "Low Grain Refrigerant (LGR) Dehumidifier", count: 1, days: 3 },
    { type: "Centrifugal Air Mover", count: 2, days: 3 },
  ];

  // Expected:
  // Service: 350.00
  // 2-ft cuts: 28 * 14.50 = 406.00
  // Baseboard: 28 * 2.85 = 79.80
  // Tile demo: 50 * 8.50 = 425.00
  // Vanity: 1 * 285.00 = 285.00
  // LGR: 1 * 3 * 145.00 = 435.00
  // Air movers: 2 * 3 * 38.00 = 228.00
  // Subtotal = 350 + 406 + 79.80 + 425 + 285 + 435 + 228 = 2208.80
  // Snapped Tier = Tier 3 (2499.00)
  const complexPricing = calculatePricingFromJob(complexJob);
  assert.strictEqual(complexPricing.subtotal, 2208.8);
  assert.strictEqual(complexPricing.financialTier.snappedTier, 2499.0);
  assert.strictEqual(complexPricing.financialTier.tierName, "Tier 3 - Multi-Room Loss & Heavy Demo");
  console.log(`✓ Complex scope subtotal: $${complexPricing.subtotal} successfully snapped to Tier 3 ($2499.00).`);

  // Test 3: Large loss conversion (> $3999)
  console.log("\n[Test 3] Custom Large-Loss Conversion...");
  const largeLossJob = createBaseJob();
  largeLossJob.chambers[0].demolition = {
    floodCuts: { heightFt: 4, linearFeet: 200, locations: "All walls" }, // 200 * 22 = 4400.00
  };
  const largeLossPricing = calculatePricingFromJob(largeLossJob);
  assert.strictEqual(largeLossPricing.subtotal, 4750.0);
  assert.strictEqual(largeLossPricing.financialTier.isCustomLargeLoss, true);
  assert.strictEqual(largeLossPricing.financialTier.snappedTier, 4750.0);
  assert.strictEqual(largeLossPricing.financialTier.tierName, "Custom Large-Loss Itemized Contract");
  console.log("✓ Large loss correctly bypassed fixed tiers and retained exact subtotal $4750.00.");

  // Test 4: Live Scope Route - Room verification with NO flood cuts (Fix for Issue 2.1)
  console.log("\n[Test 4] Live Scope API - Verification with NO flood cuts...");
  const emptyCutsJob = createBaseJob();
  const reqNoCuts = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "verify room scope for Master Bath",
      currentRoom: "Master Bath",
      jobState: emptyCutsJob,
    }),
  });
  const resNoCuts = await POST(reqNoCuts);
  const dataNoCuts = await resNoCuts.json();
  assert.ok(dataNoCuts.spokenResponse.includes("no structural cuts"), `Expected 'no structural cuts' but got: '${dataNoCuts.spokenResponse}'`);
  assert.ok(!dataNoCuts.spokenResponse.includes("28"), `Should NOT contain '28' fallback: '${dataNoCuts.spokenResponse}'`);
  console.log(`✓ Verification without cuts correctly announced: "${dataNoCuts.spokenResponse}"`);

  // Test 5: Live Scope Route - Room verification WITH flood cuts
  console.log("\n[Test 5] Live Scope API - Verification WITH 16 LF of 2-ft cuts...");
  const cutsJob = createBaseJob();
  cutsJob.chambers[0].demolition = {
    floodCuts: { heightFt: 2, linearFeet: 16, locations: "West wall" },
  };
  const reqWithCuts = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "verify room scope for Master Bath",
      currentRoom: "Master Bath",
      jobState: cutsJob,
    }),
  });
  const resWithCuts = await POST(reqWithCuts);
  const dataWithCuts = await resWithCuts.json();
  assert.ok(dataWithCuts.spokenResponse.includes("16 LF of 2-ft flood cuts"), `Expected '16 LF of 2-ft flood cuts' but got: '${dataWithCuts.spokenResponse}'`);
  console.log(`✓ Verification with cuts correctly announced: "${dataWithCuts.spokenResponse}"`);

  // Test 6: Live Scope Route - Moisture reading without thermal delta (Fix for Issue 2.2)
  console.log("\n[Test 6] Live Scope API - Moisture reading thermal delta check...");
  const reqMoistureNoDelta = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "West wall probe reads 28.5% WME",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resMoisturePost = await POST(reqMoistureNoDelta);
  const resMoisture = await resMoisturePost.json();
  const reading = resMoisture.updatedState.chambers[0].moistureReadings[0];
  assert.strictEqual(reading.readingWME, 28.5);
  assert.strictEqual(reading.thermalDeltaF, undefined, `Expected thermalDeltaF to be undefined, but got ${reading.thermalDeltaF}`);
  console.log("✓ Moisture reading without FLIR correctly leaves thermalDeltaF undefined (no fake -4.8).");

  // Test 7: Live Scope Route - Moisture reading with explicit delta
  console.log("\n[Test 7] Live Scope API - Moisture reading with dictated thermal delta...");
  const reqMoistureWithDelta = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "West wall probe reads 32.1% WME with a thermal delta of -3.5 degrees",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resMoistureWithDeltaPost = await POST(reqMoistureWithDelta);
  const resMoistureWithDelta = await resMoistureWithDeltaPost.json();
  const readingWithDelta = resMoistureWithDelta.updatedState.chambers[0].moistureReadings[0];
  assert.strictEqual(readingWithDelta.readingWME, 32.1);
  assert.strictEqual(readingWithDelta.thermalDeltaF, -3.5);
  console.log("✓ Moisture reading with dictated delta correctly extracts thermalDeltaF: -3.5.");

  // Test 8: Live Scope Route - Multimodal photo handling (Fix for Issue 1.1)
  console.log("\n[Test 8] Live Scope API - Multimodal photo attached...");
  const reqPhoto = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "Photo of moisture meter LCD display",
      photoBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resPhotoPost = await POST(reqPhoto);
  const resPhoto = await resPhotoPost.json();
  assert.ok(resPhoto.steps.length > 0, "Expected steps from multimodal processing");
  console.log(`✓ Multimodal photo handled safely with steps recorded: ${resPhoto.steps[0].content}`);

  // Test 9: Pricing synchronization in Live Scope Route
  console.log("\n[Test 9] Live Scope API - Authoritative pricing sync...");
  const reqPricingSync = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "35 linear feet of 2-ft cut",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resPricingSyncPost = await POST(reqPricingSync);
  const resPricingSync = await resPricingSyncPost.json();
  // 350 + (35 * 14.5 = 507.50) = 857.50
  assert.strictEqual(resPricingSync.updatedState.financialTier.subtotal, 857.5);
  assert.strictEqual(resPricingSync.updatedState.financialTier.snappedTier, 1499.0);
  assert.ok(resPricingSync.updatedState.scopeItems.length > 0, "Expected scopeItems to be populated by pricing engine");
  console.log("✓ Route pricing matches pricingEngine and populates scopeItems.");

  // Test 10: Python pricing_engine.py interop with TypeScript scopeItems
  console.log("\n[Test 10] Python-TS Deterministic Pricing Interoperability...");
  const { execFileSync } = await import("node:child_process");
  const pyCode = `
import json, sys
from pricing_engine import calculate_pricing
items = json.loads(sys.argv[1])
res = calculate_pricing({"items": items})
print(json.dumps(res))
`;
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const pyOutputRaw = execFileSync(pythonBin, ["-c", pyCode, JSON.stringify(complexPricing.lineItems)], { encoding: "utf-8" });
  const pyOutput = JSON.parse(pyOutputRaw.trim());
  assert.strictEqual(pyOutput.subtotal, complexPricing.subtotal, `Python subtotal (${pyOutput.subtotal}) must match TS subtotal (${complexPricing.subtotal})`);
  assert.strictEqual(pyOutput.financialTier.snappedTier, complexPricing.financialTier.snappedTier);
  console.log(`✓ Python pricing_engine calculated exact subtotal ($${pyOutput.subtotal}) and snappedTier ($${pyOutput.financialTier.snappedTier}) matching TypeScript.`);

  // Test 11: Live Scope Route - Flooring demolition parsing
  console.log("\n[Test 11] Live Scope API - Flooring demolition parsing...");
  const reqFlooring = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "50 SF ceramic tile demo to concrete slab",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resFlooring = await (await POST(reqFlooring)).json();
  assert.strictEqual(resFlooring.updatedState.chambers[0].demolition.flooring?.squareFeet, 50);
  // 350 service + (50 * 8.50 = 425) = 775.00
  assert.strictEqual(resFlooring.updatedState.financialTier.subtotal, 775.0);
  console.log("✓ Flooring demolition extracted (50 SF tile) and correctly priced.");

  // Test 12: Live Scope Route - Equipment deployment parsing
  console.log("\n[Test 12] Live Scope API - Equipment deployment parsing...");
  const reqEq = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      technicianSpeech: "deploy 1 LGR dehumidifier and 2 air movers for 3 days",
      currentRoom: "Master Bath",
      jobState: createBaseJob(),
    }),
  });
  const resEq = await (await POST(reqEq)).json();
  const eqList = resEq.updatedState.chambers[0].equipment;
  assert.strictEqual(eqList.length, 2);
  // 350 + (1 * 3 * 145 = 435) + (2 * 3 * 38 = 228) = 1013.00
  assert.strictEqual(resEq.updatedState.financialTier.subtotal, 1013.0);
  console.log("✓ Equipment deployment extracted (1 LGR, 2 air movers x 3 days) and correctly priced.");

  // Test 13: Live Scope Route - Homeowner obligation deduplication
  console.log("\n[Test 13] Live Scope API - Homeowner obligation deduplication...");
  let dedupState = createBaseJob();
  for (let i = 0; i < 3; i++) {
    const reqDedup = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technicianSpeech: "homeowner to clear closet items before demo",
        currentRoom: "Master Bath",
        jobState: dedupState,
      }),
    });
    const resDedup = await (await POST(reqDedup)).json();
    dedupState = resDedup.updatedState;
  }
  assert.strictEqual(dedupState.chambers[0].homeownerObligations.length, 1);
  console.log("✓ Homeowner obligations properly deduplicated across repeated turns.");

  // Test 14: Live Scope Route - Moisture reading deduplication
  console.log("\n[Test 14] Live Scope API - Moisture reading deduplication...");
  let readingState = createBaseJob();
  for (let i = 0; i < 2; i++) {
    const reqMR = new NextRequest("http://localhost:3000/api/gemini/live-scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        technicianSpeech: "drywall probe reads 38.4% WME",
        currentRoom: "Master Bath",
        jobState: readingState,
      }),
    });
    const resMR = await (await POST(reqMR)).json();
    readingState = resMR.updatedState;
  }
  assert.strictEqual(readingState.chambers[0].moistureReadings.length, 1);
  console.log("✓ Duplicate moisture readings prevented from accumulating.");

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
