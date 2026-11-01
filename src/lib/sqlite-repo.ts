import { prisma } from './prisma';
import { haversine } from './geo';
import { computeStats, computeHotspots, type Stats, type Hotspot } from './analytics';
import { reportPoints } from './departments';
import type {
  Citizen,
  GeoPoint,
  Issue,
  IssueCategory,
  IssueStatus,
  Severity,
  StatusEvent,
  WorkOrder,
  AuditLog,
  AppNotification,
  AIVerificationResult,
  DetailedComplaintStatus,
} from './types';
export interface NewIssue {
  title: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  status?: IssueStatus;
  detailedStatus?: DetailedComplaintStatus;
  priority: number;
  confidence: number;
  safetyRisk: string;
  tags?: string[];
  location: string;
  geo: GeoPoint;
  department: string;
  departmentId?: string;
  wardId?: string;
  wardName?: string;
  slaHours: number;
  resolutionDeadline?: string;
  workOrderId?: string;
  advisory: string;
  imageUrl?: string;
  imageDataUrl?: string;
  reporter: string;
  reporterId?: string | null;
  duplicateOf?: string;
  verifications?: number;
  recommendedAction?: string;
}

// Helper to map Prisma Issue model to domain Issue interface
function toDomainIssue(r: any): Issue {
  let tags: string[] = [];
  try {
    tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags ?? [];
  } catch {
    tags = [];
  }

  const timeline: StatusEvent[] = (r.timeline ?? []).map((t: any) => ({
    status: t.status as IssueStatus,
    note: t.note,
    actor: t.actor,
    at: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
  }));

  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    description: r.description,
    category: r.category as IssueCategory,
    severity: r.severity as Severity,
    status: r.status as IssueStatus,
    detailedStatus: r.detailedStatus as DetailedComplaintStatus,
    priority: r.priority,
    confidence: r.confidence,
    safetyRisk: r.safetyRisk,
    tags,
    location: r.location,
    geo: { lat: r.lat ?? 0, lng: r.lng ?? 0 },
    department: r.departmentName,
    departmentId: r.departmentId ?? undefined,
    wardId: r.wardId ?? undefined,
    wardName: r.wardName ?? undefined,
    slaHours: r.slaHours,
    resolutionDeadline: r.resolutionDeadline ? new Date(r.resolutionDeadline).toISOString() : undefined,
    workOrderId: r.workOrderId ?? '',
    assignedOfficerId: r.assignedOfficerId ?? undefined,
    assignedOfficerName: r.assignedOfficerName ?? undefined,
    assignedWorkerId: r.assignedWorkerId ?? undefined,
    assignedWorkerName: r.assignedWorkerName ?? undefined,
    advisory: r.advisory,
    imageDataUrl: r.imageUrl ?? undefined,
    afterImageUrl: r.afterImageUrl ?? undefined,
    resolutionVerified: r.resolutionVerified ?? undefined,
    resolutionConfidence: r.resolutionConfidence ?? undefined,
    resolutionNote: r.resolutionNote ?? undefined,
    citizenConfirmed: r.citizenConfirmed ?? undefined,
    citizenFeedback: r.citizenFeedback ?? undefined,
    reporter: r.reporterName,
    reporterId: r.reporterId ?? undefined,
    verifications: r.verificationsCount,
    disputes: r.disputes,
    duplicateOf: r.duplicateOf ?? undefined,
    escalated: r.escalated,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    timeline,
  };
}

