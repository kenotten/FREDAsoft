import { FREDASOFT_RAS_WORK_MODE_STORAGE_KEY } from './storageKeys';
import { isRasWorkMode, type RasWorkMode } from './workProduct';

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readMap(): Record<string, RasWorkMode> {
  const ls = storage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(FREDASOFT_RAS_WORK_MODE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, RasWorkMode> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (k && isRasWorkMode(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** Sticky Review/Inspection mode keyed by Project. Default Inspection. Not stored on the Project document. */
export function loadRasWorkMode(projectId: string | null | undefined): RasWorkMode {
  const id = String(projectId || '').trim();
  if (!id) return 'inspection';
  return readMap()[id] || 'inspection';
}

export function saveRasWorkMode(projectId: string | null | undefined, mode: RasWorkMode): void {
  const id = String(projectId || '').trim();
  if (!id || !isRasWorkMode(mode)) return;
  const ls = storage();
  if (!ls) return;
  try {
    const map = readMap();
    map[id] = mode;
    ls.setItem(FREDASOFT_RAS_WORK_MODE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}
