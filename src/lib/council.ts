import { Type } from '@google/genai';
import { genContent, hasGemini, MODEL, parseJson } from './gemini';
import { DEPARTMENTS, SEVERITY_WEIGHT } from './departments';
import type { Issue } from './types';

// ---------------------------------------------------------------------------
// The AI Council — a multi-agent negotiation over an issue's priority and SLA.
//
// Three Gemini agents debate in sequence, each seeing the previous arguments:
//   1. Citizen Advocate  — argues for maximum urgency from the safety angle.
//   2. Resource Allocator — argues for realistic timelines from live workload.
//   3. Arbitrator         — weighs both and hands down a binding verdict.
//
// The debate is streamed turn-by-turn to the UI, and the verdict is applied to
// the issue with a full audit trail. Degrades to a deterministic debate when
// Gemini is unavailable, so the feature always works.
// ---------------------------------------------------------------------------

export type CouncilRole = 'advocate' | 'allocator' | 'arbitrator';

export interface CouncilTurn {
  role: CouncilRole;
  name: string;
  /** lucide-react icon name rendered on the client. */
  icon: string;
  /** One-line position statement. */
  stance: string;
  /** The 2-4 sentence argument. */
  argument: string;
  proposedPriority: number;
  proposedSlaHours: number;
}

export interface CouncilVerdict {
  finalPriority: number;
  finalSlaHours: number;
  /** The arbitrator's 1-2 sentence ruling. */
  ruling: string;
  keyFactors: string[];
  agreement: 'consensus' | 'compromise' | 'advocate-favoured' | 'allocator-favoured';
}

export type CouncilEvent =
  | { type: 'turn'; turn: CouncilTurn }
  | { type: 'verdict'; verdict: CouncilVerdict; previousPriority: number; previousSlaHours: number }
  | { type: 'error'; message: string };

/** Live municipal workload snapshot the Resource Allocator argues from. */
export interface WorkloadContext {
  departmentOpen: number;
  departmentEscalated: number;
  cityOpen: number;
  cityCritical: number;
}

const PERSONA: Record<CouncilRole, { name: string; icon: string }> = {
  advocate: { name: 'Citizen Advocate', icon: 'Megaphone' },
  allocator: { name: 'Resource Allocator', icon: 'Wallet' },
  arbitrator: { name: 'Arbitrator', icon: 'Scale' },
};

const TURN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stance: { type: Type.STRING },
    argument: { type: Type.STRING },
    proposedPriority: { type: Type.INTEGER },
    proposedSlaHours: { type: Type.INTEGER },
  },
  required: ['stance', 'argument', 'proposedPriority', 'proposedSlaHours'],
};

const VERDICT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stance: { type: Type.STRING },
    argument: { type: Type.STRING },
    finalPriority: { type: Type.INTEGER },
    finalSlaHours: { type: Type.INTEGER },
    ruling: { type: Type.STRING },
    keyFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
    agreement: {
      type: Type.STRING,
      enum: ['consensus', 'compromise', 'advocate-favoured', 'allocator-favoured'],
    },
  },
  required: ['stance', 'argument', 'finalPriority', 'finalSlaHours', 'ruling', 'keyFactors', 'agreement'],
};

function issueBrief(issue: Issue, workload: WorkloadContext): string {
  return (
    `CASE FILE ${issue.ref ?? issue.id}\n` +
    `Issue: ${issue.title}\n` +
    `Description: ${issue.description}\n` +
    `Category: ${issue.category} · Severity: ${issue.severity}\n` +
    `Location: ${issue.location}\n` +
    `Safety risk: ${issue.safetyRisk || 'none noted'}\n` +
    `Community verifications: ${issue.verifications}\n` +
    `Current priority: ${issue.priority}/100 · Current SLA: ${issue.slaHours}h\n` +
    `Status: ${issue.status}${issue.escalated ? ' (already escalated — SLA breached)' : ''}\n` +
    `Responsible department: ${issue.department}\n\n` +
    `LIVE CITY WORKLOAD\n` +
    `Open cases in this department: ${workload.departmentOpen} (${workload.departmentEscalated} escalated)\n` +
    `Open cases city-wide: ${workload.cityOpen} (${workload.cityCritical} critical)`
  );
}