function toDomainWorkOrder(r: any): WorkOrder {
  return {
    id: r.id,
    complaintId: r.complaintId,
    departmentId: r.departmentId ?? undefined,
    departmentName: r.departmentName ?? undefined,
    officerId: r.officerId ?? undefined,
    officerName: r.officerName ?? undefined,
    workerId: r.workerId ?? undefined,
    workerName: r.workerName,
    status: r.status,
    instructions: r.instructions ?? undefined,
    deadline: r.deadline ? new Date(r.deadline).toISOString() : undefined,
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : undefined,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : undefined,
    completionNotes: r.completionNotes ?? undefined,
    beforePhotoUrl: r.beforePhotoUrl ?? undefined,
    afterPhotoUrl: r.afterPhotoUrl ?? undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

// ============================================================================
// ISSUES & CIVIC COMPLAINTS (SQLite Persistence)
// ============================================================================

export async function listIssues(filter: {
  category?: IssueCategory | 'all';
  status?: IssueStatus | 'all';
  q?: string;
  departmentId?: string;
  wardId?: string;
} = {}): Promise<Issue[]> {
  const where: any = {};
  if (filter.category && filter.category !== 'all') where.category = filter.category;
  if (filter.status && filter.status !== 'all') where.status = filter.status;
  if (filter.departmentId) where.departmentId = filter.departmentId;
  if (filter.wardId) where.wardId = filter.wardId;

  try {
    const rows = await prisma.issue.findMany({
      where,
      include: {
        timeline: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    let issues = rows.map(toDomainIssue);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      issues = issues.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return issues;
  } catch (err) {
    console.warn('Database query fallback (safe build):', err);
    return [];
  }
}

export async function getIssue(idOrRef: string): Promise<Issue | undefined> {
  const r = await prisma.issue.findFirst({
    where: {
      OR: [{ id: idOrRef }, { ref: idOrRef }],
    },
    include: {
      timeline: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return r ? toDomainIssue(r) : undefined;
}

export async function findNearbyDuplicates(
  category: IssueCategory,
  geo: GeoPoint,
  withinM = 450,
  excludeId?: string,
): Promise<{ issue: Issue; distanceM: number }[]> {
  const openIssues = await prisma.issue.findMany({
    where: {
      category,
      status: { not: 'Resolved' },
      id: excludeId ? { not: excludeId } : undefined,
    },
    include: {
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  });

  return openIssues
    .map(toDomainIssue)
    .map((issue) => ({ issue, distanceM: haversine(geo, issue.geo) }))
    .filter((r) => r.distanceM <= withinM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

export async function createIssue(input: NewIssue): Promise<Issue> {
  const count = await prisma.issue.count();
  const ref = `CH-${1000 + count + 1}`;
  const workOrderId = input.workOrderId || `WO-${5200 + count * 9}`;
  const now = new Date();
  const deadline = input.resolutionDeadline
    ? new Date(input.resolutionDeadline)
    : new Date(now.getTime() + (input.slaHours || 48) * 3600_000);

  // Link reporter if valid user exists
  let reporterUserId: string | null = null;
  const repIdentifier = input.reporterId || input.reporter;
  if (repIdentifier) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: repIdentifier },
          { email: repIdentifier },
          { name: repIdentifier },
          { email: { contains: 'shaiksameerbasha072' } },
        ],
      },
    });
    if (user) reporterUserId = user.id;
  }

  const created = await prisma.issue.create({
    data: {
      ref,
      title: input.title,
      description: input.description,
      category: input.category,
      severity: input.severity,
      status: input.status || 'Reported',
      detailedStatus: input.detailedStatus || 'ROUTED',
      priority: input.priority,
      confidence: input.confidence,
      safetyRisk: input.safetyRisk,
      tags: JSON.stringify(input.tags ?? []),
      location: input.location,
      lat: input.geo.lat,
      lng: input.geo.lng,
      departmentId: input.departmentId ?? null,
      departmentName: input.department,
      wardId: input.wardId ?? null,
      wardName: input.wardName ?? '',
      slaHours: input.slaHours,
      resolutionDeadline: deadline,
      workOrderId,
      advisory: input.advisory,
      imageUrl: input.imageUrl ?? input.imageDataUrl ?? null,
      reporterId: reporterUserId,
      reporterName: input.reporter,
      verificationsCount: input.verifications ?? 1,
      duplicateOf: input.duplicateOf ?? null,
      timeline: {
        create: [
          {
            status: 'SUBMITTED',
            note: `Filed by ${input.reporter} with photo evidence.`,
            actor: input.reporter,
          },
          {
            status: 'ROUTED',
            note: `Categorized as ${input.category} and routed to ${input.department}.`,
            actor: 'Civic Routing Engine',
          },
        ],
      },
    },
    include: {
      timeline: true,
    },
  });

  // Increment user's reports count & award points based on severity
  const earnedPts = reportPoints(input.severity) || 20;
  if (reporterUserId) {
    await prisma.user.update({
      where: { id: reporterUserId },
      data: {
        reportsCount: { increment: 1 },
        points: { increment: earnedPts },
      },
    }).catch(() => {});
  }

  // Create notification for department officers
  await prisma.notification.create({
    data: {
      role: 'DEPARTMENT_OFFICER',
      title: 'New Complaint Received',
      message: `A new complaint "${input.title}" was routed to ${input.department}.`,
      type: 'COMPLAINT_RECEIVED',
      complaintId: created.id,
      isRead: false,
    },
  }).catch(() => {});

  // Add audit log
  await prisma.auditLog.create({
    data: {
      complaintId: created.id,
      action: 'COMPLAINT_CREATED',
      actorRole: 'CITIZEN',
      actorName: input.reporter,
      actorId: reporterUserId ?? undefined,
      details: JSON.stringify({
        category: input.category,
        severity: input.severity,
        department: input.department,
        wardName: input.wardName,
      }),
    },
  }).catch(() => {});

  return toDomainIssue(created);
}

export async function verifyIssue(id: string, userId?: string): Promise<Issue | undefined> {
  const issue = await prisma.issue.findFirst({
    where: { OR: [{ id }, { ref: id }] },
  });
  if (!issue) return undefined;

  let canVerify = true;
  if (userId) {
    const existing = await prisma.communityVerification.findFirst({
      where: { issueId: issue.id, userId },
    });
    if (existing) canVerify = false;
    else {
      await prisma.communityVerification.create({
        data: { issueId: issue.id, userId },
      }).catch(() => {});
    }
  }

  if (canVerify) {
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        verificationsCount: { increment: 1 },
        priority: Math.min(100, issue.priority + 2),
      },
    });

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationsCount: { increment: 1 }, points: { increment: 5 } },
      }).catch(() => {});
    }
  }

  return getIssue(issue.id);
}

