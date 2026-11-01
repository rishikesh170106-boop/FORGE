import { Type } from '@google/genai';
import { getIssue } from '@/lib/data';
import { DEPARTMENTS } from '@/lib/departments';
import { genContent, hasGemini, MODEL, parseJson } from '@/lib/gemini';
import type { Issue } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function slaText(hours: number): string {
  if (hours < 24) return `${hours} hours`;
  const d = Math.round(hours / 24);
  return `${d} working day${d > 1 ? 's' : ''}`;
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    body: { type: Type.STRING },
  },
  required: ['subject', 'body'],
};

/** Deterministic fallback RTI application used when Gemini is unavailable. */
function templateRti(issue: Issue, deptName: string): { subject: string; body: string } {
  const subject = `Status and accountability of unresolved ${issue.category.toLowerCase()} complaint at ${issue.location} (Ref ${issue.ref ?? issue.id})`;
  const body =
    `A civic complaint regarding "${issue.title}" at ${issue.location} was filed and routed to ${deptName} under work order ${issue.workOrderId}, with a committed service-level window of ${slaText(issue.slaHours)}. The issue remains unresolved beyond that window. Under Section 6(1) of the Right to Information Act, 2005, I request the following information:\n\n` +
    `1. The current status of work order ${issue.workOrderId} and the file notings relating to it.\n` +
    `2. The name and designation of the officer(s) responsible for acting on this complaint.\n` +
    `3. Details of funds sanctioned and utilised for redressal of this issue or this category of work in the ward.\n` +
    `4. Copies of any inspection reports prepared in respect of this complaint.\n` +
    `5. The expected date of completion of the remedial work and reasons for the delay.`;
  return { subject, body };
}

/** Deterministic fallback letter used when Gemini is unavailable or rate-limited. */
function templateLetter(issue: Issue, deptName: string): { subject: string; body: string } {
  const subject = `Request for redressal — ${issue.category} at ${issue.location} (Ref ${issue.ref ?? issue.id})`;
  const body =
    `I am writing on behalf of the residents of ${issue.location} to formally report a civic issue requiring your department's attention.\n\n` +
    `Nature of complaint: ${issue.title}. ${issue.description}\n\n` +
    `Our assessment records this as a ${issue.severity.toLowerCase()}-severity matter with a priority score of ${issue.priority}/100` +
    (issue.safetyRisk ? `, and it carries a safety concern: ${issue.safetyRisk}.` : '.') +
    ` The report has been independently corroborated by ${issue.verifications} member(s) of the community.\n\n` +
    `We request that ${deptName} acknowledge this complaint and undertake corrective action within the applicable service-level target of ${slaText(issue.slaHours)}. ` +
    `Kindly treat this as a matter of public safety and civic accountability, and share a status update upon resolution.`;
  return { subject, body };
}

