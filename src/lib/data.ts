import * as repo from './sqlite-repo';
import type { NewIssue } from './sqlite-repo';
export type { NewIssue };
import type { Stats, Hotspot } from './analytics';
import {
  addIssue,
  advanceStatus as memAdvance,
  findNearbyDuplicates as memDuplicates,
  getIssue as memGetIssue,
  getHotspots as memHotspots,
  getLeaderboard as memLeaderboard,
  getStats as memStats,
  listIssues as memList,
  nextIssueId,
  nextWorkOrder,
  verifyIssue as memVerify,
  listWorkOrders as memListWorkOrders,
  getWorkOrder as memGetWorkOrder,
  acceptComplaint as memAcceptComplaint,
  reassignComplaint as memReassignComplaint,
  assignWorker as memAssignWorker,
  startWork as memStartWork,
  submitResolution as memSubmitResolution,
  verifyResolution as memVerifyResolution,
  citizenConfirm as memCitizenConfirm,
  listAuditLogs as memListAuditLogs,
  addAuditLog as memAddAuditLog,
  listNotifications as memListNotifications,
  addNotification as memAddNotification,
  markNotificationRead as memMarkNotificationRead,
  type IssueFilter,
} from './store';
import type {
  Citizen,
  GeoPoint,
  Issue,
  IssueCategory,
  IssueStatus,
  WorkOrder,
  AuditLog,
  AppNotification,
  AIVerificationResult,
} from './types';
import { routeComplaint } from './routing';

const useDb = () => true;
const allowMemoryFallback = () => process.env.ENABLE_MEMORY_FALLBACK === 'true';