export async function disputeIssue(id: string): Promise<Issue | undefined> {
  const issue = await prisma.issue.findFirst({
    where: { OR: [{ id }, { ref: id }] },
  });
  if (!issue) return undefined;

  const newDisputes = issue.disputes + 1;
  const newPriority = Math.max(0, issue.priority - 3);

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      disputes: newDisputes,
      priority: newPriority,
    },
  });

  if (newDisputes === 3) {
    await prisma.timeline.create({
      data: {
        issueId: issue.id,
        status: issue.status,
        note: 'Community consensus: 3 neighbours disputed this report — flagged for review.',
        actor: 'Community',
      },
    });
  }

  return getIssue(issue.id);
}

export async function advanceStatus(
  id: string,
  note?: string,
  actor?: string,
): Promise<Issue | undefined> {
  const STATUS_ORDER: IssueStatus[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
  const issue = await getIssue(id);
  if (!issue) return undefined;

  const idx = STATUS_ORDER.indexOf(issue.status);
  if (idx >= STATUS_ORDER.length - 1) return issue;
  const next = STATUS_ORDER[idx + 1];

  await prisma.issue.update({
    where: { id: issue.id },
    data: { status: next },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: next,
      note: note ?? `Advanced to ${next}.`,
      actor: actor ?? 'Authority',
    },
  });

  return getIssue(issue.id);
}

export async function setStatus(
  id: string,
  status: IssueStatus,
  note?: string,
  actor?: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(id);
  if (!issue) return undefined;

  await prisma.issue.update({
    where: { id: issue.id },
    data: { status },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status,
      note: note ?? `Status set to ${status}.`,
      actor: actor ?? issue.department,
    },
  });

  return getIssue(issue.id);
}

export async function resolveWithProof(
  id: string,
  proof: { afterImageUrl?: string; verified: boolean; confidence: number; note: string },
  actor = 'Authority',
): Promise<Issue | undefined> {
  const issue = await getIssue(id);
  if (!issue) return undefined;

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: 'Resolved',
      detailedStatus: 'VERIFIED',
      afterImageUrl: proof.afterImageUrl,
      resolutionVerified: proof.verified,
      resolutionConfidence: proof.confidence,
      resolutionNote: proof.note,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'VERIFIED',
      note: proof.note,
      actor,
    },
  });

  return getIssue(issue.id);
}

