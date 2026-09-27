/**
 * Alert Disaster Restoration — Remote Sandbox Proposal PDF Compilation
 * Instructs the Antigravity agent to finalize job_state.json, render proposal.html,
 * and compile proposal.pdf inside the remote container.
 */

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function compileProposalPdf(agentId: string, interactionId: string) {
  const result = await (ai as any).interactions.create(
    {
      agent: agentId,
      previous_interaction_id: interactionId,
      input: `Execute proposal compilation for Alert Disaster Restoration:
1. Ensure /workspace/job_state.json contains all chamber scopes, readings, and forensic plumbing diagnostics.
2. Execute /workspace/compile_proposal.py (or inject scope rows and disclosures into /workspace/proposal_template.html to output /workspace/proposal.html).
3. Compile /workspace/proposal.pdf ensuring strict 2-page pagination:
   - Page 1: Corporate letterhead, property metadata, California Cal/OSHA & HSC disclosures, forensic plumbing diagnostics, chamber scope table, and flat-fee tier total.
   - Page 2: Terms & Conditions, Insurance Assignment of Benefits (AOB), collateral breakage notices, and property owner signature block.
4. Set spokenResponse to: "Walkthrough complete across all chambers. Alert Disaster Restoration proposal and statutory disclosures compiled."
5. Confirm when /workspace/proposal.html and /workspace/proposal.pdf are compiled.`,
      environment: 'remote',
    },
    { timeout: 300000 }
  );

  return result;
}
