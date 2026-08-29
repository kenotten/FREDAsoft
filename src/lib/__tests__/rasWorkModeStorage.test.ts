import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRasWorkMode, saveRasWorkMode } from '../rasWorkModeStorage';
import { FREDASOFT_RAS_WORK_MODE_STORAGE_KEY } from '../storageKeys';

const mem: Record<string, string> = {};

describe('ras work mode sticky storage', () => {
  beforeEach(() => {
    for (const k of Object.keys(mem)) delete mem[k];
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem[key] ?? null,
      setItem: (key: string, value: string) => {
        mem[key] = value;
      },
      removeItem: (key: string) => {
        delete mem[key];
      },
    });
  });

  it('defaults to inspection and keys by project', () => {
    expect(loadRasWorkMode('proj-a')).toBe('inspection');
    saveRasWorkMode('proj-a', 'plan_review');
    saveRasWorkMode('proj-b', 'inspection');
    expect(loadRasWorkMode('proj-a')).toBe('plan_review');
    expect(loadRasWorkMode('proj-b')).toBe('inspection');
    expect(loadRasWorkMode('')).toBe('inspection');
    expect(mem[FREDASOFT_RAS_WORK_MODE_STORAGE_KEY]).toContain('proj-a');
  });
});