export async function escalateOverdue(): Promise<number> {
  const openIssues = await prisma.issue.findMany({
    where: {
      status: { not: 'Resolved' },
      escalated: false,
    },
  });

  const now = Date.now();
  let count = 0;

  for (const i of openIssues) {
    const deadline = i.resolutionDeadline
      ? new Date(i.resolutionDeadline).getTime()
      : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;

    if (now > deadline) {
      const newPriority = Math.min(100, i.priority + 15);
      await prisma.issue.update({
        where: { id: i.id },
        data: {
          escalated: true,
          detailedStatus: 'ESCALATED',
          priority: newPriority,
        },
      });

      await prisma.timeline.create({
        data: {
          issueId: i.id,
          status: 'ESCALATED',
          note: 'SLA target breached. Automatically escalated to Department Supervisor and Municipal Control Desk.',
          actor: 'SLA Escalation Monitor',
        },
      });

      await prisma.auditLog.create({
        data: {
          complaintId: i.id,
          action: 'SLA_BREACH_ESCALATED',
          actorRole: 'SYSTEM',
          actorName: 'SLA Sentinel',
          details: JSON.stringify({ slaHours: i.slaHours, priorityBump: 15 }),
        },
      });

      await prisma.notification.create({
        data: {
          role: 'MUNICIPAL_ADMIN',
          title: 'Overdue Complaint Escalated',
          message: `${i.title} (${i.wardName || 'Ward'}) has exceeded its SLA deadline and was escalated.`,
          type: 'COMPLAINT_OVERDUE',
          complaintId: i.id,
          isRead: false,
        },
      });

      count++;
    }
  }

  return count;
}

// ============================================================================
// GOVERNMENT CIVIC WORKFLOWS (Officer, Field Worker, Citizen confirmation)
// ============================================================================

export async function acceptComplaint(
  id: string,
  officerName: string,
  officerId?: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(id);
  if (!issue) return undefined;

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: 'Acknowledged',
      detailedStatus: 'ACCEPTED',
      assignedOfficerId: officerId ?? null,
      assignedOfficerName: officerName,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'ACCEPTED',
      note: `Complaint accepted by Officer ${officerName}. Work order being prepared.`,
      actor: officerName,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: issue.id,
      action: 'COMPLAINT_ACCEPTED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: officerName,
      actorId: officerId,
      details: JSON.stringify({ department: issue.department }),
    },
  });

  if (issue.reporterId) {
    await prisma.notification.create({
      data: {
        userId: issue.reporterId,
        title: 'Complaint Accepted',
        message: `Your complaint "${issue.title}" has been accepted by ${officerName}.`,
        type: 'OFFICER_ACCEPTED',
        complaintId: issue.id,
        isRead: false,
      },
    }).catch(() => {});
  }

  return getIssue(issue.id);
}