function clampPriority(p: number, fb: number): number {
  return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : fb;
}
function clampSla(h: number, deptSla: number): number {
  const fb = deptSla;
  if (!Number.isFinite(h)) return fb;
  // The council may tighten to 25% or relax to 200% of the department norm.
  return Math.max(2, Math.min(720, Math.max(Math.round(deptSla / 4), Math.min(deptSla * 2, Math.round(h)))));
}

async function geminiTurn(
  role: CouncilRole,
  system: string,
  brief: string,
  transcript: string,
  deptSla: number,
  fallback: CouncilTurn,
): Promise<CouncilTurn> {
  try {
    const res = await genContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${brief}\n\n${transcript ? `DEBATE SO FAR\n${transcript}\n\n` : ''}Give your position now. proposedPriority is 0-100; proposedSlaHours is the resolution window in hours. stance is one punchy line; argument is 2-4 sentences, concrete and grounded in the case file.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseSchema: TURN_SCHEMA,
        temperature: 0.6,
      },
    });
    const v = parseJson<Partial<CouncilTurn>>(res.text ?? '', {});
    return {
      ...fallback,
      stance: v.stance?.trim() || fallback.stance,
      argument: v.argument?.trim() || fallback.argument,
      proposedPriority: clampPriority(v.proposedPriority as number, fallback.proposedPriority),
      proposedSlaHours: clampSla(v.proposedSlaHours as number, deptSla),
    };
  } catch (err) {
    console.error(`council ${role} turn failed, using heuristic`, err);
    return fallback;
  }
}

// ----- deterministic fallback debate (no API key / errors) --------------------

function heuristicAdvocate(issue: Issue): CouncilTurn {
  const base = SEVERITY_WEIGHT[issue.severity];
  return {
    role: 'advocate',
    ...PERSONA.advocate,
    stance: 'Residents cannot wait — treat this as urgent.',
    argument: `${issue.verifications} neighbour(s) have corroborated this ${issue.severity.toLowerCase()}-severity ${issue.category.toLowerCase()} report${issue.safetyRisk ? `, and it carries a live safety concern: ${issue.safetyRisk}` : ''}. Every hour of delay compounds the risk and erodes public trust.`,
    proposedPriority: Math.min(100, base + 15),
    proposedSlaHours: Math.max(2, Math.round(issue.slaHours * 0.5)),
  };
}

function heuristicAllocator(issue: Issue, workload: WorkloadContext): CouncilTurn {
  const loaded = workload.departmentOpen > 5;
  return {
    role: 'allocator',
    ...PERSONA.allocator,
    stance: loaded
      ? 'Crews are stretched — promise what we can deliver.'
      : 'Capacity exists — commit to the standard window.',
    argument: `${issue.department} currently has ${workload.departmentOpen} open case(s) (${workload.departmentEscalated} escalated) against ${workload.cityOpen} city-wide. Over-promising breaks SLAs and erodes trust more than honest timelines do; the department norm of ${issue.slaHours}h ${loaded ? 'is already ambitious at current load' : 'is comfortably achievable'}.`,
    proposedPriority: Math.max(0, issue.priority - (loaded ? 8 : 0)),
    proposedSlaHours: loaded ? Math.round(issue.slaHours * 1.25) : issue.slaHours,
  };
}

function heuristicVerdict(
  issue: Issue,
  advocate: CouncilTurn,
  allocator: CouncilTurn,
): CouncilVerdict {
  const finalPriority = Math.round((advocate.proposedPriority + allocator.proposedPriority) / 2);
  const finalSlaHours = Math.round((advocate.proposedSlaHours + allocator.proposedSlaHours) / 2);
  return {
    finalPriority,
    finalSlaHours,
    ruling: `Balancing the documented safety case against real crew capacity, the council sets priority ${finalPriority}/100 with a ${finalSlaHours}h resolution window.`,
    keyFactors: [
      `${issue.verifications} community verification(s)`,
      issue.safetyRisk ? 'Active safety risk' : 'No immediate safety risk',
      'Current department workload',
    ],
    agreement: 'compromise',
  };
}

// ----- the debate loop --------------------------------------------------------

