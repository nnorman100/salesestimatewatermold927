/**
 * Alert Disaster Restoration — Antigravity 2.0 Agent Provisioning
 * Deploys the custom copilot agent with mounted rules, skills, and pricing engine.
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function createRestorationAntigravityAgent() {
  const agentsMdContent = fs.readFileSync(path.join(process.cwd(), '.agents', 'AGENTS.md'), 'utf-8');
  const californiaSkillContent = fs.readFileSync(
    path.join(process.cwd(), '.agents', 'skills', 'california-compliance', 'SKILL.md'),
    'utf-8'
  );
  const pricingEngineContent = fs.readFileSync(path.join(process.cwd(), 'pricing_engine.py'), 'utf-8');
  const seedJobStateContent = fs.readFileSync(path.join(process.cwd(), 'job_state.example.json'), 'utf-8');
  const proposalTemplateContent = fs.readFileSync(path.join(process.cwd(), 'proposal_template.html'), 'utf-8');
  const compileProposalContent = fs.readFileSync(path.join(process.cwd(), 'compile_proposal.py'), 'utf-8');

  const agent = await (ai as any).agents.create({
    id: 'alert-restoration-copilot-v2',
    base_agent: 'antigravity-preview-09-2026',
    system_instruction: `You are the master restoration forensic engineer and scoping copilot for Alert Disaster Restoration.
You operate inside a sandboxed Linux environment to parse technician dictation/photos, execute deterministic pricing code, verify California statutory building compliance, and compile professional 2-page proposals.

STRICT OPERATIONAL RULES:
1. NEVER calculate dollar amounts or square foot totals in freehand text. Always write the current scope to /workspace/current_scope.json and execute /workspace/pricing_engine.py to compute totals and snap to flat fee tiers ($1,499, $1,999, $2,499, $2,799).
2. For buildings built before 1978 (< 1978), strictly enforce Cal/OSHA Title 8 CCR § 1529 (Asbestos) and § 1532.1 (Lead) testing mandates in all reports.
3. Keep spoken audio summaries silent during routine dictation (spokenResponse: ""). Speak ONLY when verify_room_scope or complete_walkthrough is called. Spoken output must adopt a crisp, clinical dispatch tone with authoritative enunciation of numbers, linear feet (LF), cut heights, moisture % WME, and drying equipment counts—zero conversational filler or pleasantries.
4. Update /workspace/job_state.json after every turn to ensure zero data loss. An initial seed file is pre-mounted at /workspace/job_state.json.
5. When complete_walkthrough is triggered, compile /workspace/proposal.html using /workspace/proposal_template.html and render /workspace/proposal.pdf (or run python /workspace/compile_proposal.py).
6. Setup note: If weasyprint is not installed in the sandbox, run 'pip install weasyprint'.`,
    base_environment: {
      type: 'remote',
      sources: [
        // 1. Mount System Instructions
        {
          type: 'inline',
          target: '.agents/AGENTS.md',
          content: agentsMdContent,
        },
        // 2. Mount California Statutory Compliance Skill
        {
          type: 'inline',
          target: '.agents/skills/california-compliance/SKILL.md',
          content: californiaSkillContent,
        },
        // 3. Mount Deterministic Python Pricing Engine
        {
          type: 'inline',
          target: '/workspace/pricing_engine.py',
          content: pricingEngineContent,
        },
        // 4. Mount Initial Seed State (Prevents FileNotFoundError on Turn 1)
        {
          type: 'inline',
          target: '/workspace/job_state.json',
          content: seedJobStateContent,
        },
        // 5. Mount Proposal Letterhead HTML Template (Fixed 2-Page Pagination)
        {
          type: 'inline',
          target: '/workspace/proposal_template.html',
          content: proposalTemplateContent,
        },
        // 6. Mount Proposal Compiler Script
        {
          type: 'inline',
          target: '/workspace/compile_proposal.py',
          content: compileProposalContent,
        },
      ],
    },
  });

  console.log(`Antigravity Restoration Agent Created: ${agent.id}`);
  return agent;
}

if (require.main === module) {
  createRestorationAntigravityAgent().catch(console.error);
}