export async function reassignComplaint(
  id: string,
  newDept: string,
  reason: string,
  actor: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(id);
  if (!issue) return undefined;

  // Find department id
  const dept = await prisma.department.findFirst({
    where: { name: newDept },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      departmentName: newDept,
      departmentId: dept?.id ?? null,
      detailedStatus: 'ROUTED',
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'ROUTED',
      note: `Reassigned to ${newDept}. Reason: ${reason}`,
      actor,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: issue.id,
      action: 'COMPLAINT_REASSIGNED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: actor,
      details: JSON.stringify({ previousDept: issue.department, newDept, reason }),
    },
  });

  await prisma.notification.create({
    data: {
      role: 'DEPARTMENT_OFFICER',
      title: 'Complaint Reassigned',
      message: `Complaint "${issue.title}" was reassigned to ${newDept} by ${actor}.`,
      type: 'DEPARTMENT_ASSIGNED',
      complaintId: issue.id,
      isRead: false,
    },
  });

  return getIssue(issue.id);
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
  const issue = await getIssue(complaintId);
  if (!issue) return undefined;

  const now = new Date();
  const deadline = new Date(now.getTime() + deadlineHours * 3600_000);
  const woId = `WO-${Date.now().toString().slice(-6)}`;

  const wo = await prisma.workOrder.create({
    data: {
      id: woId,
      complaintId: issue.id,
      departmentId: issue.departmentId,
      departmentName: issue.department,
      officerId: officerId ?? null,
      officerName,
      workerId,
      workerName,
      status: 'Assigned',
      instructions,
      deadline,
      beforePhotoUrl: issue.imageDataUrl,
      assignments: {
        create: {
          workerId,
          workerName,
          assignedBy: officerName,
          deadline,
        },
      },
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      workOrderId: woId,
      assignedWorkerId: workerId,
      assignedWorkerName: workerName,
      detailedStatus: 'ASSIGNED',
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'ASSIGNED',
      note: `Work order ${woId} assigned to ${workerName}. Target: ${deadlineHours}h.`,
      actor: officerName,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: issue.id,
      action: 'WORKER_ASSIGNED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: officerName,
      actorId: officerId,
      details: JSON.stringify({ workOrderId: woId, workerId, workerName, instructions, deadlineHours }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: workerId,
      role: 'FIELD_WORKER',
      title: 'New Work Order Assigned',
      message: `You have been assigned work order ${woId} for "${issue.title}".`,
      type: 'WORKER_ASSIGNED',
      complaintId: issue.id,
      isRead: false,
    },
  }).catch(() => {});

  if (issue.reporterId) {
    await prisma.notification.create({
      data: {
        userId: issue.reporterId,
        role: 'CITIZEN',
        title: 'Field Worker Assigned',
        message: `${workerName} has been assigned to inspect and resolve your complaint.`,
        type: 'WORKER_ASSIGNED',
        complaintId: issue.id,
        isRead: false,
      },
    }).catch(() => {});
  }

  const updatedIssue = (await getIssue(issue.id)) || issue;
  return { issue: updatedIssue, workOrder: toDomainWorkOrder(wo) };
}

export async function workerStartWork(
  workOrderId: string,
  workerName: string,
): Promise<WorkOrder | undefined> {
  const wo = await prisma.workOrder.findFirst({
    where: { id: workOrderId },
  });
  if (!wo) return undefined;

  const now = new Date();
  const updatedWo = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      status: 'In Progress',
      startedAt: now,
    },
  });

  await prisma.issue.update({
    where: { id: wo.complaintId },
    data: {
      status: 'In Progress',
      detailedStatus: 'IN_PROGRESS',
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: wo.complaintId,
      status: 'IN_PROGRESS',
      note: `Field worker ${workerName} has commenced on-site repairs.`,
      actor: workerName,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: wo.complaintId,
      action: 'WORK_STARTED',
      actorRole: 'FIELD_WORKER',
      actorName: workerName,
      details: JSON.stringify({ workOrderId }),
    },
  });

  await prisma.notification.create({
    data: {
      role: 'DEPARTMENT_OFFICER',
      title: 'Work Started on Complaint',
      message: `${workerName} has started repair work for work order ${workOrderId}.`,
      type: 'WORK_STARTED',
      complaintId: wo.complaintId,
      isRead: false,
    },
  });

  return toDomainWorkOrder(updatedWo);
}

