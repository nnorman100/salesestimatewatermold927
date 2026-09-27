import { NextRequest, NextResponse } from "next/server";
import { calculatePricingFromJob } from "@/services/pricingEngine";
import { JobState, ChamberScope } from "@/types/estimator";
import { executeAntigravityScopingTurn } from "@/server/handleScopingInteraction";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { technicianSpeech, photoBase64, currentRoom, buildYear, jobState, agentId, previousInteractionId } = body;

    let updated: JobState = jobState ? JSON.parse(JSON.stringify(jobState)) : null;
    let spokenResponse = "";
    const steps: any[] = [];
    let interactionId: string | undefined = undefined;
    let environmentId: string | undefined = undefined;

    if (!updated) {
      return NextResponse.json({ error: "No job state provided" }, { status: 400 });
    }

    const speechLower = (technicianSpeech || "").toLowerCase();

    // 1. Locate current chamber
    let chamber = updated.chambers.find((c: ChamberScope) => c.name.toLowerCase() === (currentRoom || "").toLowerCase());
    if (!chamber && updated.chambers.length > 0) {
      chamber = updated.chambers[0];
    }

    // 2. Multimodal Photo Handling: forward to Antigravity scoping turn if photo attached
    if (photoBase64) {
      try {
        const resolvedAgentId = agentId || process.env.ANTIGRAVITY_AGENT_ID || "alert-disaster-copilot";
        const result = await executeAntigravityScopingTurn({
          agentId: resolvedAgentId,
          previousInteractionId: previousInteractionId,
          technicianSpeech: technicianSpeech || "",
          photoBase64: photoBase64,
          currentRoom: chamber?.name || currentRoom || "Loss Area",
          buildYear: buildYear || updated.property?.buildYear || 1985,
        });

        interactionId = result.interactionId;
        environmentId = result.environmentId;

        if (result.steps && result.steps.length > 0) {
          steps.push(...result.steps);
        } else {
          steps.push({
            type: "code_execution_call",
            tool: "multimodal_photo_analysis",
            content: `Multimodal inspection photo analyzed for ${chamber?.name || currentRoom}. Interaction: ${result.interactionId}`,
          });
        }

        if (result.parsedData) {
          const parsed = result.parsedData;
          if (parsed.toolCalls && Array.isArray(parsed.toolCalls)) {
            for (const call of parsed.toolCalls) {
              if (call.tool === "log_moisture_reading" && call.args && chamber) {
                chamber.moistureReadings.push({
                  location: call.args.location || "Photo Inspection Point",
                  substrate: call.args.substrate || "Drywall / Substrate",
                  readingWME: typeof call.args.readingWME === "number" ? call.args.readingWME : 99.9,
                  classification: call.args.classification || "Saturated",
                  thermalDeltaF: call.args.thermalDeltaF !== undefined ? call.args.thermalDeltaF : undefined,
                  notes: call.args.notes || "Recorded from multimodal photo analysis",
                });
              } else if (call.tool === "log_damage_observation" && call.args && chamber) {
                if (call.args.linearFeet && call.args.heightFt) {
                  chamber.demolition.floodCuts = {
                    heightFt: call.args.heightFt as 2 | 4,
                    linearFeet: call.args.linearFeet,
                    locations: call.args.locations || "Identified in inspection photo",
                  };
                }
              } else if (call.tool === "add_room" && call.args) {
                const roomName = call.args.name || call.args.roomName;
                if (roomName && !updated.chambers.some((c) => c.name.toLowerCase() === roomName.toLowerCase())) {
                  const newChamber: ChamberScope = {
                    roomId: `room_${Date.now()}`,
                    name: roomName,
                    waterCategory: call.args.waterCategory || "Category 2",
                    waterClass: call.args.waterClass || "Class 2",
                    moistureReadings: [],
                    demolition: {},
                    cabinetry: [],
                    homeownerObligations: [],
                    equipment: [],
                    verified: false,
                  };
                  updated.chambers.push(newChamber);
                  chamber = newChamber;
                }
              } else if (call.tool === "verify_room_scope" && chamber) {
                chamber.verified = true;
              } else if (call.tool === "complete_walkthrough") {
                updated.status = "COMPLETED";
              }
            }
          }

          if (parsed.californiaCompliance && updated.property) {
            updated.property.isPre1978 = parsed.californiaCompliance.isPre1978;
            updated.property.asbestosLeadTestingMandated = parsed.californiaCompliance.testingMandated;
            if (parsed.californiaCompliance.statutoryCitations) {
              updated.property.statutoryCitations = parsed.californiaCompliance.statutoryCitations;
            }
          }

          if (parsed.spokenResponse) {
            spokenResponse = parsed.spokenResponse;
          }
        }
      } catch (agentErr: any) {
        console.warn("executeAntigravityScopingTurn error, continuing with fallback parsing:", agentErr?.message || agentErr);
        steps.push({
          type: "code_execution_call",
          tool: "multimodal_photo_analysis_fallback",
          content: "Multimodal photo received (offline/fallback mode).",
        });
      }
    }

    // 3. Parse flood cuts (e.g. "28 LF 2-ft flood cut", "16 linear feet of 2-ft cut")
    const floodCutMatch = speechLower.match(/(\d+)\s*(?:lf|linear feet).*?(2|4)[\s-]*ft/);
    if (floodCutMatch && chamber) {
      const lf = parseInt(floodCutMatch[1]);
      const ht = parseInt(floodCutMatch[2]) as 2 | 4;
      chamber.demolition.floodCuts = {
        heightFt: ht,
        linearFeet: lf,
        locations: chamber.demolition.floodCuts?.locations || "South and West perimeter walls",
      };
      steps.push({
        type: "code_execution_call",
        tool: "log_damage_observation",
        content: `Extracted ${lf} LF of ${ht}-ft flood cuts in ${chamber.name}`,
      });
    }

    // 4. Parse baseboards (e.g. "28 LF baseboard", "pull baseboards")
    const baseboardMatch = speechLower.match(/(\d+)\s*(?:lf|linear feet).*?baseboard/);
    if (baseboardMatch && chamber) {
      const lf = parseInt(baseboardMatch[1]);
      chamber.demolition.baseboards = {
        linearFeet: lf,
        action: "Baseboard removal and disposal",
      };
    }

    // 5. Parse flooring demolition (e.g. "50 SF ceramic tile", "85 square feet carpet", "50 SF vinyl")
    const flooringMatch =
      speechLower.match(/(\d+)\s*(?:sf|square feet).*?(tile|carpet|hardwood|vinyl|linoleum)/) ||
      speechLower.match(/(tile|carpet|hardwood|vinyl|linoleum).*?(\d+)\s*(?:sf|square feet)/);
    if (flooringMatch && chamber) {
      const sf = parseInt(flooringMatch[1] && !isNaN(parseInt(flooringMatch[1])) ? flooringMatch[1] : flooringMatch[2]);
      const substrateRaw = (flooringMatch[2] && isNaN(parseInt(flooringMatch[2])) ? flooringMatch[2] : flooringMatch[1]).toLowerCase();
      let substrate = "Ceramic tile demo to slab";
      if (substrateRaw.includes("carpet")) substrate = "Carpet and wet pad extraction and pull";
      else if (substrateRaw.includes("vinyl") || substrateRaw.includes("linoleum")) substrate = "Vinyl flooring demolition";
      else if (substrateRaw.includes("hardwood")) substrate = "Engineered hardwood demo";

      chamber.demolition.flooring = {
        squareFeet: sf,
        substrate: substrate,
        action: `${substrate}, ${sf} SF`,
      };
      steps.push({
        type: "code_execution_call",
        tool: "log_damage_observation",
        content: `Extracted ${sf} SF of ${substrate} in ${chamber.name}`,
      });
    }

    // 6. Parse moisture reading (e.g. "38.4% WME", "pinned at 99.9%")
    const moistureMatch = speechLower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:wme)?/) || (speechLower.includes("pinned") ? ["99.9", "99.9"] : null);
    if (moistureMatch && chamber) {
      const reading = parseFloat(moistureMatch[1]);
      const baseline = updated.psychrometricBaseline?.drywallBaselineWME || 9.2;
      let classification: "Dry" | "At Risk" | "Wet" | "Saturated" = "Dry";
      if (reading > baseline + 15.0 || reading >= 99.0) classification = "Saturated";
      else if (reading > baseline + 4.0) classification = "Wet";
      else if (reading > baseline) classification = "At Risk";

      // Extract thermal delta if explicitly dictated (e.g. "-4.5 degrees delta", "delta of -4.8"), otherwise undefined
      let thermalDelta: number | undefined = undefined;
      const thermalMatch = speechLower.match(/delta.*?(-?\d+(?:\.\d+)?)/);
      if (thermalMatch) {
        thermalDelta = parseFloat(thermalMatch[1]);
      }

      // Avoid duplicate reading insertion if already recorded
      const alreadyLogged = chamber.moistureReadings.some(
        (r) => Math.abs(r.readingWME - reading) < 0.05
      );
      if (!alreadyLogged) {
        chamber.moistureReadings.push({
          location: speechLower.includes("west") ? "West wall vanity cavity" : "Drywall perimeter probe",
          substrate: "Drywall / Wood Stud",
          readingWME: reading,
          classification: classification,
          thermalDeltaF: thermalDelta,
          notes: "Moisture reading recorded from field technician dictation",
        });
      }
    }

    // 7. Parse equipment deployment (e.g. "deploy 1 LGR dehumidifier and 2 air movers for 3 days")
    const lgrMatch = speechLower.match(/(\d+)\s*(?:lgr|dehumidifier)/);
    const airMoverMatch = speechLower.match(/(\d+)\s*(?:air mover|centrifugal|fan)/);
    const daysMatch = speechLower.match(/(\d+)\s*(?:day|days)/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 3;

    if (chamber && (lgrMatch || airMoverMatch)) {
      if (lgrMatch) {
        const count = parseInt(lgrMatch[1]);
        const existing = chamber.equipment.find((e) => e.type.includes("LGR") || e.type.includes("Dehumidifier"));
        if (existing) {
          existing.count = count;
          existing.days = days;
        } else {
          chamber.equipment.push({
            type: "Low Grain Refrigerant (LGR) Dehumidifier",
            count: count,
            days: days,
          });
        }
      }
      if (airMoverMatch) {
        const count = parseInt(airMoverMatch[1]);
        const existing = chamber.equipment.find((e) => e.type.includes("Air Mover"));
        if (existing) {
          existing.count = count;
          existing.days = days;
        } else {
          chamber.equipment.push({
            type: "Centrifugal Air Mover",
            count: count,
            days: days,
          });
        }
      }
    }

    // 8. Parse cabinetry detach
    if ((speechLower.includes("vanity") || speechLower.includes("cabinet")) && chamber) {
      const exists = chamber.cabinetry.some((c) => c.item.toLowerCase().includes("vanity"));
      if (!exists) {
        chamber.cabinetry.push({
          item: "Double Vanity Cabinet with Stone Countertop",
          action: "Detach & Reset",
          waiver: "Granite countertop detachment waiver applies. Potential for hairline tile fracture or substrate breakage.",
        });
      }
    }

    // 9. Parse homeowner obligation
    if (speechLower.includes("homeowner") && chamber) {
      const obligation = "*The homeowner to remove all vanity toiletries and personal clothing from closets prior to demolition.*";
      if (!chamber.homeownerObligations.includes(obligation)) {
        chamber.homeownerObligations.push(obligation);
      }
    }

    // 10. Check if room verification requested
    if ((speechLower.includes("verify") || speechLower.includes("confirm room")) && chamber) {
      chamber.verified = true;
      const cuts = chamber.demolition.floodCuts?.linearFeet;
      const cutSummary = cuts
        ? `${cuts} LF of ${chamber.demolition.floodCuts?.heightFt || 2}-ft flood cuts`
        : "no structural cuts";
      spokenResponse = `${chamber.name} verified: ${cutSummary} with baseboards removed, detachment waivers logged, and structural drying equipment deployed.`;
      chamber.verificationSummary = spokenResponse;
    }

    // 9. Re-calculate deterministic financial tier via authoritative pricing engine
    const pricing = calculatePricingFromJob(updated);
    updated.financialTier = pricing.financialTier;
    updated.scopeItems = pricing.lineItems;

    return NextResponse.json({
      updatedState: updated,
      spokenResponse: spokenResponse,
      steps: steps,
      interactionId: interactionId,
      environmentId: environmentId,
    });
  } catch (error: any) {
    console.error("Live-scope route error:", error);
    return NextResponse.json({ error: error.message || "Failed processing turn" }, { status: 500 });
  }
}
