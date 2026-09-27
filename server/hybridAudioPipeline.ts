/**
 * Alert Disaster Restoration — Hybrid Audio Pipeline
 *
 * Implements the architecture specified in AGENTS.md:
 * [Mobile Phone Mic]
 *        │
 *        ▼ (Speech Recognition: gemini-3.5-transcribe or Web Speech)
 * [Text Dictation + Evidence Photos]
 *        │
 *        ▼ (Reasoning & Scoping: Antigravity 2.0 ai.interactions.create)
 * [Antigravity Sandbox Engine]
 *        │ (Executes pricing_engine.py & updates /workspace/job_state.json)
 *        ▼ (Synthesizes spoken room summary ONLY upon verify_room_scope / complete_walkthrough)
 * [gemini-3.8-flash-lite-tts]
 *        │
 *        ▼ (Audio Stream to Technician Headset / Earbuds)
 * [Phone Headset / Speaker]
 */

import { GoogleGenAI } from '@google/genai';
import { executeAntigravityScopingTurn, ScopingTurnInput } from './handleScopingInteraction';
import { ScopingTurnResponse } from '../types/estimator';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI(apiKey ? { apiKey } : {});

export interface HybridPipelineInput {
  agentId: string;
  previousInteractionId?: string;
  audioBase64?: string; // Raw audio from phone mic if server-transcribing
  transcribedText?: string; // Pre-transcribed dictation from Web Speech API
  photoBase64?: string; // Moisture meter LCD, FLIR thermal, or demolition photo
  currentRoom: string;
  buildYear: number;
}

export interface HybridPipelineOutput {
  transcription: string;
  interactionId: string;
  environmentId?: string;
  parsedData: ScopingTurnResponse | null;
  spokenResponse: string;
  ttsAudioBase64?: string | null;
  steps: any[];
}

/**
 * Transcribes audio chunk using Gemini Speech Recognition
 */
export async function transcribeAudioChunk(audioBase64: string): Promise<string> {
  try {
    const response = await (ai as any).models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/wav',
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe this restoration field technician speech verbatim. Do not omit numbers, linear feet, or moisture percentages.',
            },
          ],
        },
      ],
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.warn('Fallback: Gemini transcribe model unavailable, using direct text payload:', error);
    return '';
  }
}

/**
 * Synthesizes voice confirmation using gemini-3.8-flash-lite-tts
 */
export async function synthesizeSpokenConfirmation(text: string): Promise<string | null> {
  if (!text || text.trim() === '') {
    return null;
  }

  const voiceName = process.env.LIVE_VOICE || 'Charon';

  try {
    const response = await (ai as any).models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Produce a crisp, forensic restoration verification in an authoritative, clinical tone. Speak numbers, measurements, and units with clean enunciation: "${text}"`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'audio/mp3',
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
    });

    const candidates = response.candidates || [];
    for (const c of candidates) {
      for (const part of c.content?.parts || []) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn('TTS Synthesis error (client can fall back to browser Web Speech TTS):', error);
    return null;
  }
}

/**
 * Executes a full turn through the Hybrid Audio Pipeline
 */
export async function processScopingTurnThroughHybridPipeline(
  input: HybridPipelineInput
): Promise<HybridPipelineOutput> {
  // Step 1: Resolve technician speech
  let speechText = input.transcribedText || '';
  if (!speechText && input.audioBase64) {
    speechText = await transcribeAudioChunk(input.audioBase64);
  }

  // Step 2: Pass text dictation + photos to Antigravity 2.0 Scoping Agent
  const scopingParams: ScopingTurnInput = {
    agentId: input.agentId,
    previousInteractionId: input.previousInteractionId,
    technicianSpeech: speechText,
    photoBase64: input.photoBase64,
    currentRoom: input.currentRoom,
    buildYear: input.buildYear,
  };

  const scopingResult = await executeAntigravityScopingTurn(scopingParams);

  // Step 3: Check spoken response
  // AGENTS.md Protocol: SILENT during routine scoping observations (spokenResponse: "").
  // Only synthesize audio when verify_room_scope or complete_walkthrough returns text.
  const spokenText = scopingResult.parsedData?.spokenResponse || '';
  let ttsAudio: string | null = null;

  if (spokenText.trim().length > 0) {
    ttsAudio = await synthesizeSpokenConfirmation(spokenText);
  }

  return {
    transcription: speechText,
    interactionId: scopingResult.interactionId,
    environmentId: scopingResult.environmentId,
    parsedData: scopingResult.parsedData,
    spokenResponse: spokenText,
    ttsAudioBase64: ttsAudio,
    steps: scopingResult.steps,
  };
}
