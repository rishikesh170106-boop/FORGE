// Core domain types for Community Hero — the hyperlocal problem solver.

export type IssueCategory =
  | 'Pothole'
  | 'Streetlight'
  | 'Water Leak'
  | 'Garbage'
  | 'Drainage'
  | 'Tree / Hazard'
  | 'Traffic Signal'
  | 'Stray Animals'
  | 'Public Toilet'
  | 'Encroachment'
  | 'Other';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueStatus =
  | 'Reported'
  | 'Acknowledged'
  | 'In Progress'
  | 'Resolved';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface StatusEvent {
  status: IssueStatus | DetailedComplaintStatus | string;
  note: string;
  at: string; // ISO timestamp
  actor: string; // who moved it (Agent, Citizen, Dept)
}

export interface Issue {
  id: string;
  /** human-friendly reference code (e.g. CH-1042); falls back to id in memory mode. */
  ref?: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: Severity;
  status: IssueStatus;
  /** AI-assigned 0-100 priority score combining severity, duplicates, risk. */
  priority: number;
  /** Confidence (0-1) of the AI vision classification. */
  confidence: number;
  /** Short risk note from the safety assessment. */
  safetyRisk: string;
  tags: string[];
  location: string;
  geo: GeoPoint;
  department: string;
  departmentId?: string;
  wardId?: string;
  wardName?: string;
  /** Service-level target in hours. */
  slaHours: number;
  resolutionDeadline?: string;
  /** Detailed lifecycle status */
  detailedStatus?: DetailedComplaintStatus;
  /** Assigned staff */
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  /** Official work-order reference filed by the agent. */
  workOrderId: string;
  /** Citizen-facing advisory drafted by the agent. */
  advisory: string;
  imageDataUrl?: string;
  /** "After" photo uploaded by the authority on resolution. */
  afterImageUrl?: string;
  /** Gemini Vision verdict on whether the after-photo proves a genuine fix. */
  resolutionVerified?: boolean;
  resolutionConfidence?: number;
  resolutionNote?: string;
  rejectionReason?: string;
  reopenReason?: string;
  citizenConfirmed?: boolean;
  citizenFeedback?: string;
  activeWorkOrder?: WorkOrder;
  aiVerification?: AIVerificationResult | null;
  reporter: string;
  reporterId?: string;
  verifications: number;
  /** community pushback count — 3+ flags the issue for review. */
  disputes?: number;
  /** auto-escalated because it breached its SLA while still open. */
  escalated?: boolean;
  /** ids of issues the agent flagged as likely duplicates. */
  duplicateOf?: string;
  createdAt: string;
  updatedAt: string;
  timeline: StatusEvent[];
}

export interface Ward {
  id: string;
  code?: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  population?: number;
  headOfficerName?: string;
  supervisorName?: string;
  contactNumber?: string;
}

export interface Department {
  key: IssueCategory;
  name: string;
  code?: string;
  id?: string;
  category?: string;
  slaHours: number;
  contact: string;
  escalation: string;
}

export interface Citizen {
  id: string;
  name: string;
  avatar: string; // emoji
  points: number;
  reports: number;
  verifications: number;
  resolvedImpact: number;
}

/** A single observable step the triage agent emits while it works. */
export interface AgentStep {
  id: string;
  /** lucide-react icon name rendered on the client. */
  icon: string;
  title: string;
  detail: string;
  status: 'running' | 'done';
  /** optional tool name when this step is a tool call. */
  tool?: string;
  data?: Record<string, unknown>;
  at: string;
}

export interface TriageResult {
  issue: Issue;
  steps: AgentStep[];
  duplicate?: { id: string; title: string; distanceM: number };
}

export interface Insight {
  type: 'hotspot' | 'prediction' | 'recommendation' | 'trend';
  title: string;
  detail: string;
  severity: Severity;
  area?: string;
}

export type UserRole =
  | 'CITIZEN'
  | 'DEPARTMENT_OFFICER'
  | 'FIELD_WORKER'
  | 'MUNICIPAL_ADMIN'
  | 'authority'
  | 'citizen';

export type DetailedComplaintStatus =
  | 'SUBMITTED'
  | 'AI_ANALYZED'
  | 'ROUTED'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLUTION_SUBMITTED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'REJECTED'
  | 'REOPENED'
  | 'ESCALATED';

export interface WorkOrder {
  id: string;
  complaintId: string;
  departmentId?: string;
  departmentName?: string;
  officerId?: string;
  officerName?: string;
  workerId?: string;
  workerName: string;
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Verified' | 'Closed';
  instructions?: string;
  deadline?: string;
  startedAt?: string;
  completedAt?: string;
  completionNotes?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  complaintId: string;
  action: string;
  actorRole: string;
  actorName: string;
  actorId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  role?: string;
  title: string;
  message: string;
  type: string;
  complaintId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AIVerificationResult {
  issueIdentified?: string;
  issueIdentifiedInOriginal?: string;
  isResolved: boolean;
  repairedProperly?: boolean;
  remainingDamage?: string;
  remainingVisibleDamage?: string;
  verificationConfidence: number;
  explanation: string;
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  createdAt?: string;
}
