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

/** TABS #tblContacts row — as-recorded source only (exact Contact Type spellings). */
export interface MockTabsContactRow {
  id: string;
  contactType: string;
  name: string;
  contactOrProfessionalName: string;
  address: string;
  phone: string;
  email: string;
  typeOfLicense: string;
  license: string;
  isCurrent: boolean;
}

/** TABS Project Status Updates (#psu_info) row — source transaction history. */
export interface MockTabsStatusUpdateRow {
  id: string;
  description: string;
  reportDate: string;
  submittedOn: string;
  status: string;
}

/** TABS Inspection modal — InspectionUploadedTable row (source only). */
export interface MockTabsInspectionDocumentRow {
  id: string;
  ras: string;
  document: string;
  file: string;
  reported: string;
  submitted: string;
  status: string;
}

/** Extended Manage Project #proj_ident read-only fields (lbl* panel). */
export interface MockTabsManagePanelFields {
  projectName: string;
  buildingOrFacilityName: string;
  address: string;
  scopeOfWork: string;
  squareFootage: string;
  estStartDate: string;
  estEndDate: string;
  estimatedCost: string;
  jobClass: string;
  ownerClass: string;
  privateFundsByTenant: string;
  rasDisplay: string;
  tenant: string;
  cadNumber: string;
  roadwayConstruction: string;
  stateProject: string;
  specialCategory: string;
  stateLeaseNumber: string;
}

/** Observed PSUUPDocumentTypeId option labels — checklist reference only. */
export const TABS_DOCUMENT_TYPE_OPTIONS = [
  'Article of Formation Documents',
  'Construction Documents (CDs)',
  'County Appraisal District Documents',
  'Ground Lease',
  'Inspection Response Form',
  'Limited Liability Ownership',
  'Miscellaneous',
  'Notice of Substantial Compliance',
  'Owner Agent Designation',
  'Proof of Inspection Form',
  'Proof of Re-Inspection Form',
  'Proof of Submission',
  'Registration form (if registered by RAS)',
  'Request for Inspection',
  'Request for Re-Inspection',
  'Texas Secretary of State records Documents',
] as const;

export interface MockTdlrSourceSnapshot {
  projectId: string;
  tabsNumber: string;
  capturedAt: string;
  asRecorded: {
    registrantName: string;
    ownerName: string;
    statusLabel: string;
    registrationDate: string;
    /** lblProjectId — legacy/TABS project id shape */
    projectIdLabel: string;
    lastAction: string;
    projectCreatedBy: string;
    planReviewBy: string;
    inspectionBy: string;
    dataVersionId: string;
  };
  tabsContacts: MockTabsContactRow[];
  tabsStatusUpdates: MockTabsStatusUpdateRow[];
  /** Optional Manage Project panel detail for validation samples. */
  managePanel?: MockTabsManagePanelFields;
  /** Generic TABS notice (e.g. enforcement) — sanitized text only. */
  sourceNote?: string;
  /** InspectionUploadedTable rows when present. */
  inspectionDocuments?: MockTabsInspectionDocumentRow[];
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
  /** Visual marker for TABS validation sample projects (sanitized). */
  validationSampleLabel?: string;
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

/** Canonical stakeholder directory entry — mock operational track only. */
export type StakeholderType =
  | 'Client'
  | 'Owner'
  | 'Tenant'
  | 'Design Firm'
  | 'Owner Agent'
  | 'RAS Firm'
  | 'Contact Person'
  | 'Other';

export type StakeholderEntityKind = 'entity' | 'person';

export type StakeholderReviewDecision =
  | 'unreviewed'
  | 'linked'
  | 'create-draft'
  | 'deferred'
  | 'rejected';

export const STAKEHOLDER_REVIEW_DECISION_LABELS: Record<StakeholderReviewDecision, string> = {
  unreviewed: 'Unreviewed',
  linked: 'Linked to candidate',
  'create-draft': 'Create draft recommended',
  deferred: 'Deferred',
  rejected: 'Rejected',
};

export interface MockCanonicalStakeholder {
  id: string;
  displayName: string;
  stakeholderType: StakeholderType;
  entityKind: StakeholderEntityKind;
  email?: string;
  phone?: string;
  address?: string;
}

/** Staff review of a TABS #tblContacts row vs canonical stakeholder candidates. */
export interface MockStakeholderLinkReview {
  id: string;
  projectId: string;
  tabsContactRowId: string;
  candidateStakeholderId?: string;
  matchReason: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reviewDecision: StakeholderReviewDecision;
  reviewNote: string;
}
