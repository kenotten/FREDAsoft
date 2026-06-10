/**
 * PM Prototype types — mock only. Not Firestore schema. Not production types.
 */

export type IntakeScenario =
  | 'preliminary_review'
  | 'tabs_registered'
  | 'ocg_assisted_registration'
  | 'inspection_only_transfer'
  | 'ocg_pending_tabs';

export const INTAKE_SCENARIO_LABELS: Record<IntakeScenario, string> = {
  preliminary_review: 'Preliminary review',
  tabs_registered: 'TABS registered',
  ocg_assisted_registration: 'OCG-assisted registration',
  inspection_only_transfer: 'Inspection-only transfer',
  ocg_pending_tabs: 'OCG # pending TABS',
};

export type ServiceScope =
  | 'Preliminary review only'
  | 'Plan review only'
  | 'Inspection only'
  | 'Plan review + inspection'
  | 'OCG-assisted registration'
  | 'File transfer / takeover inspection';

export const SERVICE_SCOPES: ServiceScope[] = [
  'Preliminary review only',
  'Plan review only',
  'Inspection only',
  'Plan review + inspection',
  'OCG-assisted registration',
  'File transfer / takeover inspection',
];

export type ProjectStatus =
  | 'Submitted'
  | 'Assigned to RAS'
  | 'Preliminary Review'
  | 'Preliminary Review Complete'
  | 'Plan Review'
  | 'Plan Review Complete'
  | 'Special Inspection'
  | 'Special Inspection Complete'
  | 'Inspection'
  | 'Inspection Approved'
  | 'Inspection Disapproved'
  | 'Response Approved'
  | 'Project Closed'
  | 'Project Sent to TDLR';

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Submitted',
  'Assigned to RAS',
  'Preliminary Review',
  'Preliminary Review Complete',
  'Plan Review',
  'Plan Review Complete',
  'Special Inspection',
  'Special Inspection Complete',
  'Inspection',
  'Inspection Approved',
  'Inspection Disapproved',
  'Response Approved',
  'Project Closed',
  'Project Sent to TDLR',
];

export type PartyRole = 'Client' | 'Owner' | 'DesignProfessional' | 'OwnerAgent';

export const PARTY_ROLE_LABELS: Record<PartyRole, string> = {
  Client: 'Client',
  Owner: 'Owner',
  DesignProfessional: 'Design Professional',
  OwnerAgent: 'Owner Agent',
};

export type QueueKey =
  | 'intake_pending'
  | 'assigned_to_ras'
  | 'in_review'
  | 'awaiting_payment'
  | 'ready_for_tdlr_send';

export const QUEUE_LABELS: Record<QueueKey, string> = {
  intake_pending: 'Intake Pending',
  assigned_to_ras: 'Assigned to RAS',
  in_review: 'In Review',
  awaiting_payment: 'Awaiting Payment',
  ready_for_tdlr_send: 'Ready for TDLR Send',
};

export interface MockProjectParty {
  id: string;
  projectId: string;
  role: PartyRole;
  displayName: string;
  email?: string;
  phone?: string;
  isPrimaryCorrespondence?: boolean;
  isCanonicalLinked: boolean;
}

export interface MockTdlrSourceSnapshot {
  projectId: string;
  tabsNumber: string;
  capturedAt: string;
  asRecorded: {
    registrantName: string;
    ownerName: string;
    statusLabel: string;
    registrationDate: string;
  };
  candidateLinks: {
    id: string;
    partyRole: PartyRole;
    matchReason: string;
    approved: boolean;
  }[];
}

export interface StatusHistoryEntry {
  at: string;
  fromStatus?: ProjectStatus;
  toStatus: ProjectStatus;
  by: string;
  note?: string;
}

export interface MockProject {
  id: string;
  ocgProjectNumber: string;
  tabsNumber?: string;
  projectName: string;
  siteName: string;
  serviceScope: ServiceScope;
  currentStatus: ProjectStatus;
  statusHistory: StatusHistoryEntry[];
  clientLabel: string;
  ownerLabel: string;
  dateReceived: string;
  assignedRas?: string;
  nextDueDate?: string;
  paymentPending: boolean;
  intakeScenario?: IntakeScenario;
  queue: QueueKey;
}

export interface MockFeedback {
  id: string;
  screen: string;
  issueType: string;
  reviewerName: string;
  notes: string;
  createdAt: string;
  projectId?: string;
}

export type PrototypeView = 'dashboard' | 'intake' | 'project';

export type ProjectTab = 'overview' | 'parties' | 'source' | 'status' | 'feedback';

export interface IntakeFormData {
  scenario: IntakeScenario;
  ocgProjectNumber: string;
  tabsNumber: string;
  client: string;
  siteName: string;
  serviceScope: ServiceScope;
  dateReceived: string;
}
