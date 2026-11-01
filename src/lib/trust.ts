import type { Issue } from './types';

// ---------------------------------------------------------------------------
// Civic Trust Score — a transparent reporter-reputation signal computed live
// from the reporter's actual track record (no hidden state, no migrations):
//   · volume        — how many issues they've filed
//   · corroboration — how often neighbours verified their reports
//   · impact        — how many of their reports reached Resolved
//   · disputes      — how often the community disputed their reports
// The triage agent blends this into the final priority so proven reporters
// carry more signal and spam carries less — and the whole formula is shown
// to the citizen, not buried in a model.
// ---------------------------------------------------------------------------

export type TrustTier = 'New Reporter' | 'Reliable' | 'Trusted' | 'Community Guardian';

export interface TrustProfile {
  /** 0.05 – 0.99; 0.5 is the neutral prior for a brand-new reporter. */
  score: number;
  tier: TrustTier;
  reports: number;
  corroborated: number;
  resolved: number;
  disputed: number;
}

export function computeTrust(reporterIssues: Issue[]): TrustProfile {
  const reports = reporterIssues.length;
  const corroborated = reporterIssues.filter((i) => i.verifications >= 2).length;
  const resolved = reporterIssues.filter((i) => i.status === 'Resolved').length;
  const disputed = reporterIssues.filter((i) => (i.disputes ?? 0) >= 2).length;

  let score = 0.5; // neutral prior — every citizen starts believable
  if (reports > 0) {
    score += Math.min(0.12, reports * 0.015); // steady civic participation
    score += 0.22 * (corroborated / reports); // neighbours back their reports
    score += 0.15 * (resolved / reports); // their reports get real fixes
    score -= 0.25 * Math.min(1, (disputed / reports) * 2); // community pushback
  }
  score = Math.max(0.05, Math.min(0.99, score));

  return { score: Number(score.toFixed(2)), tier: tierOf(score), reports, corroborated, resolved, disputed };
}

function tierOf(score: number): TrustTier {
  if (score >= 0.85) return 'Community Guardian';
  if (score >= 0.7) return 'Trusted';
  if (score >= 0.55) return 'Reliable';
  return 'New Reporter';
}

/** Priority delta (±6) the triage agent applies from reporter credibility. */
export function trustPriorityDelta(trust: TrustProfile): number {
  return Math.round((trust.score - 0.5) * 12);
}