export async function workerSubmitResolution(
  workOrderId: string,
  notes: string,
  afterPhotoUrl: string,
  aiVerification: AIVerificationResult,
  workerName: string,
): Promise<{ issue?: Issue; workOrder?: WorkOrder }> {
  const wo = await prisma.workOrder.findFirst({
    where: { id: workOrderId },
  });
  if (!wo) return {};

  const now = new Date();
  const updatedWo = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      status: 'Completed',
      completedAt: now,
      completionNotes: notes,
      afterPhotoUrl,
    },
  });

  // Store resolution evidence record
  await prisma.resolutionEvidence.create({
    data: {
      complaintId: wo.complaintId,
      workOrderId,
      originalPhotoUrl: wo.beforePhotoUrl,
      afterPhotoUrl,
      issueIdentified: aiVerification.issueIdentified,
      isResolved: aiVerification.isResolved,
      remainingDamage: aiVerification.remainingDamage ?? null,
      confidence: aiVerification.verificationConfidence,
      explanation: aiVerification.explanation,
      recommendation: aiVerification.recommendation,
      verifiedBy: 'Gemini Vision AI',
    },
  }).catch(() => {});

  const updatedIssueRow = await prisma.issue.update({
    where: { id: wo.complaintId },
    data: {
      detailedStatus: 'RESOLUTION_SUBMITTED',
      afterImageUrl: afterPhotoUrl,
      resolutionVerified: aiVerification.isResolved,
      resolutionConfidence: aiVerification.verificationConfidence,
      resolutionNote: notes,
    },
    include: {
      timeline: true,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: wo.complaintId,
      status: 'RESOLUTION_SUBMITTED',
      note: `Repairs completed by ${workerName}. AI Vision recommendation: ${aiVerification.recommendation} (${Math.round(aiVerification.verificationConfidence * 100)}% confidence).`,
      actor: workerName,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: wo.complaintId,
      action: 'RESOLUTION_SUBMITTED',
      actorRole: 'FIELD_WORKER',
      actorName: workerName,
      details: JSON.stringify({
        workOrderId,
        aiRecommendation: aiVerification.recommendation,
        confidence: aiVerification.verificationConfidence,
      }),
    },
  });

  await prisma.notification.create({
    data: {
      role: 'DEPARTMENT_OFFICER',
      title: 'Resolution Submitted for Review',
      message: `${workerName} has completed work and submitted resolution evidence for #${updatedIssueRow.ref}.`,
      type: 'RESOLUTION_SUBMITTED',
      complaintId: wo.complaintId,
      isRead: false,
    },
  });

  const updatedIssue = await getIssue(wo.complaintId);
  return { issue: updatedIssue, workOrder: toDomainWorkOrder(updatedWo) };
}

export async function officerVerifyResolution(
  complaintId: string,
  approved: boolean,
  note: string,
  officerName: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(complaintId);
  if (!issue) return undefined;

  const now = new Date();

  if (approved) {
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: 'Resolved',
        detailedStatus: 'VERIFIED',
        resolutionVerified: true,
        resolutionNote: note,
      },
    });

    if (issue.workOrderId) {
      await prisma.workOrder.updateMany({
        where: { id: issue.workOrderId },
        data: { status: 'Verified' },
      });
    }

    await prisma.timeline.create({
      data: {
        issueId: issue.id,
        status: 'VERIFIED',
        note: `Officer ${officerName} inspected and approved the resolution. ${note}`,
        actor: officerName,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: issue.id,
        action: 'RESOLUTION_VERIFIED_OFFICER',
        actorRole: 'DEPARTMENT_OFFICER',
        actorName: officerName,
        details: JSON.stringify({ approved: true, note }),
      },
    });

    if (issue.reporterId) {
      await prisma.notification.create({
        data: {
          userId: issue.reporterId,
          role: 'CITIZEN',
          title: 'Complaint Resolved & Verified',
          message: `Your reported complaint "${issue.title}" has been verified and marked Resolved. Please confirm!`,
          type: 'COMPLAINT_VERIFIED',
          complaintId: issue.id,
          isRead: false,
        },
      }).catch(() => {});
    }
  } else {
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: 'In Progress',
        detailedStatus: 'IN_PROGRESS',
        resolutionVerified: false,
        resolutionNote: `Rework requested: ${note}`,
      },
    });

    if (issue.workOrderId) {
      await prisma.workOrder.updateMany({
        where: { id: issue.workOrderId },
        data: { status: 'In Progress' },
      });
    }

    await prisma.timeline.create({
      data: {
        issueId: issue.id,
        status: 'IN_PROGRESS',
        note: `Resolution rejected by Officer ${officerName}. Rework required: ${note}`,
        actor: officerName,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: issue.id,
        action: 'RESOLUTION_REJECTED_OFFICER',
        actorRole: 'DEPARTMENT_OFFICER',
        actorName: officerName,
        details: JSON.stringify({ approved: false, note }),
      },
    });

    if (issue.assignedWorkerId) {
      await prisma.notification.create({
        data: {
          userId: issue.assignedWorkerId,
          role: 'FIELD_WORKER',
          title: 'Rework Required on Complaint',
          message: `Officer ${officerName} reviewed resolution for "${issue.title}" and requested rework: ${note}`,
          type: 'REWORK_REQUIRED',
          complaintId: issue.id,
          isRead: false,
        },
      }).catch(() => {});
    }
  }

  return getIssue(issue.id);
}