export async function listIssues(filter: IssueFilter = {}): Promise<Issue[]> {
  if (useDb()) {
    try {
      const dbIssues = await repo.listIssues(filter);
      return dbIssues.sort(
        (a, b) =>
          Number(Boolean(b.escalated)) - Number(Boolean(a.escalated)) ||
          b.priority - a.priority ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase listIssues failed:', err);
      if (allowMemoryFallback()) {
        console.warn('ENABLE_MEMORY_FALLBACK active: serving in-memory issues.');
        return memList(filter);
      }
      throw err;
    }
  }
  return memList(filter);
}

export async function getIssue(id: string): Promise<Issue | undefined> {
  if (useDb()) {
    try {
      const issue = await repo.getIssue(id);
      if (issue) return issue;
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase getIssue failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memGetIssue(id);
}

export async function findNearbyDuplicates(
  category: IssueCategory,
  geo: GeoPoint,
  withinM = 450,
  excludeId?: string,
): Promise<{ issue: Issue; distanceM: number }[]> {
  if (useDb()) {
    try {
      return await repo.findNearbyDuplicates(category, geo, withinM, excludeId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase findNearbyDuplicates failed:', err);
      if (allowMemoryFallback()) {
        return memDuplicates(category, geo, withinM, excludeId);
      }
      throw err;
    }
  }
  return memDuplicates(category, geo, withinM, excludeId);
}

export async function createIssue(input: NewIssue): Promise<Issue> {
  // Apply deterministic municipal routing
  const routing = routeComplaint({
    category: input.category,
    confidence: input.confidence ?? 0.8,
    geo: input.geo,
    locationText: input.location,
  });

  const enrichedInput: NewIssue = {
    ...input,
    department: routing.departmentName,
    departmentId: routing.departmentId,
    wardId: routing.wardId,
    wardName: routing.wardName,
    slaHours: routing.slaHours,
    detailedStatus: 'ROUTED',
    resolutionDeadline: new Date(Date.now() + routing.slaHours * 3600_000).toISOString(),
  };

  if (useDb()) {
    try {
      return await repo.createIssue(enrichedInput);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase createIssue failed:', err);
      if (allowMemoryFallback()) {
        console.warn('ENABLE_MEMORY_FALLBACK active: saving to in-memory store.');
        return memCreate(enrichedInput);
      }
      throw err;
    }
  }
  return memCreate(enrichedInput);
}

export async function verifyIssue(id: string, userId?: string): Promise<Issue | undefined> {
  return useDb() ? repo.verifyIssue(id, userId) : memVerify(id, userId ?? 'You');
}

export async function disputeIssue(id: string): Promise<Issue | undefined> {
  if (useDb()) return repo.disputeIssue(id);
  const issue = memGetIssue(id);
  if (!issue) return undefined;
  issue.disputes = (issue.disputes ?? 0) + 1;
  issue.priority = Math.max(0, issue.priority - 3);
  issue.updatedAt = new Date().toISOString();
  if (issue.disputes === 3) {
    issue.timeline.push({
      status: issue.status,
      note: 'Community consensus: 3 neighbours disputed this report — flagged for review.',
      actor: 'Community',
      at: issue.updatedAt,
    });
  }
  return issue;
}

export async function advanceStatus(
  id: string,
  note?: string,
  actor?: string,
): Promise<Issue | undefined> {
  return useDb() ? repo.advanceStatus(id, note, actor) : memAdvance(id, note);
}

export async function setStatus(
  id: string,
  status: IssueStatus,
  note?: string,
  actor?: string,
): Promise<Issue | undefined> {
  if (useDb()) return repo.setStatus(id, status, note, actor);
  const issue = memGetIssue(id);
  if (!issue) return undefined;
  issue.status = status;
  issue.updatedAt = new Date().toISOString();
  issue.timeline.push({
    status,
    note: note ?? `Status set to ${status}.`,
    actor: actor ?? issue.department,
    at: issue.updatedAt,
  });
  return issue;
}

export async function resolveWithProof(
  id: string,
  proof: { afterImageUrl?: string; verified: boolean; confidence: number; note: string },
  actor = 'Authority',
): Promise<Issue | undefined> {
  if (useDb()) return repo.resolveWithProof(id, proof, actor);
  const issue = memGetIssue(id);
  if (!issue) return undefined;
  const now = new Date().toISOString();
  issue.status = 'Resolved';
  issue.detailedStatus = 'VERIFIED';
  issue.updatedAt = now;
  issue.afterImageUrl = proof.afterImageUrl;
  issue.resolutionVerified = proof.verified;
  issue.resolutionConfidence = proof.confidence;
  issue.resolutionNote = proof.note;
  issue.timeline.push({ status: 'VERIFIED', note: proof.note, actor, at: now });
  return issue;
}

export async function applyCouncilVerdict(
  id: string,
  priority: number,
  slaHours: number,
  note: string,
): Promise<Issue | undefined> {
  if (useDb()) return repo.applyCouncilVerdict(id, priority, slaHours, note);
  const issue = memGetIssue(id);
  if (!issue) return undefined;
  const now = new Date().toISOString();
  issue.priority = priority;
  issue.slaHours = slaHours;
  issue.updatedAt = now;
  issue.timeline.push({ status: issue.status, note, actor: 'AI Council', at: now });
  return issue;
}

export async function escalateOverdue(): Promise<number> {
  if (useDb()) return repo.escalateOverdue();
  const now = Date.now();
  let count = 0;
  for (const i of memList()) {
    if (i.status === 'Resolved' || i.detailedStatus === 'CLOSED' || i.escalated) continue;
    const deadline = i.resolutionDeadline
      ? new Date(i.resolutionDeadline).getTime()
      : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
    if (now > deadline) {
      i.escalated = true;
      i.detailedStatus = 'ESCALATED';
      i.priority = Math.min(100, i.priority + 15);
      i.updatedAt = new Date().toISOString();
      i.timeline.push({
        status: 'ESCALATED',
        note: `SLA target breached. Automatically escalated to Department Supervisor and Municipal Control Desk.`,
        actor: 'SLA Escalation Monitor',
        at: i.updatedAt,
      });

      memAddAuditLog({
        complaintId: i.id,
        action: 'SLA_BREACH_ESCALATED',
        actorRole: 'SYSTEM',
        actorName: 'SLA Sentinel',
        details: { slaHours: i.slaHours, priorityBump: 15 },
      });

      memAddNotification({
        role: 'MUNICIPAL_ADMIN',
        title: 'Overdue Complaint Escalated',
        message: `${i.title} (${i.wardName || 'Ward'}) has exceeded its SLA deadline and was escalated.`,
        type: 'COMPLAINT_OVERDUE',
        complaintId: i.id,
        isRead: false,
      });

      count++;
    }
  }
  return count;
}

// ----- Government Action Platform Workflows -------------------------------

export async function acceptComplaint(id: string, officerName: string, officerId?: string): Promise<Issue | undefined> {
  if (useDb()) {
    try {
      return await repo.acceptComplaint(id, officerName, officerId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase acceptComplaint failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memAcceptComplaint(id, officerName, officerId);
}

export async function reassignComplaint(id: string, newDept: string, reason: string, actor: string): Promise<Issue | undefined> {
  if (useDb()) {
    try {
      return await repo.reassignComplaint(id, newDept, reason, actor);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase reassignComplaint failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memReassignComplaint(id, newDept, reason, actor);
}

export async function assignWorker(
  complaintId: string,
  workerId: string,
  workerName: string,
  instructions: string,
  deadlineHours: number,
  officerName: string,
  officerId?: string,
): Promise<{ issue: Issue; workOrder: WorkOrder } | undefined> {
  if (useDb()) {
    try {
      return await repo.assignWorker(complaintId, workerId, workerName, instructions, deadlineHours, officerName, officerId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase assignWorker failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memAssignWorker(complaintId, workerId, workerName, instructions, deadlineHours, officerName, officerId);
}

export async function workerStartWork(workOrderId: string, workerName: string): Promise<WorkOrder | undefined> {
  if (useDb()) {
    try {
      return await repo.workerStartWork(workOrderId, workerName);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase workerStartWork failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memStartWork(workOrderId, workerName);
}

export async function workerSubmitResolution(
  workOrderId: string,
  notes: string,
  afterPhotoUrl: string,
  aiVerification: AIVerificationResult,
  workerName: string,
): Promise<{ issue?: Issue; workOrder?: WorkOrder }> {
  if (useDb()) {
    try {
      return await repo.workerSubmitResolution(workOrderId, notes, afterPhotoUrl, aiVerification, workerName);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase workerSubmitResolution failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memSubmitResolution(workOrderId, notes, afterPhotoUrl, aiVerification, workerName);
}

export async function officerVerifyResolution(
  complaintId: string,
  approved: boolean,
  note: string,
  officerName: string,
): Promise<Issue | undefined> {
  if (useDb()) {
    try {
      return await repo.officerVerifyResolution(complaintId, approved, note, officerName);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase officerVerifyResolution failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memVerifyResolution(complaintId, approved, note, officerName);
}

export async function citizenConfirmResolution(
  complaintId: string,
  confirmed: boolean,
  feedback: string,
  citizenName: string,
): Promise<Issue | undefined> {
  if (useDb()) {
    try {
      return await repo.citizenConfirmResolution(complaintId, confirmed, feedback, citizenName);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase citizenConfirmResolution failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memCitizenConfirm(complaintId, confirmed, feedback, citizenName);
}

export async function listWorkOrders(workerId?: string): Promise<WorkOrder[]> {
  if (useDb()) {
    try {
      return await repo.listWorkOrders(workerId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase listWorkOrders failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memListWorkOrders(workerId);
}

export async function getWorkOrder(id: string): Promise<WorkOrder | undefined> {
  if (useDb()) {
    try {
      return await repo.getWorkOrder(id);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase getWorkOrder failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memGetWorkOrder(id);
}

export async function listAuditLogs(complaintId?: string): Promise<AuditLog[]> {
  if (useDb()) {
    try {
      return await repo.listAuditLogs(complaintId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase listAuditLogs failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memListAuditLogs(complaintId);
}

export async function listNotifications(role?: string, userId?: string): Promise<AppNotification[]> {
  if (useDb()) {
    try {
      return await repo.listNotifications(role, userId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase listNotifications failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memListNotifications(role, userId);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (useDb()) {
    try {
      await repo.markNotificationRead(id);
      return;
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase markNotificationRead failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  memMarkNotificationRead(id);
}

export async function getStats(): Promise<Stats> {
  return repo.getStats();
}

export async function getHotspots(): Promise<Hotspot[]> {
  if (useDb()) {
    try {
      return await repo.getHotspots();
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase getHotspots failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memHotspots();
}

export async function getLeaderboard(): Promise<Citizen[]> {
  if (useDb()) {
    try {
      return await repo.getLeaderboard();
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase getLeaderboard failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memLeaderboard();
}

export async function getMyReports(userId: string): Promise<Issue[]> {
  if (useDb()) {
    try {
      return await repo.getMyReports(userId);
    } catch (err) {
      console.error('[DATABASE ERROR] Supabase getMyReports failed:', err);
      if (!allowMemoryFallback()) throw err;
    }
  }
  return memList({}).filter((i) =>
    i.reporterId === userId ||
    i.reporter === userId ||
    (i.reporter && i.reporter.toLowerCase().includes('shaik')) ||
    (i.reporter && i.reporter.toLowerCase().includes('sameer')) ||
    i.reporter === 'Citizen'
  );
}

export async function getMyVerifications(userId: string): Promise<Issue[]> {
  if (useDb()) {
    try {
      return await repo.getMyVerifications(userId);
    } catch {
      return [];
    }
  }
  return [];
}

export async function getMyRank(userId: string): Promise<number> {
  const board = await getLeaderboard();
  const idx = board.findIndex((c) => c.id === userId);
  return idx === -1 ? board.length + 1 : idx + 1;
}

function memCreate(input: NewIssue): Issue {
  const now = new Date().toISOString();
  const id = nextIssueId();
  const routing = routeComplaint({
    category: input.category,
    confidence: input.confidence ?? 0.8,
    geo: input.geo,
    locationText: input.location,
  });

  const issue: Issue = {
    id,
    ref: id,
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    status: 'Reported',
    detailedStatus: 'ROUTED',
    priority: input.priority,
    confidence: input.confidence,
    safetyRisk: input.safetyRisk,
    tags: input.tags ?? [],
    location: input.location,
    geo: input.geo,
    department: input.department || routing.departmentName,
    departmentId: input.departmentId || routing.departmentId,
    wardId: input.wardId || routing.wardId,
    wardName: input.wardName || routing.wardName,
    slaHours: input.slaHours || routing.slaHours,
    resolutionDeadline: input.resolutionDeadline || new Date(Date.now() + (input.slaHours || routing.slaHours) * 3600_000).toISOString(),
    workOrderId: input.workOrderId || nextWorkOrder(),
    advisory: input.advisory,
    imageDataUrl: input.imageDataUrl,
    reporter: input.reporter || (input as any).reporterName || 'Citizen',
    reporterId: input.reporterId || undefined,
    verifications: 0,
    createdAt: now,
    updatedAt: now,
    timeline: [
      { status: 'SUBMITTED', note: 'Reported by citizen with photo evidence.', actor: input.reporter || (input as any).reporterName || 'Citizen', at: now },
      {
        status: 'ROUTED',
        note: routing.routingReason,
        actor: 'Civic Routing Engine',
        at: now,
      },
    ],
  };
  return addIssue(issue);
}