export async function* runCouncil(
  issue: Issue,
  workload: WorkloadContext,
): AsyncGenerator<CouncilEvent> {
  const dept = DEPARTMENTS[issue.category] ?? DEPARTMENTS.Other;
  const brief = issueBrief(issue, workload);
  const useAI = hasGemini();

  // 1) Citizen Advocate
  let advocate = heuristicAdvocate(issue);
  if (useAI) {
    advocate = await geminiTurn(
      'advocate',
      `You are the Citizen Advocate on a municipal AI Council. You represent the residents affected by a civic issue. Argue persuasively for the highest justified urgency: focus on safety risk, number of people affected, community verifications and dignity of the neighbourhood. You may propose a tighter SLA than the department norm. Never invent facts not in the case file.`,
      brief,
      '',
      dept.slaHours,
      advocate,
    );
  }
  yield { type: 'turn', turn: advocate };

  // 2) Resource Allocator (sees the advocate's argument)
  let allocator = heuristicAllocator(issue, workload);
  if (useAI) {
    allocator = await geminiTurn(
      'allocator',
      `You are the Resource Allocator on a municipal AI Council. You manage crews, trucks and budgets. Respond to the Citizen Advocate with realistic capacity math: current open caseload, escalations, and what timeline the department can honestly commit to. You are not heartless — you optimise for promises the city can keep. Never invent facts not in the case file.`,
      brief,
      `CITIZEN ADVOCATE (priority ${advocate.proposedPriority}/100, SLA ${advocate.proposedSlaHours}h): ${advocate.argument}`,
      dept.slaHours,
      allocator,
    );
  }
  yield { type: 'turn', turn: allocator };

  // 3) Arbitrator (sees both, hands down the binding verdict)
  let verdict = heuristicVerdict(issue, advocate, allocator);
  let arbitratorTurn: CouncilTurn = {
    role: 'arbitrator',
    ...PERSONA.arbitrator,
    stance: 'Both positions have merit — the ruling balances them.',
    argument: verdict.ruling,
    proposedPriority: verdict.finalPriority,
    proposedSlaHours: verdict.finalSlaHours,
  };
  if (useAI) {
    try {
      const res = await genContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `${brief}\n\nDEBATE\n` +
                  `CITIZEN ADVOCATE (priority ${advocate.proposedPriority}/100, SLA ${advocate.proposedSlaHours}h): ${advocate.argument}\n` +
                  `RESOURCE ALLOCATOR (priority ${allocator.proposedPriority}/100, SLA ${allocator.proposedSlaHours}h): ${allocator.argument}\n\n` +
                  `Hand down your binding verdict. finalPriority 0-100, finalSlaHours in hours, ruling in 1-2 sentences, keyFactors as 2-4 short phrases, agreement reflecting whose position prevailed.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: `You are the Arbitrator of a municipal AI Council. Weigh the Citizen Advocate's urgency case against the Resource Allocator's capacity case and hand down a fair, binding verdict on the issue's priority and SLA. Be decisive and cite the deciding factors.`,
          responseMimeType: 'application/json',
          responseSchema: VERDICT_SCHEMA,
          temperature: 0.4,
        },
      });
      const v = parseJson<Partial<CouncilVerdict & CouncilTurn>>(res.text ?? '', {});
      const finalPriority = clampPriority(v.finalPriority as number, verdict.finalPriority);
      const finalSlaHours = clampSla(v.finalSlaHours as number, dept.slaHours);
      verdict = {
        finalPriority,
        finalSlaHours,
        ruling: v.ruling?.trim() || verdict.ruling,
        keyFactors:
          Array.isArray(v.keyFactors) && v.keyFactors.length
            ? v.keyFactors.slice(0, 4)
            : verdict.keyFactors,
        agreement: v.agreement ?? verdict.agreement,
      };
      arbitratorTurn = {
        ...arbitratorTurn,
        stance: v.stance?.trim() || arbitratorTurn.stance,
        argument: v.argument?.trim() || verdict.ruling,
        proposedPriority: finalPriority,
        proposedSlaHours: finalSlaHours,
      };
    } catch (err) {
      console.error('council arbitrator failed, using heuristic verdict', err);
    }
  }
  yield { type: 'turn', turn: arbitratorTurn };
  yield {
    type: 'verdict',
    verdict,
    previousPriority: issue.priority,
    previousSlaHours: issue.slaHours,
  };
}