export async function POST(req: Request, ctx: RouteContext<'/api/issues/[id]/letter'>) {
  const { id } = await ctx.params;
  const issue = await getIssue(id);
  if (!issue) return Response.json({ error: 'Not found' }, { status: 404 });

  // kind: 'official' (default) — complaint letter; 'rti' — formal RTI application
  // auto-drafted for issues stuck past their SLA (civic accountability weapon).
  let kind: 'official' | 'rti' = 'official';
  try {
    const body = await req.json();
    if (body?.kind === 'rti') kind = 'rti';
  } catch {
    /* no body — default kind */
  }

  const dept = DEPARTMENTS[issue.category] ?? DEPARTMENTS.Other;
  // Prefer the department the app actually routed this issue to; fall back to the
  // category map (covers categories not in the local enum) for contact/escalation.
  const deptName = issue.department || dept.name;

  let drafted = kind === 'rti' ? templateRti(issue, deptName) : templateLetter(issue, deptName);
  let aiGenerated = false;

  if (hasGemini()) {
    try {
      const facts =
        `Department: ${deptName}\n` +
        `Issue category: ${issue.category}\n` +
        `Title: ${issue.title}\n` +
        `Description: ${issue.description}\n` +
        `Location: ${issue.location}\n` +
        `Severity: ${issue.severity}; Priority score: ${issue.priority}/100\n` +
        `Safety risk: ${issue.safetyRisk || 'none noted'}\n` +
        `Community verifications: ${issue.verifications}\n` +
        `Reference: ${issue.ref ?? issue.id}; Work order: ${issue.workOrderId}\n` +
        `Requested resolution window (SLA): ${slaText(issue.slaHours)}\n` +
        `Filed: ${new Date(issue.createdAt).toLocaleDateString('en-IN')}${issue.escalated ? ' (SLA breached — auto-escalated)' : ''}`;

      const prompt =
        kind === 'rti'
          ? `You are a civic-rights facilitator drafting a formal application under Section 6(1) of the Right to Information Act, 2005 to a municipal Public Information Officer about an unresolved civic complaint. ` +
            `Write in professional, precise, civic English. Do NOT include the date, address block, salutation, or sign-off — those are added separately. ` +
            `The subject must NOT mention the RTI Act or its sections (the heading "Application under Section 6(1)..." is prefixed separately) — it should only describe the matter, e.g. "Status and accountability of unresolved pothole complaint at ...". ` +
            `Return the subject line and a body consisting of one short context paragraph followed by a numbered list (4-5 items) of specific information sought: work-order status and file notings, responsible officer's name and designation, funds sanctioned/utilised, inspection reports, and expected completion date with reasons for delay.\n\n${facts}`
          : `You are a municipal-affairs officer drafting a formal official complaint/work-order letter to a city department on behalf of residents. ` +
            `Write in professional, respectful, civic English. Do NOT include the date, address block, salutation ("Dear ..."), or sign-off — those are added separately. ` +
            `Return only the subject line and the body paragraphs (2-4 short paragraphs).\n\n${facts}\n\n` +
            `The body must clearly state the problem, its impact and urgency, and a firm but courteous request to resolve it within the SLA and provide a status update.`;

      const res = await genContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.4 },
      });
      const v = parseJson<{ subject: string; body: string }>(res.text ?? '', drafted);
      if (v.subject && v.body) {
        let subject = v.subject.trim();
        // Defensive: strip any RTI-Act preamble the model added — the formal
        // heading is prefixed deterministically during assembly below.
        if (kind === 'rti') {
          subject = subject.replace(/^application under[^—–-]*(act[,\s]*2005)?\s*[—–-]?\s*/i, '').trim() || drafted.subject;
        }
        drafted = { subject, body: v.body.trim() };
        aiGenerated = true;
      }
    } catch (err) {
      console.error('letter generation failed', err);
    }
  }

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const ref = issue.ref ?? issue.id;

  // Assemble the full, formatted document deterministically around the
  // AI-drafted subject + body so the structure is always reliable.
  const letter =
    kind === 'rti'
      ? `${today}\n\n` +
        `To,\nThe Public Information Officer\n${deptName}\n${dept.contact}\n\n` +
        `Subject: Application under Section 6(1) of the Right to Information Act, 2005 — ${drafted.subject}\n\n` +
        `Reference: ${ref} · Work Order ${issue.workOrderId}\n\n` +
        `Respected Sir/Madam,\n\n` +
        `${drafted.body}\n\n` +
        `I state that the information sought does not, to my knowledge, fall within the exemptions of Sections 8 or 9 of the Act. The prescribed application fee has been remitted. If this application concerns another public authority in part or full, kindly transfer it under Section 6(3) of the Act and inform me accordingly. Please provide the information within the statutory period of 30 days.\n\n` +
        `Yours faithfully,\n` +
        `A resident of ${issue.location}\n` +
        `(Drafted via Community Hero — Hyperlocal Problem Solver)`
      : `${today}\n\n` +
        `To,\nThe Officer-in-Charge\n${deptName}\n${dept.contact}\n\n` +
        `Subject: ${drafted.subject}\n\n` +
        `Reference: ${ref} · Work Order ${issue.workOrderId}\n\n` +
        `Respected Sir/Madam,\n\n` +
        `${drafted.body}\n\n` +
        `Should this matter remain unaddressed within the stipulated timeframe, we shall be constrained to escalate it to the ${dept.escalation}.\n\n` +
        `Yours faithfully,\n` +
        `The residents of ${issue.location}\n` +
        `(Filed via Community Hero — Hyperlocal Problem Solver)`;

  return Response.json({
    letter,
    kind,
    subject:
      kind === 'rti'
        ? `RTI application — ${drafted.subject}`
        : drafted.subject,
    to: dept.contact,
    department: deptName,
    aiGenerated,
  });
}
