/**
 * Alert Disaster Restoration — Server-Side Antigravity 2.0 Turn Handler
 * Executes multi-turn scoping turns via ai.interactions.create with state persistence.
 */

import { GoogleGenAI } from '@google/genai';
import { ScopingTurnResponse } from '../types/estimator';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface ScopingTurnInput {
  agentId: string;
  previousInteractionId?: string;
  technicianSpeech: string;
  photoBase64?: string;
  currentRoom: string;
  buildYear: number;
}

export async function executeAntigravityScopingTurn(params: ScopingTurnInput): Promise<{
  interactionId: string;
  environmentId?: string;
  output: string;
  parsedData: ScopingTurnResponse | null;
  steps: any[];
}> {
  let promptText = `Technician Field Dictation in "${params.currentRoom}": "${params.technicianSpeech}".
Property Build Year: ${params.buildYear}.

Instructions:
1. Extract any rooms, moisture readings, damage observations, and scope items.
2. If demolition, flood cuts, flooring demo, or cabinetry detachment are detected, upsert items into /workspace/current_scope.json and execute /workspace/pricing_engine.py.
3. Update /workspace/job_state.json with current chamber data, psychrometric evaluations, and California compliance citations.
4. If verify_room_scope is requested, provide a crisp, rapid 1-2 sentence clinical verification in an authoritative dispatch tone (e.g. "Master Bath verified: 28 linear feet of 2-ft cuts, detachment waivers logged, 2 centrifugal air movers deployed."). Do not use conversational filler or pleasantries ("sure", "got it", "hello"). Clearly state linear feet, flood cut heights, and equipment counts. If complete_walkthrough is requested, compile proposals. Otherwise keep spokenResponse strictly silent ("").
5. Output the structured state strictly conforming to the AGENTS.md Section 7 JSON schema.`;

  if (params.photoBase64) {
    promptText += `

MULTIMODAL INSPECTION PHOTO ATTACHED:
Perform forensic computer vision analysis on the attached image:
- Moisture Meter LCD: If the photo captures a moisture meter display (e.g. Protimeter, Tramex, Delmhorst), extract the exact numeric % WME (or detect pinned scale 99.9% WME).
- FLIR Thermal Imaging: If the photo is a thermal boundary screen, read the thermal delta (°F) and trace evaporative cooling perimeter lines.
- Substrate / Damage: Identify affected drywall, wood framing, baseboards, or subflooring.
Log all parsed readings into log_moisture_reading and log_damage_observation.`;
  }

  const contentParts: any[] = [
    {
      type: 'text',
      text: promptText,
    },
  ];

  // Attach camera snapshot (meter reading or damage photo) if present
  if (params.photoBase64) {
    contentParts.push({
      type: 'image',
      data: params.photoBase64,
      mime_type: 'image/jpeg',
    });
  }

  const interaction = await (ai as any).interactions.create(
    {
      agent: params.agentId,
      previous_interaction_id: params.previousInteractionId,
      input: contentParts,
      environment: 'remote',
    },
    { timeout: 300000 } // 5 minute execution window for code execution
  );

  // Combine model output across steps (preserving intermediate drafts & code execution)
  let fullOutput = '';
  for (const step of interaction.steps || []) {
    if (step.type === 'model_output') {
      const textContent = step.content?.find((c: any) => c.type === 'text');
      if (textContent?.text) {
        fullOutput += textContent.text;
      }
    }
  }

  // Safe JSON extraction from code execution / model response
  let parsedPayload: ScopingTurnResponse | null = null;
  const jsonMatch =
    fullOutput.match(/```json\s*([\s\S]*?)\s*```/) ||
    fullOutput.match(/([\{\[][\s\S]*[\}\]])/);

  if (jsonMatch) {
    try {
      parsedPayload = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('JSON parsing requires cleanup:', e);
    }
  }

  return {
    interactionId: interaction.id,
    environmentId: interaction.environment_id,
    output: fullOutput,
    parsedData: parsedPayload,
    steps: interaction.steps || [], // Exposes reasoning and code execution logs for UI proof-of-work
  };
}