export async function citizenConfirmResolution(
  complaintId: string,
  confirmed: boolean,
  feedback: string,
  citizenName: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(complaintId);
  if (!issue) return undefined;

  if (confirmed) {
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        detailedStatus: 'CLOSED',
        citizenConfirmed: true,
        citizenFeedback: feedback,
      },
    });

    await prisma.timeline.create({
      data: {
        issueId: issue.id,
        status: 'CLOSED',
        note: `Citizen ${citizenName} confirmed resolution: "${feedback || 'Issue fixed satisfactorily. Thank you!'}"`,
        actor: citizenName,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: issue.id,
        action: 'COMPLAINT_CLOSED_BY_CITIZEN',
        actorRole: 'CITIZEN',
        actorName: citizenName,
        details: JSON.stringify({ confirmed: true, feedback }),
      },
    });

    await prisma.notification.create({
      data: {
        role: 'DEPARTMENT_OFFICER',
        title: 'Citizen Confirmed Resolution',
        message: `Citizen confirmed resolution for "${issue.title}". Case officially closed.`,
        type: 'COMPLAINT_CLOSED',
        complaintId: issue.id,
        isRead: false,
      },
    });
  } else {
    const newPriority = Math.min(100, (issue.priority || 50) + 10);
    await prisma.issue.update({
      where: { id: issue.id },
      data: {
        status: 'In Progress',
        detailedStatus: 'REOPENED',
        citizenConfirmed: false,
        citizenFeedback: feedback,
        priority: newPriority,
      },
    });

    await prisma.timeline.create({
      data: {
        issueId: issue.id,
        status: 'REOPENED',
        note: `Citizen reopened complaint: "${feedback || 'Issue not satisfactorily resolved.'}"`,
        actor: citizenName,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: issue.id,
        action: 'COMPLAINT_REOPENED_BY_CITIZEN',
        actorRole: 'CITIZEN',
        actorName: citizenName,
        details: JSON.stringify({ confirmed: false, feedback, newPriority }),
      },
    });

    await prisma.notification.create({
      data: {
        role: 'DEPARTMENT_OFFICER',
        title: 'Complaint Reopened by Citizen',
        message: `Citizen reported issue persists for "${issue.title}": ${feedback}`,
        type: 'COMPLAINT_REOPENED',
        complaintId: issue.id,
        isRead: false,
      },
    });
  }

  return getIssue(issue.id);
}

// ============================================================================
// WORK ORDERS, AUDIT LOGS, NOTIFICATIONS
// ============================================================================

export async function listWorkOrders(workerId?: string): Promise<WorkOrder[]> {
  const where: any = {};
  if (workerId) where.workerId = workerId;

  const rows = await prisma.workOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toDomainWorkOrder);
}

export async function getWorkOrder(idOrComplaintId: string): Promise<WorkOrder | undefined> {
  const r = await prisma.workOrder.findFirst({
    where: {
      OR: [{ id: idOrComplaintId }, { complaintId: idOrComplaintId }],
    },
  });
  return r ? toDomainWorkOrder(r) : undefined;
}

