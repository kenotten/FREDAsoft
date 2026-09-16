import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../..');

const pmFiles = [
  'src/lib/pmProjectSearch.ts',
  'src/lib/pmProjectOverview.ts',
  'src/components/pm/ProjectManagementView.tsx',
  'src/components/pm/ProjectList.tsx',
  'src/components/pm/ProjectOverview.tsx',
];

describe('PM Slice 1 code-path boundary', () => {
  it('keeps PM selection local and does not write workspace or Firestore', () => {
    for (const relative of pmFiles) {
      const src = readFileSync(path.join(root, relative), 'utf8');
      expect(src, relative).not.toMatch(/workspaceContext/);
      expect(src, relative).not.toMatch(/setUserPreferences/);
      expect(src, relative).not.toMatch(/userPreferences/);
      expect(src, relative).not.toMatch(/firestoreService/);
      expect(src, relative).not.toMatch(/updateDoc/);
      expect(src, relative).not.toMatch(/setDoc/);
      expect(src, relative).not.toMatch(/writeBatch/);
      expect(src, relative).not.toMatch(/setSelections/);
      expect(src, relative).not.toMatch(/handleSetActiveProject/);
      expect(src, relative).not.toMatch(/useProjectData/);
      expect(src, relative).not.toMatch(/projectData/);
      expect(src, relative).not.toMatch(/pm-prototype/);
      expect(src, relative).not.toMatch(/MockPm/);
    }
  });
});
