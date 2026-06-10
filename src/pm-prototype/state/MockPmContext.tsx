/**
 * In-memory PM prototype state — session only, no persistence to Firebase.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  INITIAL_FEEDBACK,
  INITIAL_PARTIES,
  INITIAL_PROJECTS,
  INITIAL_SNAPSHOTS,
} from '../mock/fixtures';
import type {
  IntakeFormData,
  MockFeedback,
  MockProject,
  MockProjectParty,
  MockTdlrSourceSnapshot,
  ProjectStatus,
  ProjectTab,
  PrototypeView,
  QueueKey,
  ServiceScope,
} from '../types';

const IN_REVIEW_STATUSES: ProjectStatus[] = [
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
];

function deriveQueue(
  status: ProjectStatus,
  paymentPending: boolean,
  explicit?: QueueKey
): QueueKey {
  if (explicit === 'ready_for_tdlr_send') return explicit;
  if (paymentPending) return 'awaiting_payment';
  if (status === 'Submitted') return 'intake_pending';
  if (status === 'Assigned to RAS') return 'assigned_to_ras';
  if (IN_REVIEW_STATUSES.includes(status)) return 'in_review';
  if (status === 'Plan Review Complete' || status === 'Project Sent to TDLR') {
    return 'ready_for_tdlr_send';
  }
  return explicit ?? 'in_review';
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface MockPmContextValue {
  view: PrototypeView;
  activeProjectId: string | null;
  activeTab: ProjectTab;
  projects: MockProject[];
  parties: MockProjectParty[];
  snapshots: MockTdlrSourceSnapshot[];
  feedback: MockFeedback[];
  selectedQueue: QueueKey | 'all';
  goToDashboard: () => void;
  goToIntake: () => void;
  openProject: (projectId: string, tab?: ProjectTab) => void;
  setActiveTab: (tab: ProjectTab) => void;
  setSelectedQueue: (queue: QueueKey | 'all') => void;
  createProjectFromIntake: (data: IntakeFormData) => string;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  updateProjectScope: (projectId: string, scope: ServiceScope) => void;
  approveCandidateLink: (projectId: string, linkId: string) => void;
  addFeedback: (entry: Omit<MockFeedback, 'id' | 'createdAt'>) => void;
  resetMockData: () => void;
  getProject: (id: string) => MockProject | undefined;
  getProjectParties: (projectId: string) => MockProjectParty[];
  getProjectSnapshot: (projectId: string) => MockTdlrSourceSnapshot | undefined;
}

const MockPmContext = createContext<MockPmContextValue | null>(null);

export function MockPmProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<PrototypeView>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const [projects, setProjects] = useState<MockProject[]>(() => [...INITIAL_PROJECTS]);
  const [parties, setParties] = useState<MockProjectParty[]>(() => [...INITIAL_PARTIES]);
  const [snapshots, setSnapshots] = useState<MockTdlrSourceSnapshot[]>(() => [
    ...INITIAL_SNAPSHOTS,
  ]);
  const [feedback, setFeedback] = useState<MockFeedback[]>(() => [...INITIAL_FEEDBACK]);
  const [selectedQueue, setSelectedQueue] = useState<QueueKey | 'all'>('all');

  const goToDashboard = useCallback(() => {
    setView('dashboard');
    setActiveProjectId(null);
    setActiveTab('overview');
  }, []);

  const goToIntake = useCallback(() => {
    setView('intake');
    setActiveProjectId(null);
  }, []);

  const openProject = useCallback((projectId: string, tab: ProjectTab = 'overview') => {
    setActiveProjectId(projectId);
    setActiveTab(tab);
    setView('project');
  }, []);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const getProjectParties = useCallback(
    (projectId: string) => parties.filter((p) => p.projectId === projectId),
    [parties]
  );

  const getProjectSnapshot = useCallback(
    (projectId: string) => snapshots.find((s) => s.projectId === projectId),
    [snapshots]
  );

  const createProjectFromIntake = useCallback((data: IntakeFormData): string => {
    const id = nextId('proj');
    const projectName = data.siteName.trim() || 'Untitled Project';
    const newProject: MockProject = {
      id,
      ocgProjectNumber: data.ocgProjectNumber.trim() || `OCG-NEW-${id.slice(-4)}`,
      tabsNumber: data.tabsNumber.trim() || undefined,
      projectName,
      siteName: data.siteName.trim() || projectName,
      serviceScope: data.serviceScope,
      currentStatus: 'Submitted',
      statusHistory: [
        {
          at: new Date().toISOString(),
          toStatus: 'Submitted',
          by: 'Prototype intake (mock)',
          note: `Scenario: ${data.scenario}`,
        },
      ],
      clientLabel: data.client.trim() || 'Unnamed Client',
      ownerLabel: data.client.trim() || 'Owner TBD',
      dateReceived: data.dateReceived || new Date().toISOString().slice(0, 10),
      paymentPending: false,
      intakeScenario: data.scenario,
      queue: 'intake_pending',
    };

    const newParties: MockProjectParty[] = [
      {
        id: nextId('party'),
        projectId: id,
        role: 'Client',
        displayName: newProject.clientLabel,
        isCanonicalLinked: false,
      },
      {
        id: nextId('party'),
        projectId: id,
        role: 'Owner',
        displayName: 'Owner TBD — not same as Client',
        isCanonicalLinked: false,
      },
    ];

    setProjects((prev) => [newProject, ...prev]);
    setParties((prev) => [...newParties, ...prev]);

    if (data.tabsNumber.trim()) {
      setSnapshots((prev) => [
        ...prev,
        {
          projectId: id,
          tabsNumber: data.tabsNumber.trim(),
          capturedAt: new Date().toISOString(),
          asRecorded: {
            registrantName: '(mock) pending staff review',
            ownerName: '(mock) as-recorded owner',
            statusLabel: 'Registered (mock)',
            registrationDate: data.dateReceived,
          },
          candidateLinks: [
            {
              id: nextId('link'),
              partyRole: 'Owner',
              matchReason: 'Mock candidate — review only',
              approved: false,
            },
          ],
        },
      ]);
    }

    setActiveProjectId(id);
    setActiveTab('overview');
    setView('project');
    return id;
  }, []);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const entry = {
          at: new Date().toISOString(),
          fromStatus: p.currentStatus,
          toStatus: status,
          by: 'Prototype reviewer (mock)',
        };
        return {
          ...p,
          currentStatus: status,
          statusHistory: [entry, ...p.statusHistory],
          queue: deriveQueue(status, p.paymentPending, p.queue),
        };
      })
    );
  }, []);

  const updateProjectScope = useCallback((projectId: string, scope: ServiceScope) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, serviceScope: scope } : p))
    );
  }, []);

  const approveCandidateLink = useCallback((projectId: string, linkId: string) => {
    setSnapshots((prev) =>
      prev.map((s) => {
        if (s.projectId !== projectId) return s;
        return {
          ...s,
          candidateLinks: s.candidateLinks.map((link) =>
            link.id === linkId ? { ...link, approved: !link.approved } : link
          ),
        };
      })
    );
  }, []);

  const addFeedback = useCallback((entry: Omit<MockFeedback, 'id' | 'createdAt'>) => {
    setFeedback((prev) => [
      {
        ...entry,
        id: nextId('feedback'),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const resetMockData = useCallback(() => {
    setProjects([...INITIAL_PROJECTS]);
    setParties([...INITIAL_PARTIES]);
    setSnapshots([...INITIAL_SNAPSHOTS]);
    setFeedback([...INITIAL_FEEDBACK]);
    setView('dashboard');
    setActiveProjectId(null);
    setActiveTab('overview');
    setSelectedQueue('all');
  }, []);

  const value = useMemo<MockPmContextValue>(
    () => ({
      view,
      activeProjectId,
      activeTab,
      projects,
      parties,
      snapshots,
      feedback,
      selectedQueue,
      goToDashboard,
      goToIntake,
      openProject,
      setActiveTab,
      setSelectedQueue,
      createProjectFromIntake,
      updateProjectStatus,
      updateProjectScope,
      approveCandidateLink,
      addFeedback,
      resetMockData,
      getProject,
      getProjectParties,
      getProjectSnapshot,
    }),
    [
      view,
      activeProjectId,
      activeTab,
      projects,
      parties,
      snapshots,
      feedback,
      selectedQueue,
      goToDashboard,
      goToIntake,
      openProject,
      createProjectFromIntake,
      updateProjectStatus,
      updateProjectScope,
      approveCandidateLink,
      addFeedback,
      resetMockData,
      getProject,
      getProjectParties,
      getProjectSnapshot,
    ]
  );

  return <MockPmContext.Provider value={value}>{children}</MockPmContext.Provider>;
}

export function useMockPm(): MockPmContextValue {
  const ctx = useContext(MockPmContext);
  if (!ctx) {
    throw new Error('useMockPm must be used within MockPmProvider');
  }
  return ctx;
}
