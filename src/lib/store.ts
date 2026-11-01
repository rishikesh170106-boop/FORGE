import type {
  Citizen,
  GeoPoint,
  Issue,
  IssueCategory,
  IssueStatus,
  DetailedComplaintStatus,
  Severity,
  WorkOrder,
  AuditLog,
  AppNotification,
  AIVerificationResult,
} from './types';
import { reportPoints } from './departments';
import { haversine } from './geo';
import { MUNICIPAL_WARDS } from './routing';

interface DB {
  issues: Issue[];
  workOrders: WorkOrder[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  citizens: Citizen[];
  seq: number;
  wo: number;
}

const g = globalThis as unknown as { __communityHeroDB?: DB };

function seedData(): DB {
  const now = Date.now();
  const iso = (offsetH: number) => new Date(now - offsetH * 3600_000).toISOString();
  const deadlineIso = (hoursFromNow: number) => new Date(now + hoursFromNow * 3600_000).toISOString();

  const issues: Issue[] = [
    {
      id: 'CH-1001',
      ref: 'CH-1001',
      title: 'Severe deep asphalt pothole on main transit corridor',
      description: 'Multiple vehicles damaged. High impact on two-wheeler riders near Indiranagar 100ft road junction.',
      category: 'Pothole',
      severity: 'Critical',
      status: 'In Progress',
      detailedStatus: 'IN_PROGRESS',
      priority: 94,
      confidence: 0.96,
      safetyRisk: 'Immediate risk of two-wheeler skid and structural vehicular damage during peak traffic hours.',
      tags: ['traffic-hazard', 'road-damage', 'indiranagar-metro'],
      location: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru',
      geo: { lat: 12.9784, lng: 77.6408 },
      department: 'Road Maintenance',
      departmentId: 'dept-road',
      wardId: 'ward-101',
      wardName: 'Indiranagar',
      assignedOfficerId: 'demo-officer-roads',
      assignedOfficerName: 'Officer Rajesh Kumar',
      assignedWorkerId: 'demo-worker-ramesh',
      assignedWorkerName: 'Ramesh Naidu (Lead Technician)',
      slaHours: 24,
      resolutionDeadline: deadlineIso(16),
      workOrderId: 'WO-5211',
      advisory: 'Road maintenance crew dispatched with asphalt cold-mix patching equipment. Traffic marshals notified.',
      imageDataUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      reporter: 'Priya Sharma',
      verifications: 14,
      createdAt: iso(8),
      updatedAt: iso(2),
      timeline: [
        { status: 'SUBMITTED', note: 'Citizen filed photo report via mobile app.', actor: 'Priya Sharma (Citizen)', at: iso(8) },
        { status: 'AI_ANALYZED', note: 'Gemini Vision detected Critical pothole (96% confidence).', actor: 'Gemini AI Agent', at: iso(7.9) },
        { status: 'ROUTED', note: 'Deterministically routed to Road Maintenance, Ward 101 (Indiranagar).', actor: 'Civic Routing Engine', at: iso(7.8) },
        { status: 'ACCEPTED', note: 'Complaint accepted by ward jurisdictional officer.', actor: 'Officer Rajesh Kumar', at: iso(6.5) },
        { status: 'ASSIGNED', note: 'Work Order WO-5211 generated. Field technician Ramesh Naidu assigned.', actor: 'Officer Rajesh Kumar', at: iso(5.0) },
        { status: 'IN_PROGRESS', note: 'Crew arrived on site. Area barricaded, asphalt compaction underway.', actor: 'Ramesh Naidu (Field Worker)', at: iso(2.0) },
      ],
    },
    {
      id: 'CH-1002',
      ref: 'CH-1002',
      title: 'High-pressure clean water pipeline leakage flooding street',
      description: 'Continuous freshwater loss overflowing onto pedestrian sidewalk for over 18 hours.',
      category: 'Water Leak',
      severity: 'High',
      status: 'In Progress',
      detailedStatus: 'RESOLUTION_SUBMITTED',
      priority: 88,
      confidence: 0.94,
      safetyRisk: 'Significant freshwater loss, road erosion and pedestrian path obstruction.',
      tags: ['clean-water', 'pipe-burst', 'koramangala-4th-block'],
      location: '80 Feet Rd, 4th Block, Koramangala, Bengaluru',
      geo: { lat: 12.9352, lng: 77.6245 },
      department: 'Water Supply',
      departmentId: 'dept-water',
      wardId: 'ward-102',
      wardName: 'Koramangala',
      assignedOfficerId: 'demo-officer-ananya',
      assignedOfficerName: 'Officer Ananya Sen',
      assignedWorkerId: 'demo-worker-suresh',
      assignedWorkerName: 'Suresh Gowda (Water Supply Line)',
      slaHours: 24,
      resolutionDeadline: deadlineIso(4),
      workOrderId: 'WO-5212',
      advisory: 'Emergency valve isolation crew engaged. Pipeline replacement completed; awaiting visual verification.',
      imageDataUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
      resolutionVerified: false,
      reporter: 'Vikram Aditya',
      verifications: 9,
      createdAt: iso(20),
      updatedAt: iso(1),
      aiVerification: {
        issueIdentifiedInOriginal: 'Underground high-pressure pipe breach causing high volume water pooling on sidewalk curb.',
        isResolved: true,
        remainingVisibleDamage: 'Subsurface collar clamp installed; standing water vacuumed, asphalt edge sealed.',
        verificationConfidence: 0.92,
        explanation: 'The after-repair photograph demonstrates the water leak has ceased completely and pipe trench has been reinforced.',
        recommendation: 'APPROVE',
        createdAt: iso(0.8),
      },
      timeline: [
        { status: 'SUBMITTED', note: 'Reported by local resident association member.', actor: 'Vikram Aditya (Citizen)', at: iso(20) },
        { status: 'ROUTED', note: 'Routed to Water Supply & Sewerage Board, Ward 102.', actor: 'Civic Routing Engine', at: iso(19.8) },
        { status: 'ACCEPTED', note: 'Accepted by Water Supply jurisdictional officer.', actor: 'Officer Ananya Sen', at: iso(18.0) },
        { status: 'ASSIGNED', note: 'Work Order WO-5212 issued to Pipeline Crew Lead Suresh Gowda.', actor: 'Officer Ananya Sen', at: iso(15.0) },
        { status: 'IN_PROGRESS', note: 'Subsurface valve clamped and pressure tested.', actor: 'Suresh Gowda (Field Worker)', at: iso(6.0) },
        { status: 'RESOLUTION_SUBMITTED', note: 'Repair completed. After-repair photograph submitted for Gemini AI inspection.', actor: 'Suresh Gowda (Field Worker)', at: iso(1.0) },
      ],
    },
    {
      id: 'CH-1003',
      ref: 'CH-1003',
      title: 'Overflowing commercial waste container blocking school gate',
      description: 'Garbage pile unattended for 3 days creating foul odor and health hazard.',
      category: 'Garbage',
      severity: 'High',
      status: 'Reported',
      detailedStatus: 'ROUTED',
      priority: 82,
      confidence: 0.91,
      safetyRisk: 'Sanitary hazard and vector-borne illness risk near educational institution.',
      tags: ['sanitation', 'school-zone', 'whitefield'],
      location: 'ITPL Main Rd, Whitefield, Bengaluru',
      geo: { lat: 12.9698, lng: 77.75 },
      department: 'Sanitation',
      departmentId: 'dept-san',
      wardId: 'ward-103',
      wardName: 'Whitefield',
      slaHours: 12,
      resolutionDeadline: deadlineIso(5),
      workOrderId: 'WO-5213',
      advisory: 'Solid waste management mechanical compactor truck alerted.',
      imageDataUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
      reporter: 'Meera Nair',
      verifications: 19,
      createdAt: iso(7),
      updatedAt: iso(7),
      timeline: [
        { status: 'SUBMITTED', note: 'Citizen photo report uploaded.', actor: 'Meera Nair (Citizen)', at: iso(7) },
        { status: 'AI_ANALYZED', note: 'Gemini identified High severity commercial solid waste accumulation.', actor: 'Gemini AI Agent', at: iso(6.9) },
        { status: 'ROUTED', note: 'Assigned to Sanitation Department, Ward 103 (Whitefield). Pending Officer Acceptance.', actor: 'Civic Routing Engine', at: iso(6.8) },
      ],
    },
    {
      id: 'CH-1004',
      ref: 'CH-1004',
      title: 'Blackout: 5 consecutive broken streetlights on residential avenue',
      description: 'Complete darkness on 27th Main road posing safety concerns for night commuters.',
      category: 'Streetlight',
      severity: 'Critical',
      status: 'Reported',
      detailedStatus: 'ESCALATED',
      priority: 96,
      confidence: 0.95,
      safetyRisk: 'High criminal risk and pedestrian road accident vulnerability.',
      tags: ['night-safety', 'electrical-failure', 'hsr-layout'],
      location: '27th Main Rd, Sector 1, HSR Layout, Bengaluru',
      geo: { lat: 12.9121, lng: 77.6446 },
      department: 'Electrical Department',
      departmentId: 'dept-elec',
      wardId: 'ward-104',
      wardName: 'HSR Layout',
      slaHours: 24,
      resolutionDeadline: iso(10), // Passed deadline -> Overdue!
      workOrderId: 'WO-5214',
      escalated: true,
      advisory: 'SLA target breached. Automatically escalated to Executive Engineer (Electrical) and Municipal Administrator.',
      imageDataUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
      reporter: 'Karthik Raja',
      verifications: 28,
      createdAt: iso(34),
      updatedAt: iso(1),
      timeline: [
        { status: 'SUBMITTED', note: 'Reported with community geo-verification.', actor: 'Karthik Raja (Citizen)', at: iso(34) },
        { status: 'ROUTED', note: 'Routed to Electrical Department.', actor: 'Civic Routing Engine', at: iso(33.8) },
        { status: 'ESCALATED', note: 'SLA target of 24h breached without assignment. Auto-escalated to Executive Engineer.', actor: 'System SLA Monitor', at: iso(10) },
      ],
    },
    {
      id: 'CH-1005',
      ref: 'CH-1005',
      title: 'Stormwater drain blockage causing waterlogging in market area',
      description: 'Concrete silt and plastic waste preventing runoff flow into secondary canal.',
      category: 'Drainage',
      severity: 'Medium',
      status: 'Resolved',
      detailedStatus: 'CLOSED',
      priority: 55,
      confidence: 0.89,
      safetyRisk: 'Minor road waterlogging during monsoon showers.',
      tags: ['monsoon-readiness', 'drain-cleaning', 'jayanagar'],
      location: '11th Main, 4th Block, Jayanagar, Bengaluru',
      geo: { lat: 12.9308, lng: 77.5838 },
      department: 'Drainage',
      departmentId: 'dept-drain',
      wardId: 'ward-105',
      wardName: 'Jayanagar',
      assignedOfficerId: 'demo-officer-pradeep',
      assignedOfficerName: 'Officer Pradeep Patil',
      assignedWorkerId: 'demo-worker-manju',
      assignedWorkerName: 'Manjunath (Desilting Crew)',
      slaHours: 48,
      workOrderId: 'WO-5215',
      advisory: 'Drain desilted and cleared by mechanical suction unit. Verified by municipal supervisor and confirmed by reporting citizen.',
      imageDataUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
      resolutionVerified: true,
      resolutionConfidence: 0.95,
      reporter: 'Anil Deshmukh',
      verifications: 11,
      createdAt: iso(72),
      updatedAt: iso(24),
      timeline: [
        { status: 'SUBMITTED', note: 'Citizen filed issue.', actor: 'Anil Deshmukh (Citizen)', at: iso(72) },
        { status: 'ACCEPTED', note: 'Accepted by Drainage Division.', actor: 'Officer Pradeep Patil', at: iso(68) },
        { status: 'ASSIGNED', note: 'Assigned to Desilting Crew.', actor: 'Officer Pradeep Patil', at: iso(60) },
        { status: 'IN_PROGRESS', note: 'Silt suction in progress.', actor: 'Manjunath (Field Worker)', at: iso(45) },
        { status: 'RESOLUTION_SUBMITTED', note: 'Drain cleared and photographed.', actor: 'Manjunath (Field Worker)', at: iso(30) },
        { status: 'VERIFIED', note: 'AI Vision & Officer inspection approved.', actor: 'Officer Pradeep Patil', at: iso(28) },
        { status: 'CLOSED', note: 'Reporting citizen confirmed resolution. Case officially closed.', actor: 'Anil Deshmukh (Citizen)', at: iso(24) },
      ],
    },
  ];

  const workOrders: WorkOrder[] = [
    {
      id: 'WO-5211',
      complaintId: 'CH-1001',
      departmentId: 'dept-road',
      departmentName: 'Road Maintenance',
      officerId: 'demo-officer-roads',
      officerName: 'Officer Rajesh Kumar',
      workerId: 'demo-worker-ramesh',
      workerName: 'Ramesh Naidu (Lead Technician)',
      status: 'In Progress',
      instructions: 'Deploy rapid hot-mix asphalt patch, seal edges with bitumen emulsion, and ensure flush level with existing pavement.',
      deadline: deadlineIso(16),
      startedAt: iso(2),
      beforePhotoUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      createdAt: iso(5),
      updatedAt: iso(2),
    },
    {
      id: 'WO-5212',
      complaintId: 'CH-1002',
      departmentId: 'dept-water',
      departmentName: 'Water Supply',
      officerId: 'demo-officer-ananya',
      officerName: 'Officer Ananya Sen',
      workerId: 'demo-worker-suresh',
      workerName: 'Suresh Gowda (Water Supply Line)',
      status: 'Completed',
      instructions: 'Isolate main valve, expose damaged pipe coupling, fit compression gasket clamp, and conduct 4-bar pressure test.',
      deadline: deadlineIso(4),
      startedAt: iso(6),
      completedAt: iso(1),
      completionNotes: 'Replaced ruptured 110mm GI coupling. Restored normal municipal line pressure. Surrounding gravel refilled and levelled.',
      beforePhotoUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=800&auto=format&fit=crop&q=80',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
      createdAt: iso(15),
      updatedAt: iso(1),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'audit-001',
      complaintId: 'CH-1001',
      action: 'WORK_ORDER_DISPATCHED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: 'Officer Rajesh Kumar',
      actorId: 'demo-officer-roads',
      details: { workOrderId: 'WO-5211', targetTechnician: 'Ramesh Naidu', priority: 94 },
      createdAt: iso(5),
    },
    {
      id: 'audit-002',
      complaintId: 'CH-1002',
      action: 'RESOLUTION_EVIDENCE_SUBMITTED',
      actorRole: 'FIELD_WORKER',
      actorName: 'Suresh Gowda',
      actorId: 'demo-worker-suresh',
      details: { workOrderId: 'WO-5212', aiRecommendation: 'APPROVE', confidence: 0.92 },
      createdAt: iso(1),
    },
    {
      id: 'audit-003',
      complaintId: 'CH-1004',
      action: 'SLA_BREACH_ESCALATED',
      actorRole: 'MUNICIPAL_ADMIN',
      actorName: 'Automated SLA Sentinel',
      details: { breachHours: 10, escalatedTo: 'Executive Engineer (Electrical)' },
      createdAt: iso(10),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-001',
      role: 'DEPARTMENT_OFFICER',
      title: 'New Critical Complaint Assigned',
      message: 'Complaint CH-1001 (Indiranagar) has been routed to your Road Maintenance queue with 94 priority.',
      type: 'DEPT_ASSIGNED',
      complaintId: 'CH-1001',
      isRead: false,
      createdAt: iso(6.5),
    },
    {
      id: 'notif-002',
      role: 'FIELD_WORKER',
      title: 'New Work Order Assigned',
      message: 'You have been assigned to Work Order WO-5211 for Pothole repair at 100 Feet Rd, Indiranagar.',
      type: 'WORKER_ASSIGNED',
      complaintId: 'CH-1001',
      isRead: false,
      createdAt: iso(5),
    },
    {
      id: 'notif-003',
      role: 'DEPARTMENT_OFFICER',
      title: 'Resolution Evidence Ready for Review',
      message: 'Field technician submitted repair photo for CH-1002 (Water Leak). Gemini Vision recommends APPROVE.',
      type: 'RESOLUTION_SUBMITTED',
      complaintId: 'CH-1002',
      isRead: false,
      createdAt: iso(1),
    },
    {
      id: 'notif-004',
      role: 'MUNICIPAL_ADMIN',
      title: 'SLA Escalation Alert',
      message: 'Streetlight outage CH-1004 in HSR Layout has breached its 24h SLA. Escalated to supervisor.',
      type: 'COMPLAINT_OVERDUE',
      complaintId: 'CH-1004',
      isRead: false,
      createdAt: iso(10),
    },
  ];

  const citizens: Citizen[] = [
    { id: 'u1', name: 'Priya Sharma', avatar: '👩', points: 340, reports: 12, verifications: 28, resolvedImpact: 9 },
    { id: 'u2', name: 'Vikram Aditya', avatar: '🧑', points: 280, reports: 8, verifications: 34, resolvedImpact: 6 },
    { id: 'u3', name: 'Meera Nair', avatar: '👩‍💼', points: 215, reports: 6, verifications: 19, resolvedImpact: 4 },
  ];

  return {
    issues,
    workOrders,
    auditLogs,
    notifications,
    citizens,
    seq: 1010,
    wo: 5220,
  };
}

function db(): DB {
  if (
    !g.__communityHeroDB ||
    !Array.isArray(g.__communityHeroDB.workOrders) ||
    !Array.isArray(g.__communityHeroDB.notifications) ||
    !Array.isArray(g.__communityHeroDB.auditLogs)
  ) {
    g.__communityHeroDB = seedData();
  }
  return g.__communityHeroDB;
}

// ----- reads ---------------------------------------------------------------

export interface IssueFilter {
  category?: IssueCategory | 'all';
  status?: IssueStatus | 'all';
  ward?: string | 'all';
  severity?: Severity | 'all';
  department?: string | 'all';
  q?: string;
}

export function listIssues(filter: IssueFilter = {}): Issue[] {
  let rows = [...db().issues];
  if (filter.category && filter.category !== 'all')
    rows = rows.filter((i) => i.category === filter.category);
  if (filter.status && filter.status !== 'all')
    rows = rows.filter((i) => i.status === filter.status);
  if (filter.ward && filter.ward !== 'all')
    rows = rows.filter((i) => i.wardName?.toLowerCase() === filter.ward?.toLowerCase() || i.wardId === filter.ward);
  if (filter.severity && filter.severity !== 'all')
    rows = rows.filter((i) => i.severity === filter.severity);
  if (filter.department && filter.department !== 'all')
    rows = rows.filter((i) => i.department?.toLowerCase().includes(filter.department!.toLowerCase()) || i.departmentId === filter.department);
  if (filter.q) {
    const q = filter.q.toLowerCase();
    rows = rows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.tags.some((t) => t.includes(q)) ||
        i.ref?.toLowerCase().includes(q) ||
        i.wardName?.toLowerCase().includes(q),
    );
  }
  return rows.sort(
    (a, b) =>
      Number(Boolean(b.escalated)) - Number(Boolean(a.escalated)) ||
      b.priority - a.priority ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getIssue(id: string): Issue | undefined {
  return db().issues.find((i) => i.id === id || i.ref === id);
}

/** Same-category open issues near a point — the agent's dedup signal. */
export function findNearbyDuplicates(
  category: IssueCategory,
  geo: GeoPoint,
  withinM = 450,
  excludeId?: string,
): { issue: Issue; distanceM: number }[] {
  return db()
    .issues.filter(
      (i) =>
        i.id !== excludeId &&
        i.category === category &&
        i.status !== 'Resolved',
    )
    .map((issue) => ({ issue, distanceM: haversine(geo, issue.geo) }))
    .filter((r) => r.distanceM <= withinM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ----- writes --------------------------------------------------------------

export function nextWorkOrder(): string {
  const d = db();
  d.wo += 1;
  return `WO-${d.wo}`;
}

export function nextIssueId(): string {
  const d = db();
  d.seq += 1;
  return `CH-${d.seq}`;
}

export function addIssue(issue: Issue): Issue {
  if (!issue.detailedStatus) issue.detailedStatus = 'SUBMITTED';
  db().issues.unshift(issue);
  awardReport(issue.reporter, issue.severity);

  // Auto-log audit entry
  addAuditLog({
    complaintId: issue.id,
    action: 'COMPLAINT_FILED',
    actorRole: 'CITIZEN',
    actorName: issue.reporter,
    details: { title: issue.title, category: issue.category, ward: issue.wardName, priority: issue.priority },
  });

  // Notify department officers
  addNotification({
    role: 'DEPARTMENT_OFFICER',
    title: 'New Complaint Received',
    message: `${issue.category} reported at ${issue.location} (${issue.wardName || 'Ward'}). Priority ${issue.priority}.`,
    type: 'COMPLAINT_RECEIVED',
    complaintId: issue.id,
    isRead: false,
  });

  return issue;
}

export function verifyIssue(id: string, by = 'You'): Issue | undefined {
  const issue = getIssue(id);
  if (!issue) return undefined;
  issue.verifications += 1;
  issue.updatedAt = new Date().toISOString();
  issue.priority = Math.min(100, issue.priority + 2);
  awardVerification(by);
  return issue;
}

const STATUS_ORDER: IssueStatus[] = [
  'Reported',
  'Acknowledged',
  'In Progress',
  'Resolved',
];

export function advanceStatus(id: string, note?: string): Issue | undefined {
  const issue = getIssue(id);
  if (!issue) return undefined;
  const idx = STATUS_ORDER.indexOf(issue.status);
  if (idx >= STATUS_ORDER.length - 1) return issue;
  const next = STATUS_ORDER[idx + 1];
  issue.status = next;
  const at = new Date().toISOString();
  issue.updatedAt = at;

  let mappedDetailed: DetailedComplaintStatus = 'IN_PROGRESS';
  if (next === 'Acknowledged') mappedDetailed = 'ACCEPTED';
  else if (next === 'In Progress') mappedDetailed = 'IN_PROGRESS';
  else if (next === 'Resolved') mappedDetailed = 'VERIFIED';
  issue.detailedStatus = mappedDetailed;

  issue.timeline.push({
    status: mappedDetailed,
    note: note ?? `Status updated to ${next}.`,
    actor: issue.department || 'Authority',
    at,
  });

  if (next === 'Resolved') {
    const c = db().citizens.find((x) => x.name === issue.reporter);
    if (c) {
      c.resolvedImpact += 1;
      c.points += 15;
    }
  }
  return issue;
}

// ----- Work Orders Management ---------------------------------------------

export function listWorkOrders(workerId?: string): WorkOrder[] {
  let rows = [...(db().workOrders || [])];
  if (workerId) {
    rows = rows.filter((w) => w.workerId === workerId || w.workerName.toLowerCase().includes(workerId.toLowerCase()));
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getWorkOrder(id: string): WorkOrder | undefined {
  return db().workOrders.find((w) => w.id === id);
}

export function saveWorkOrder(wo: WorkOrder): WorkOrder {
  const d = db();
  const idx = d.workOrders.findIndex((w) => w.id === wo.id);
  if (idx >= 0) {
    d.workOrders[idx] = { ...wo, updatedAt: new Date().toISOString() };
  } else {
    d.workOrders.unshift(wo);
  }
  return wo;
}

// ----- Platform Workflows --------------------------------------------------

/** Officer Accepts Complaint */
export function acceptComplaint(id: string, officerName: string, officerId = 'demo-officer'): Issue | undefined {
  const issue = getIssue(id);
  if (!issue) return undefined;
  const now = new Date().toISOString();
  issue.status = 'Acknowledged';
  issue.detailedStatus = 'ACCEPTED';
  issue.assignedOfficerId = officerId;
  issue.assignedOfficerName = officerName;
  issue.updatedAt = now;

  issue.timeline.push({
    status: 'ACCEPTED',
    note: `Complaint formally accepted into department schedule by ${officerName}.`,
    actor: officerName,
    at: now,
  });

  addAuditLog({
    complaintId: issue.id,
    action: 'OFFICER_ACCEPTED',
    actorRole: 'DEPARTMENT_OFFICER',
    actorName: officerName,
    actorId: officerId,
    details: { department: issue.department, priority: issue.priority },
  });

  addNotification({
    role: 'CITIZEN',
    title: 'Complaint Accepted by Authority',
    message: `Your report "${issue.title}" has been accepted by ${officerName} (${issue.department}).`,
    type: 'OFFICER_ACCEPTED',
    complaintId: issue.id,
    isRead: false,
  });

  return issue;
}

/** Officer Reassigns Complaint with reason */
export function reassignComplaint(id: string, newDept: string, reason: string, actor: string): Issue | undefined {
  const issue = getIssue(id);
  if (!issue) return undefined;
  const now = new Date().toISOString();
  const oldDept = issue.department;
  issue.department = newDept;
  issue.status = 'Reported';
  issue.detailedStatus = 'ROUTED';
  issue.updatedAt = now;

  issue.timeline.push({
    status: 'ROUTED',
    note: `Reassigned from ${oldDept} to ${newDept}. Reason: ${reason}`,
    actor,
    at: now,
  });

  addAuditLog({
    complaintId: issue.id,
    action: 'COMPLAINT_REASSIGNED',
    actorRole: 'DEPARTMENT_OFFICER',
    actorName: actor,
    details: { fromDepartment: oldDept, toDepartment: newDept, reason },
  });

  addNotification({
    role: 'DEPARTMENT_OFFICER',
    title: 'Complaint Reassigned to Your Queue',
    message: `${issue.title} reassigned to ${newDept} by ${actor}. Reason: ${reason}`,
    type: 'DEPT_ASSIGNED',
    complaintId: issue.id,
    isRead: false,
  });

  return issue;
}

/** Officer assigns field worker & creates work order */
export function assignWorker(
  complaintId: string,
  workerId: string,
  workerName: string,
  instructions: string,
  deadlineHours: number,
  officerName: string,
  officerId = 'demo-officer',
): { issue: Issue; workOrder: WorkOrder } | undefined {
  const issue = getIssue(complaintId);
  if (!issue) return undefined;
  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + (deadlineHours || issue.slaHours || 24) * 3600_000).toISOString();

  const woId = nextWorkOrder();
  const wo: WorkOrder = {
    id: woId,
    complaintId: issue.id,
    departmentId: issue.departmentId,
    departmentName: issue.department,
    officerId,
    officerName,
    workerId,
    workerName,
    status: 'Assigned',
    instructions: instructions || 'Inspect site, execute repair according to departmental safety standards, and upload photo proof.',
    deadline,
    beforePhotoUrl: issue.imageDataUrl,
    createdAt: now,
    updatedAt: now,
  };

  saveWorkOrder(wo);

  issue.status = 'In Progress';
  issue.detailedStatus = 'ASSIGNED';
  issue.workOrderId = woId;
  issue.assignedWorkerId = workerId;
  issue.assignedWorkerName = workerName;
  issue.resolutionDeadline = deadline;
  issue.activeWorkOrder = wo;
  issue.updatedAt = now;

  issue.timeline.push({
    status: 'ASSIGNED',
    note: `Work Order ${woId} issued to ${workerName}. Deadline: ${new Date(deadline).toLocaleString()}.`,
    actor: officerName,
    at: now,
  });

  addAuditLog({
    complaintId: issue.id,
    action: 'WORKER_ASSIGNED',
    actorRole: 'DEPARTMENT_OFFICER',
    actorName: officerName,
    actorId: officerId,
    details: { workOrderId: woId, workerName, deadline },
  });

  addNotification({
    role: 'FIELD_WORKER',
    userId: workerId,
    title: 'New Work Order Assigned',
    message: `You have been assigned Work Order ${woId} for "${issue.title}". Deadline: ${new Date(deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    type: 'WORKER_ASSIGNED',
    complaintId: issue.id,
    isRead: false,
  });

  return { issue, workOrder: wo };
}

/** Field Worker Starts Work */
export function startWork(workOrderId: string, workerName: string): WorkOrder | undefined {
  const wo = getWorkOrder(workOrderId);
  if (!wo) return undefined;
  const now = new Date().toISOString();
  wo.status = 'In Progress';
  wo.startedAt = now;
  wo.updatedAt = now;
  saveWorkOrder(wo);

  const issue = getIssue(wo.complaintId);
  if (issue) {
    issue.status = 'In Progress';
    issue.detailedStatus = 'IN_PROGRESS';
    issue.updatedAt = now;
    issue.timeline.push({
      status: 'IN_PROGRESS',
      note: `Field technician ${workerName} checked in on site. Repair operations started.`,
      actor: workerName,
      at: now,
    });
  }

  addAuditLog({
    complaintId: wo.complaintId,
    action: 'WORK_STARTED',
    actorRole: 'FIELD_WORKER',
    actorName: workerName,
    details: { workOrderId },
  });

  return wo;
}

/** Field Worker Submits Resolution with Photo & Notes */
export function submitResolution(
  workOrderId: string,
  notes: string,
  afterPhotoUrl: string,
  aiVerification: AIVerificationResult,
  workerName: string,
): { issue?: Issue; workOrder?: WorkOrder } {
  const wo = getWorkOrder(workOrderId);
  const now = new Date().toISOString();

  if (wo) {
    wo.status = 'Completed';
    wo.completedAt = now;
    wo.completionNotes = notes;
    wo.afterPhotoUrl = afterPhotoUrl;
    wo.updatedAt = now;
    saveWorkOrder(wo);
  }

  const complaintId = wo ? wo.complaintId : workOrderId;
  const issue = getIssue(complaintId);
  if (issue) {
    issue.status = 'In Progress'; // Remains in progress until officer verifies!
    issue.detailedStatus = 'RESOLUTION_SUBMITTED';
    issue.afterImageUrl = afterPhotoUrl;
    issue.aiVerification = aiVerification;
    issue.resolutionVerified = false; // Requires officer verification!
    issue.updatedAt = now;

    issue.timeline.push({
      status: 'RESOLUTION_SUBMITTED',
      note: `Field worker submitted completion evidence. AI Verification: ${aiVerification.recommendation} (${(aiVerification.verificationConfidence * 100).toFixed(0)}% confidence). Awaiting officer sign-off.`,
      actor: workerName,
      at: now,
    });

    addAuditLog({
      complaintId: issue.id,
      action: 'RESOLUTION_SUBMITTED',
      actorRole: 'FIELD_WORKER',
      actorName: workerName,
      details: {
        workOrderId,
        aiRecommendation: aiVerification.recommendation,
        confidence: aiVerification.verificationConfidence,
      },
    });

    addNotification({
      role: 'DEPARTMENT_OFFICER',
      title: 'Resolution Submitted for Review',
      message: `Work Order ${workOrderId} completed by ${workerName}. AI recommendation: ${aiVerification.recommendation}. Please review.`,
      type: 'RESOLUTION_SUBMITTED',
      complaintId: issue.id,
      isRead: false,
    });
  }

  return { issue, workOrder: wo };
}

/** Officer Verifies and Approves or Rejects Resolution */
export function verifyResolution(
  complaintId: string,
  approved: boolean,
  note: string,
  officerName: string,
): Issue | undefined {
  const issue = getIssue(complaintId);
  if (!issue) return undefined;
  const now = new Date().toISOString();

  if (approved) {
    issue.status = 'Resolved';
    issue.detailedStatus = 'VERIFIED';
    issue.resolutionVerified = true;
    issue.resolutionNote = note || 'Resolution inspected and approved by jurisdictional officer.';
    issue.updatedAt = now;

    if (issue.workOrderId) {
      const wo = getWorkOrder(issue.workOrderId);
      if (wo) {
        wo.status = 'Verified';
        wo.updatedAt = now;
        saveWorkOrder(wo);
      }
    }

    issue.timeline.push({
      status: 'VERIFIED',
      note: issue.resolutionNote,
      actor: officerName,
      at: now,
    });

    addAuditLog({
      complaintId: issue.id,
      action: 'RESOLUTION_OFFICIALLY_VERIFIED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: officerName,
      details: { approved: true, note },
    });

    addNotification({
      role: 'CITIZEN',
      title: 'Issue Resolved & Verified!',
      message: `Your reported issue "${issue.title}" has been verified and resolved by ${officerName}. Please confirm.`,
      type: 'COMPLAINT_VERIFIED',
      complaintId: issue.id,
      isRead: false,
    });
  } else {
    // Rejected: send back to in progress
    issue.status = 'In Progress';
    issue.detailedStatus = 'IN_PROGRESS';
    issue.resolutionVerified = false;
    issue.rejectionReason = note;
    issue.updatedAt = now;

    if (issue.workOrderId) {
      const wo = getWorkOrder(issue.workOrderId);
      if (wo) {
        wo.status = 'In Progress';
        wo.instructions = `REWORK REQUIRED: ${note}`;
        wo.updatedAt = now;
        saveWorkOrder(wo);
      }
    }

    issue.timeline.push({
      status: 'IN_PROGRESS',
      note: `Officer rejected resolution proof. Rework requested: ${note}`,
      actor: officerName,
      at: now,
    });

    addAuditLog({
      complaintId: issue.id,
      action: 'RESOLUTION_REJECTED_REWORK_REQUESTED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: officerName,
      details: { reason: note },
    });
  }

  return issue;
}

/** Citizen Confirms Resolution or Reopens */
export function citizenConfirm(
  complaintId: string,
  confirmed: boolean,
  feedback: string,
  citizenName: string,
): Issue | undefined {
  const issue = getIssue(complaintId);
  if (!issue) return undefined;
  const now = new Date().toISOString();

  if (confirmed) {
    issue.status = 'Resolved';
    issue.detailedStatus = 'CLOSED';
    issue.updatedAt = now;

    issue.timeline.push({
      status: 'CLOSED',
      note: feedback ? `Citizen confirmed fix: "${feedback}". Case closed.` : 'Citizen confirmed fix. Case closed.',
      actor: citizenName,
      at: now,
    });

    addAuditLog({
      complaintId: issue.id,
      action: 'COMPLAINT_CLOSED_BY_CITIZEN',
      actorRole: 'CITIZEN',
      actorName: citizenName,
      details: { confirmed: true, feedback },
    });
  } else {
    issue.status = 'Reported';
    issue.detailedStatus = 'REOPENED';
    issue.reopenReason = feedback || 'Citizen reported issue is still recurring or unsatisfactorily repaired.';
    issue.priority = Math.min(100, issue.priority + 10);
    issue.updatedAt = now;

    issue.timeline.push({
      status: 'REOPENED',
      note: `Citizen reopened complaint: "${issue.reopenReason}". Priority boosted.`,
      actor: citizenName,
      at: now,
    });

    addAuditLog({
      complaintId: issue.id,
      action: 'COMPLAINT_REOPENED_BY_CITIZEN',
      actorRole: 'CITIZEN',
      actorName: citizenName,
      details: { reason: feedback },
    });

    addNotification({
      role: 'DEPARTMENT_OFFICER',
      title: 'Complaint Reopened by Citizen',
      message: `Citizen disputed resolution for "${issue.title}": "${feedback}". Reopened with priority ${issue.priority}.`,
      type: 'COMPLAINT_REOPENED',
      complaintId: issue.id,
      isRead: false,
    });
  }

  return issue;
}

// ----- Audit & Notifications ----------------------------------------------

export function listAuditLogs(complaintId?: string): AuditLog[] {
  let rows = [...(db().auditLogs || [])];
  if (complaintId) rows = rows.filter((a) => a.complaintId === complaintId);
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
  const d = db();
  const log: AuditLog = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  d.auditLogs.unshift(log);
  return log;
}

export function listNotifications(role?: string, userId?: string): AppNotification[] {
  let rows = [...(db().notifications || [])];
  if (role) {
    const r = role.toUpperCase();
    rows = rows.filter((n) => n.role === r || n.role === 'ALL' || (userId && n.userId === userId));
  }
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt'>): AppNotification {
  const d = db();
  const n: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  d.notifications.unshift(n);
  return n;
}

export function markNotificationRead(id: string) {
  const n = db().notifications.find((x) => x.id === id);
  if (n) n.isRead = true;
}

function citizen(name: string): Citizen {
  const d = db();
  let c = d.citizens.find((x) => x.name === name);
  if (!c) {
    c = {
      id: `u${d.citizens.length + 1}`,
      name,
      avatar: '🧑',
      points: 0,
      reports: 0,
      verifications: 0,
      resolvedImpact: 0,
    };
    d.citizens.push(c);
  }
  return c;
}

function awardReport(name: string, severity: Severity) {
  const c = citizen(name);
  c.reports += 1;
  c.points += reportPoints(severity);
}

function awardVerification(name: string) {
  const c = citizen(name);
  c.verifications += 1;
  c.points += 5;
}

// ----- analytics -----------------------------------------------------------

export function getStats() {
  const issues = db().issues;
  const byStatus = countBy(issues, (i) => i.status);
  const bySeverity = countBy(issues, (i) => i.severity);
  const byCategory = countBy(issues, (i) => i.category);

  const resolved = issues.filter((i) => i.status === 'Resolved' || i.detailedStatus === 'CLOSED');
  const avgResolutionH = resolved.length
    ? Math.round(
        resolved.reduce(
          (s, i) =>
            s +
            (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) /
              3600_000,
          0,
        ) / resolved.length,
      )
    : 0;

  const overdue = issues.filter((i) => {
    if (i.status === 'Resolved' || i.detailedStatus === 'CLOSED') return false;
    const deadline = i.resolutionDeadline
      ? new Date(i.resolutionDeadline).getTime()
      : new Date(i.createdAt).getTime() + (i.slaHours || 48) * 3600_000;
    return Date.now() > deadline;
  }).length;

  return {
    total: issues.length,
    open: issues.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED').length,
    critical: issues.filter((i) => i.severity === 'Critical').length,
    pending: (byStatus['Reported'] ?? 0) + (byStatus['Acknowledged'] ?? 0),
    inProgress: byStatus['In Progress'] ?? 0,
    resolved: resolved.length,
    overdue,
    verifications: issues.reduce((s, i) => s + i.verifications, 0),
    avgResolutionH,
    byStatus,
    bySeverity,
    byCategory,
  };
}

export function getHotspots() {
  const groups = new Map<string, Issue[]>();
  for (const i of db().issues) {
    const area = i.wardName || i.location.split(',')[0].trim();
    const arr = groups.get(area) ?? [];
    arr.push(i);
    groups.set(area, arr);
  }
  const sevRank: Record<Severity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  return [...groups.entries()]
    .map(([area, arr]) => {
      const cat = countBy(arr, (i) => i.category);
      const topCategory = Object.entries(cat).sort((a, b) => b[1] - a[1])[0][0] as IssueCategory;
      const maxSeverity = arr.map((i) => i.severity).sort((a, b) => sevRank[b] - sevRank[a])[0];
      return {
        area,
        count: arr.length,
        topCategory,
        maxSeverity,
        openCount: arr.filter((i) => i.status !== 'Resolved' && i.detailedStatus !== 'CLOSED').length,
        geo: arr[0].geo,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getLeaderboard(): Citizen[] {
  return [...db().citizens].sort((a, b) => b.points - a.points);
}

function countBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, number> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<K, number>);
}
