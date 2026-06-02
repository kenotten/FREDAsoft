import {
  ALL_AUDIT_WARNING_CODES,
  createDefaultWarningVisibility,
  type AuditMode,
  type AuditWarningCode,
} from './projectAuditReport';
import { PROJECT_AUDIT_SESSION_STORAGE_KEY } from './storageKeys';

export type ProjectAuditProjectStateV1 = {
  mode: AuditMode;
  facilityFilter: string;
  search: string;
  contentIssuesOnly: boolean;
  warningPanelOpen: boolean;
  enabledCodes: AuditWarningCode[];
  hideCustomLinkageNoise: boolean;
  /** Group keys stored as collapsed (accordion closed). */
  collapsedGroupKeys: string[];
};

type ProjectAuditSessionStoreV1 = {
  v: 1;
  projects: Record<string, ProjectAuditProjectStateV1>;
};

function isAuditMode(value: unknown): value is AuditMode {
  return value === 'finding' || value === 'recommendation';
}

function isAuditWarningCode(value: unknown): value is AuditWarningCode {
  return typeof value === 'string' && (ALL_AUDIT_WARNING_CODES as readonly string[]).includes(value);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function parseEnabledCodes(value: unknown): AuditWarningCode[] {
  if (value === undefined || value === null) return [...ALL_AUDIT_WARNING_CODES];
  if (!Array.isArray(value)) return [...ALL_AUDIT_WARNING_CODES];
  if (value.length === 0) return [];
  const codes = value.filter(isAuditWarningCode);
  if (codes.length === 0) return [...ALL_AUDIT_WARNING_CODES];
  const seen = new Set<AuditWarningCode>();
  const out: AuditWarningCode[] = [];
  for (const code of codes) {
    if (!seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}

/** Hydrate enabled warning codes from session; empty array = badges off, not record filter. */
export function hydrateEnabledWarningCodes(value: unknown): Set<AuditWarningCode> {
  return new Set(parseEnabledCodes(value));
}

export function createDefaultProjectAuditProjectState(): ProjectAuditProjectStateV1 {
  const defaults = createDefaultWarningVisibility();
  return {
    mode: 'finding',
    facilityFilter: '__all__',
    search: '',
    contentIssuesOnly: false,
    warningPanelOpen: false,
    enabledCodes: [...defaults.enabledCodes],
    hideCustomLinkageNoise: defaults.hideCustomLinkageNoise,
    collapsedGroupKeys: [],
  };
}

function parseProjectState(value: unknown): ProjectAuditProjectStateV1 | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (!isAuditMode(o.mode)) return null;
  return {
    mode: o.mode,
    facilityFilter: typeof o.facilityFilter === 'string' ? o.facilityFilter : '__all__',
    search: typeof o.search === 'string' ? o.search : '',
    contentIssuesOnly: typeof o.contentIssuesOnly === 'boolean' ? o.contentIssuesOnly : false,
    warningPanelOpen: typeof o.warningPanelOpen === 'boolean' ? o.warningPanelOpen : false,
    enabledCodes: parseEnabledCodes(o.enabledCodes),
    hideCustomLinkageNoise:
      typeof o.hideCustomLinkageNoise === 'boolean' ? o.hideCustomLinkageNoise : false,
    collapsedGroupKeys: parseStringArray(o.collapsedGroupKeys),
  };
}

export function normalizeProjectAuditProjectId(projectId: string): string {
  return String(projectId || '').trim();
}

function loadStore(): ProjectAuditSessionStoreV1 {
  if (typeof sessionStorage === 'undefined') {
    return { v: 1, projects: {} };
  }
  try {
    const raw = sessionStorage.getItem(PROJECT_AUDIT_SESSION_STORAGE_KEY);
    if (!raw) return { v: 1, projects: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { v: 1, projects: {} };
    const o = parsed as Record<string, unknown>;
    if (o.v !== 1 || !o.projects || typeof o.projects !== 'object') {
      return { v: 1, projects: {} };
    }
    const projects: Record<string, ProjectAuditProjectStateV1> = {};
    for (const [key, value] of Object.entries(o.projects as Record<string, unknown>)) {
      const pid = normalizeProjectAuditProjectId(key);
      if (!pid) continue;
      const state = parseProjectState(value);
      if (state) projects[pid] = state;
    }
    return { v: 1, projects };
  } catch {
    return { v: 1, projects: {} };
  }
}

function saveStore(store: ProjectAuditSessionStoreV1): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(PROJECT_AUDIT_SESSION_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function loadProjectAuditStateForProject(projectId: string): ProjectAuditProjectStateV1 | null {
  const pid = normalizeProjectAuditProjectId(projectId);
  if (!pid) return null;
  const store = loadStore();
  return store.projects[pid] ?? null;
}

export type ProjectAuditStateSaveInput = {
  mode: AuditMode;
  facilityFilter: string;
  search: string;
  contentIssuesOnly: boolean;
  warningPanelOpen: boolean;
  enabledCodes: Iterable<AuditWarningCode>;
  hideCustomLinkageNoise: boolean;
  collapsedGroupKeys: Iterable<string>;
};

export function saveProjectAuditStateForProject(
  projectId: string,
  state: ProjectAuditStateSaveInput
): void {
  const pid = normalizeProjectAuditProjectId(projectId);
  if (!pid) return;
  const store = loadStore();
  const enabledCodes = [...state.enabledCodes].filter(isAuditWarningCode);
  store.projects[pid] = {
    mode: state.mode,
    facilityFilter: String(state.facilityFilter ?? '__all__'),
    search: String(state.search ?? ''),
    contentIssuesOnly: Boolean(state.contentIssuesOnly),
    warningPanelOpen: Boolean(state.warningPanelOpen),
    enabledCodes,
    hideCustomLinkageNoise: Boolean(state.hideCustomLinkageNoise),
    collapsedGroupKeys: [...state.collapsedGroupKeys].filter((key) => key.trim() !== ''),
  };
  saveStore(store);
}

export function clearProjectAuditSessionState(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(PROJECT_AUDIT_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Prune collapsed keys that no longer exist; reset facility if not in options. */
export function reconcileProjectAuditProjectState(
  state: ProjectAuditProjectStateV1,
  facilityOptionIds: readonly string[]
): ProjectAuditProjectStateV1 {
  const validFacilities = new Set(facilityOptionIds);
  const facilityFilter = validFacilities.has(state.facilityFilter)
    ? state.facilityFilter
    : '__all__';
  return {
    ...state,
    facilityFilter,
    enabledCodes: parseEnabledCodes(state.enabledCodes),
  };
}

export function reconcileCollapsedGroupKeys(
  collapsedGroupKeys: Iterable<string>,
  validGroupKeys: ReadonlySet<string>
): string[] {
  return [...collapsedGroupKeys].filter((key) => validGroupKeys.has(key));
}