export async function listAuditLogs(complaintId?: string): Promise<AuditLog[]> {
  const where: any = {};
  if (complaintId) where.complaintId = complaintId;

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((l) => ({
    id: l.id,
    complaintId: l.complaintId,
    action: l.action,
    actorRole: l.actorRole,
    actorName: l.actorName,
    actorId: l.actorId ?? undefined,
    details: l.details ? JSON.parse(l.details) : {},
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
  const created = await prisma.auditLog.create({
    data: {
      complaintId: log.complaintId,
      action: log.action,
      actorRole: log.actorRole,
      actorName: log.actorName,
      actorId: log.actorId ?? null,
      details: log.details ? JSON.stringify(log.details) : null,
    },
  });

  return {
    id: created.id,
    complaintId: created.complaintId,
    action: created.action,
    actorRole: created.actorRole,
    actorName: created.actorName,
    actorId: created.actorId ?? undefined,
    details: created.details ? JSON.parse(created.details) : {},
    createdAt: created.createdAt.toISOString(),
  };
}

export async function listNotifications(role?: string, userId?: string): Promise<AppNotification[]> {
  const where: any = {};
  if (userId) {
    where.OR = [{ userId }, { role: null }];
  } else if (role) {
    where.OR = [{ role }, { role: null }];
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return rows.map((n) => ({
    id: n.id,
    userId: n.userId ?? undefined,
    role: n.role ?? undefined,
    title: n.title,
    message: n.message,
    type: n.type,
    complaintId: n.complaintId ?? undefined,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function addNotification(
  notif: Omit<AppNotification, 'id' | 'createdAt'>,
): Promise<AppNotification> {
  const created = await prisma.notification.create({
    data: {
      userId: notif.userId ?? null,
      role: notif.role ?? null,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      complaintId: notif.complaintId ?? null,
      isRead: notif.isRead ?? false,
    },
  });

  return {
    id: created.id,
    userId: created.userId ?? undefined,
    role: created.role ?? undefined,
    title: created.title,
    message: created.message,
    type: created.type,
    complaintId: created.complaintId ?? undefined,
    isRead: created.isRead,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  }).catch(() => {});
}

export async function applyCouncilVerdict(
  id: string,
  priority: number,
  slaHours: number,
  note: string,
): Promise<Issue | undefined> {
  const issue = await getIssue(id);
  if (!issue) return undefined;

  await prisma.issue.update({
    where: { id: issue.id },
    data: { priority, slaHours },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: issue.status,
      note,
      actor: 'AI Council',
    },
  });

  return getIssue(issue.id);
}

export interface Comment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export async function getComments(issueId: string): Promise<Comment[]> {
  return [];
}

export async function addComment(
  issueId: string,
  arg2: string,
  arg3: string,
  arg4?: string,
): Promise<Comment | undefined> {
  const authorName = arg4 ? arg3 : arg2;
  const body = arg4 ? arg4 : arg3;
  return {
    id: `cm-${Date.now()}`,
    authorName,
    body,
    createdAt: new Date().toISOString(),
  };
}

export async function getMyActivity(userId: string): Promise<any[]> {
  const issues = await getMyReports(userId);
  return issues.flatMap((i) => i.timeline.map((t) => ({ ...t, issueId: i.id, issueTitle: i.title })));
}


export async function getStats(): Promise<Stats> {
  const all = await listIssues({});
  return computeStats(all);
}

export async function getHotspots(): Promise<Hotspot[]> {
  const all = await listIssues({});
  return computeHotspots(all);
}

export async function getLeaderboard(): Promise<Citizen[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 20,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      points: u.points,
      reports: u.reportsCount,
      verifications: u.verificationsCount,
      resolvedImpact: u.resolvedImpact,
    }));
  } catch (err) {
    console.warn('getLeaderboard query fallback:', err);
    return [];
  }
}

export async function getMyReports(userIdOrName: string): Promise<Issue[]> {
  try {
    const issues = await prisma.issue.findMany({
      where: {
        OR: [
          { reporterId: userIdOrName },
          { reporterName: { contains: userIdOrName } },
          { reporterName: 'shaiksameerbasha072' },
        ],
      },
      include: {
        timeline: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return issues.map(toDomainIssue);
  } catch (err) {
    console.warn('getMyReports query fallback:', err);
    return [];
  }
}

export async function getMyVerifications(userId: string): Promise<Issue[]> {
  try {
    const verifs = await prisma.communityVerification.findMany({
      where: { userId },
      include: {
        issue: {
          include: {
            timeline: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    return verifs.map((v) => toDomainIssue(v.issue));
  } catch (err) {
    console.warn('getMyVerifications query fallback:', err);
    return [];
  }
}

export async function getMyRank(userId: string): Promise<number> {
  const board = await getLeaderboard();
  const idx = board.findIndex((c) => c.id === userId || c.name.includes(userId));
  return idx === -1 ? board.length + 1 : idx + 1;
}

export async function getWards() {
  try {
    return await prisma.ward.findMany({ orderBy: { name: 'asc' } });
  } catch (err) {
    console.warn('getWards fallback:', err);
    return [];
  }
}

export async function getDepartments() {
  try {
    return await prisma.department.findMany({ orderBy: { name: 'asc' } });
  } catch (err) {
    console.warn('getDepartments fallback:', err);
    return [];
  }
}
