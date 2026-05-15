import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Search, ChevronRight, ChevronDown, Book, FileText, Hash, Info, AlertCircle, Image as ImageIcon, Database, Plus, X } from 'lucide-react';
import { MasterStandard } from '../types';
import { STANDARDS_BROWSER_SELECTION_STORAGE_PREFIX, STANDARDS_BROWSER_UI_STORAGE_PREFIX } from '../lib/storageKeys';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lowercase for search; avoids crashes when master_standards fields are null/undefined */
function searchFieldLower(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

const StandardItem = ({
  s,
  onSelect,
  isDuplicate,
  expansionMode,
  isExpandedControlled,
  onToggleExpand,
}: {
  s: MasterStandard;
  onSelect?: (s: MasterStandard) => void;
  isDuplicate?: boolean;
  expansionMode: 'default' | 'accordion';
  isExpandedControlled?: boolean;
  onToggleExpand?: () => void;
}) => {
  const [isExpandedLocal, setIsExpandedLocal] = useState(false);
  const isExpanded = expansionMode === 'accordion' ? Boolean(isExpandedControlled) : isExpandedLocal;
  const isAdv = s.relation_type === 'Advisory';
  const isExc = s.relation_type === 'Exception';
  const isFig = s.relation_type === 'Figure';

  return (
    <div 
      draggable={true}
      onDragStart={(e) => {
        const data = JSON.stringify(s);
        e.dataTransfer.setData('application/json', data);
        e.dataTransfer.setData('text/plain', data);
        e.dataTransfer.setData('standardId', s.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => {
        if (expansionMode === 'accordion') {
          onToggleExpand?.();
        } else {
          setIsExpandedLocal((v) => !v);
        }
      }}
      className={cn(
        "p-3 border rounded-lg transition-all relative group cursor-grab active:cursor-grabbing hover:shadow-sm",
        isDuplicate ? "bg-orange-500/20 border-orange-200 hover:border-orange-300" :
        isAdv ? "bg-blue-50/50 border-blue-100 hover:border-blue-200" : 
        isExc ? "bg-amber-50/50 border-amber-100 hover:border-amber-200" : 
        isFig ? "bg-zinc-50/50 border-zinc-100 hover:border-zinc-200" :
        "bg-white border-zinc-100 hover:border-zinc-300"
      )}
    >
      <div className="flex items-start gap-2">
        {isDuplicate ? <AlertCircle size={12} className="text-orange-600 mt-0.5 flex-shrink-0" /> :
         isAdv ? <Info size={12} className="text-blue-500 mt-0.5 flex-shrink-0" /> :
         isExc ? <AlertCircle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" /> :
         isFig ? <ImageIcon size={12} className="text-zinc-400 mt-0.5 flex-shrink-0" /> :
         <Hash size={12} className="text-zinc-400 mt-0.5 flex-shrink-0" />}
        
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
              <p className="text-[10px] font-bold text-zinc-900">{s.citation_num}</p>
              {s.relation_type !== 'Standard' && (
                <span className={cn(
                  "text-[8px] px-1 rounded font-bold uppercase",
                  isAdv ? "bg-blue-100 text-blue-700" : 
                  isExc ? "bg-amber-100 text-amber-700" :
                  isFig ? "bg-zinc-100 text-zinc-700" :
                  "bg-zinc-100 text-zinc-700"
                )}>
                  {s.relation_type}
                </span>
              )}
              {s.citation_name && (
                <p className="text-[10px] font-bold text-zinc-500">{s.citation_name}</p>
              )}
            </div>
            <p className={cn(
              "text-[10px] text-zinc-600 leading-relaxed",
              isExpanded ? "" : "line-clamp-3"
            )}>
              {s.content_text}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(s);
            }}
            className="p-1 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded transition-colors"
            title="Add to Glossary"
          >
            <Plus size={14} />
          </button>
      </div>
    </div>
  );
};

type PersistedStandardsBrowserUi = {
  searchQuery?: string;
  expandedChapters?: Record<string, boolean>;
  expandedSections?: Record<string, boolean>;
  expandedStandardItemId?: string | null;
};

/** First-seen canonical trimmed type per normalized key */
function canonicalTypeMapFromStandards(list: MasterStandard[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of list) {
    const raw = s.fldStandardType;
    if (raw == null || String(raw).trim() === '') continue;
    const canon = String(raw).trim();
    const nk = canon.toLowerCase();
    if (!m.has(nk)) m.set(nk, canon);
  }
  return m;
}

/** null = no/invalid preference; 'ALL'; or canonical type string from data */
function resolveCanonicalStoredType(persistedType: unknown, list: MasterStandard[]): 'ALL' | string | null {
  if (persistedType === undefined || persistedType === null) return null;
  const raw = String(persistedType).trim();
  if (raw === '') return null;
  if (raw.toUpperCase() === 'ALL') return 'ALL';
  const m = canonicalTypeMapFromStandards(list);
  return m.get(raw.toLowerCase()) ?? null;
}

/** 'ALL', canonical version, or null if invalid non-ALL */
function resolveCanonicalStoredVersionForType(
  canonicalType: string,
  persistedVersion: unknown,
  list: MasterStandard[]
): 'ALL' | string | null {
  if (persistedVersion === undefined || persistedVersion === null) return 'ALL';
  const rawPv = String(persistedVersion).trim();
  if (rawPv === '' || rawPv.toUpperCase() === 'ALL') return 'ALL';
  const rows =
    canonicalType === 'ALL'
      ? list
      : list.filter(
          (s) => String(s.fldStandardType ?? '').trim().toLowerCase() === canonicalType.toLowerCase()
        );
  const vm = new Map<string, string>();
  for (const s of rows) {
    const v = s.fldStandardVersion;
    if (v == null || String(v).trim() === '') continue;
    const cv = String(v).trim();
    vm.set(cv.toLowerCase(), cv);
  }
  return vm.get(rawPv.toLowerCase()) ?? null;
}

/** True if any loaded standard row uses this type (non-ALL). */
function catalogHasStandardType(type: string, list: MasterStandard[]): boolean {
  if (!type || type.toUpperCase() === 'ALL') return true;
  const want = type.trim().toLowerCase();
  return list.some((s) => String(s.fldStandardType ?? '').trim().toLowerCase() === want);
}

/** True if any loaded row matches type + version (non-ALL version). */
function catalogHasStandardTypeVersion(
  type: string,
  version: string,
  list: MasterStandard[]
): boolean {
  if (!version || version.toUpperCase() === 'ALL') return true;
  const wantV = version.trim().toLowerCase();
  if (!type || type.toUpperCase() === 'ALL') {
    return list.some((s) => String(s.fldStandardVersion ?? '').trim().toLowerCase() === wantV);
  }
  const wantT = type.trim().toLowerCase();
  return list.some((s) => {
    const tt = String(s.fldStandardType ?? '').trim().toLowerCase();
    const vv = String(s.fldStandardVersion ?? '').trim().toLowerCase();
    return tt === wantT && vv === wantV;
  });
}

function readPersistedUiFromStorage(key: string): PersistedStandardsBrowserUi | null {
  try {
    const raw = sessionStorage.getItem(STANDARDS_BROWSER_UI_STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedStandardsBrowserUi;
  } catch {
    return null;
  }
}

type PersistedStandardSelection = { selectedType?: string; selectedVersion?: string };

function readPersistedStandardSelection(key: string): PersistedStandardSelection | null {
  try {
    const raw = sessionStorage.getItem(STANDARDS_BROWSER_SELECTION_STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedStandardSelection;
  } catch {
    return null;
  }
}

function writePersistedStandardSelection(key: string, selectedType: string, selectedVersion: string) {
  try {
    sessionStorage.setItem(
      STANDARDS_BROWSER_SELECTION_STORAGE_PREFIX + key,
      JSON.stringify({ selectedType, selectedVersion })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function selectionStorageSkipsTas2012(
  key: string | undefined,
  list: MasterStandard[]
): { skipTas: boolean; skip2012: boolean } {
  if (!key || !list.length) return { skipTas: false, skip2012: false };
  const stored = readPersistedStandardSelection(key);
  if (!stored) return { skipTas: false, skip2012: false };
  const ct = resolveCanonicalStoredType(stored.selectedType, list);
  if (ct === null) return { skipTas: false, skip2012: false };
  return { skipTas: true, skip2012: true };
}

/** Lazy useState + layout restore: read session selection with same rules as first paint. */
function computeInitialStandardSelection(
  key: string | undefined,
  list: MasterStandard[]
): { selectedType: string; selectedVersion: string } {
  const types = new Set(list.map((s) => s.fldStandardType).filter(Boolean));
  const versions = new Set(list.map((s) => s.fldStandardVersion).filter(Boolean));
  const fallbackType = types.has('TAS') ? 'TAS' : 'ALL';
  const fallbackVersion = versions.has('2012') ? '2012' : 'ALL';

  if (!key || !list.length) {
    return { selectedType: fallbackType, selectedVersion: fallbackVersion };
  }

  const stored = readPersistedStandardSelection(key);
  if (!stored) {
    return { selectedType: fallbackType, selectedVersion: fallbackVersion };
  }

  const ct = resolveCanonicalStoredType(stored.selectedType, list);
  if (ct === null) {
    return { selectedType: fallbackType, selectedVersion: fallbackVersion };
  }

  const selectedType = ct;
  const vr = resolveCanonicalStoredVersionForType(ct, stored.selectedVersion, list);
  const selectedVersion = vr === null ? 'ALL' : vr;
  return { selectedType, selectedVersion };
}

function sectionStorageKey(chapterName: string, sectionName: string, accordion: boolean) {
  return accordion ? `${chapterName}\0${sectionName}` : sectionName;
}

interface StandardsBrowserProps {
  standards: MasterStandard[];
  onSelect?: (standard: MasterStandard) => void;
  onSeed?: () => void;
  className?: string;
  showSearchClear?: boolean;
  showBulkExpandControls?: boolean;
  treeExpansionMode?: 'default' | 'accordion';
  uiResetKey?: string | null;
  persistUiStateKey?: string | null;
  /** Session-scoped sessionStorage key for selectedType/selectedVersion only (e.g. Data Entry). */
  standardSelectionPersistKey?: string;
  /** Optional external nudge to sync type/version once per syncToken change (manual edits remain allowed after sync). */
  preferredStandardContext?: {
    type?: string;
    version?: string;
    syncToken?: string;
  };
  enableAutoExpand502?: boolean;
}

export function StandardsBrowser({
  standards,
  onSelect,
  onSeed,
  className,
  showSearchClear = false,
  showBulkExpandControls = true,
  treeExpansionMode = 'default',
  uiResetKey,
  persistUiStateKey,
  standardSelectionPersistKey,
  preferredStandardContext,
  enableAutoExpand502 = true,
}: StandardsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(() =>
    computeInitialStandardSelection(standardSelectionPersistKey, standards).selectedType
  );
  const [selectedVersion, setSelectedVersion] = useState<string>(() =>
    computeInitialStandardSelection(standardSelectionPersistKey, standards).selectedVersion
  );
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  /** Accordion mode: at most one StandardItem detail expanded at a time. */
  const [expandedStandardItemId, setExpandedStandardItemId] = useState<string | null>(null);

  const accordion = treeExpansionMode === 'accordion';

  const standardsRef = useRef(standards);
  standardsRef.current = standards;

  /** Detects material changes to available types/versions (not only array length). */
  const standardsSelectionFingerprint = useMemo(() => {
    const rows = standards
      .map((s) => {
        const t = String(s.fldStandardType ?? '').trim().toLowerCase();
        const v = String(s.fldStandardVersion ?? '').trim().toLowerCase();
        return `${t}\0${v}`;
      })
      .filter((r) => r !== '\0');
    rows.sort();
    return `${standards.length}:${rows.join('|')}`;
  }, [standards]);

  /** Prevents session selection writer from overwriting storage with initializer defaults before restore runs. */
  const selectionWriterGateOpenRef = useRef(!standardSelectionPersistKey);
  /** Tracks one-time preferred-context syncs so we do not continuously enforce external defaults. */
  const lastAppliedPreferredSyncTokenRef = useRef<string>('');

  const standardTypes = useMemo(() => {
    const types = new Set(standards.map(s => s.fldStandardType).filter(Boolean));
    return ['ALL', ...Array.from(types).sort()];
  }, [standards]);

  const standardVersions = useMemo(() => {
    const filtered =
      selectedType === 'ALL'
        ? standards
        : standards.filter(
            (s) =>
              String(s.fldStandardType ?? '').trim().toLowerCase() === selectedType.trim().toLowerCase()
          );
    const versions = new Set(filtered.map(s => s.fldStandardVersion).filter(Boolean));
    return ['ALL', ...Array.from(versions).sort().reverse()];
  }, [standards, selectedType]);

  const catalogHasSelectedType = useMemo(
    () => catalogHasStandardType(selectedType, standards),
    [standards, selectedType]
  );

  const catalogHasSelectedVersion = useMemo(
    () => catalogHasStandardTypeVersion(selectedType, selectedVersion, standards),
    [standards, selectedType, selectedVersion]
  );

  const typeSelectOptions = useMemo(() => {
    const opts = standardTypes.map((t) => ({ value: t, label: t }));
    if (selectedType !== 'ALL' && !catalogHasSelectedType) {
      opts.push({
        value: selectedType,
        label: `${selectedType} (no standards loaded)`,
      });
    }
    return opts;
  }, [standardTypes, selectedType, catalogHasSelectedType]);

  const versionSelectOptions = useMemo(() => {
    const opts = standardVersions.map((v) => ({ value: v, label: v }));
    if (selectedVersion !== 'ALL' && !catalogHasSelectedVersion) {
      opts.push({
        value: selectedVersion,
        label: `${selectedVersion} (no standards loaded)`,
      });
    }
    return opts;
  }, [standardVersions, selectedVersion, catalogHasSelectedVersion]);

  useLayoutEffect(() => {
    const key = standardSelectionPersistKey;
    if (!key) {
      selectionWriterGateOpenRef.current = true;
      return;
    }

    /** Explicit preferred context (e.g. Library Citations, Glossary): do not overwrite with session/persist defaults. */
    if (String(preferredStandardContext?.syncToken ?? '').trim() !== '') {
      selectionWriterGateOpenRef.current = true;
      return;
    }

    selectionWriterGateOpenRef.current = false;
    const list = standardsRef.current;
    if (!list.length) {
      return;
    }

    const { selectedType: t, selectedVersion: v } = computeInitialStandardSelection(key, list);
    setSelectedType(t);
    setSelectedVersion(v);
    selectionWriterGateOpenRef.current = true;
  }, [
    standardSelectionPersistKey,
    standardsSelectionFingerprint,
    preferredStandardContext?.syncToken,
  ]);

  useEffect(() => {
    if (standards.length === 0) return;

    /** Parent supplied explicit preferred context — do not auto-default to TAS/2012 (Library Citations, Glossary sync). */
    const explicitPreferredSync =
      String(preferredStandardContext?.syncToken ?? '').trim() !== '';
    if (!explicitPreferredSync) {
      const types = new Set(standards.map((s) => s.fldStandardType).filter(Boolean));
      const versions = new Set(standards.map((s) => s.fldStandardVersion).filter(Boolean));

      let persistedSkipsTasDefault = false;
      let persistedSkips2012Default = false;
      if (standardSelectionPersistKey) {
        const skips = selectionStorageSkipsTas2012(standardSelectionPersistKey, standards);
        persistedSkipsTasDefault = skips.skipTas;
        persistedSkips2012Default = skips.skip2012;
      }

      if (!persistedSkipsTasDefault && selectedType === 'ALL' && types.has('TAS')) {
        setSelectedType('TAS');
      }
      if (!persistedSkips2012Default && selectedVersion === 'ALL' && versions.has('2012')) {
        setSelectedVersion('2012');
      }
    }

    if (!enableAutoExpand502) return;

    const target = standards.find((s) => s.citation_num?.includes('502.2'));
    if (target) {
      let chapterName = target.chapter_name || 'Unknown Chapter';
      if (/^\d+$/.test(chapterName)) chapterName = `Chapter ${chapterName}`;
      if (chapterName.length > 100) chapterName = 'General';

      let sectionName = target.section_num
        ? `${target.section_num} ${target.section_name}`.trim()
        : target.section_name || 'General';
      if (sectionName.length > 150) sectionName = target.section_num || 'General';

      if (accordion) {
        setExpandedChapters({ [chapterName]: true });
      } else {
        setExpandedChapters((prev) => ({ ...prev, [chapterName]: true }));
      }
      const secKey = sectionStorageKey(chapterName, sectionName, accordion);
      setExpandedSections((prev) => ({ ...prev, [secKey]: true }));
    }
  }, [standards, enableAutoExpand502, accordion, standardSelectionPersistKey, preferredStandardContext?.syncToken]);

  useEffect(() => {
    if (!standardSelectionPersistKey) return;
    if (!selectionWriterGateOpenRef.current) return;
    if (!standardsRef.current.length) return;
    writePersistedStandardSelection(standardSelectionPersistKey, selectedType, selectedVersion);
  }, [standardSelectionPersistKey, selectedType, selectedVersion, standardsSelectionFingerprint]);

  useEffect(() => {
    const token = String(preferredStandardContext?.syncToken || '').trim();
    if (!token) return;
    if (!standards.length) return;
    if (lastAppliedPreferredSyncTokenRef.current === token) return;

    const rawType = String(preferredStandardContext?.type ?? '').trim();
    if (!rawType || rawType.toUpperCase() === 'ALL') return;

    const canonicalType = resolveCanonicalStoredType(preferredStandardContext?.type, standards);
    const effectiveType = canonicalType ?? rawType;

    const rawVer =
      preferredStandardContext?.version !== undefined && preferredStandardContext?.version !== null
        ? String(preferredStandardContext.version).trim()
        : '';
    let effectiveVersion: string;
    if (!rawVer || rawVer.toUpperCase() === 'ALL') {
      effectiveVersion = 'ALL';
    } else {
      const canonicalVer = resolveCanonicalStoredVersionForType(
        effectiveType,
        preferredStandardContext?.version,
        standards
      );
      effectiveVersion = canonicalVer !== null ? canonicalVer : rawVer;
    }

    setSelectedType(effectiveType);
    setSelectedVersion(effectiveVersion);
    if (standardSelectionPersistKey) {
      writePersistedStandardSelection(standardSelectionPersistKey, effectiveType, effectiveVersion);
    }
    lastAppliedPreferredSyncTokenRef.current = token;
  }, [
    preferredStandardContext?.syncToken,
    preferredStandardContext?.type,
    preferredStandardContext?.version,
    standards,
    standardsSelectionFingerprint,
    standardSelectionPersistKey,
  ]);

  const toggleChapter = (chapter: string) => {
    if (accordion) {
      setExpandedChapters((prev) => {
        const open = prev[chapter];
        if (open) return {};
        return { [chapter]: true };
      });
      return;
    }
    setExpandedChapters((prev) => ({ ...prev, [chapter]: !prev[chapter] }));
  };

  const toggleSection = (chapterName: string, sectionName: string) => {
    const secKey = sectionStorageKey(chapterName, sectionName, accordion);
    if (accordion) {
      setExpandedSections((prev) => {
        const open = prev[secKey];
        const prefix = `${chapterName}\0`;
        const next: Record<string, boolean> = {};
        if (open) {
          for (const k of Object.keys(prev)) {
            if (k !== secKey) next[k] = prev[k];
          }
          return next;
        }
        for (const k of Object.keys(prev)) {
          if (!k.startsWith(prefix)) next[k] = prev[k];
        }
        next[secKey] = true;
        return next;
      });
      return;
    }
    setExpandedSections((prev) => ({ ...prev, [secKey]: !prev[secKey] }));
  };

  const readPersistedUi = useCallback((key: string) => readPersistedUiFromStorage(key), []);

  const hardResetBrowserUi = useCallback(() => {
    setSearchQuery('');
    setExpandedChapters({});
    setExpandedSections({});
    setExpandedStandardItemId(null);
  }, []);

  useEffect(() => {
    if (persistUiStateKey != null && persistUiStateKey !== '') {
      const stored = readPersistedUi(persistUiStateKey);
      if (stored) {
        setSearchQuery(stored.searchQuery ?? '');
        setExpandedChapters(stored.expandedChapters ?? {});
        setExpandedSections(stored.expandedSections ?? {});
        setExpandedStandardItemId(
          stored.expandedStandardItemId === undefined ? null : stored.expandedStandardItemId
        );
      } else {
        hardResetBrowserUi();
      }
      return;
    }
    if (uiResetKey !== undefined && uiResetKey !== null) {
      hardResetBrowserUi();
    }
  }, [uiResetKey, persistUiStateKey, readPersistedUi, hardResetBrowserUi, standards]);

  useEffect(() => {
    if (!persistUiStateKey) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          STANDARDS_BROWSER_UI_STORAGE_PREFIX + persistUiStateKey,
          JSON.stringify({
            searchQuery,
            expandedChapters,
            expandedSections,
            expandedStandardItemId,
          })
        );
      } catch {
        /* ignore quota / private mode */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [persistUiStateKey, searchQuery, expandedChapters, expandedSections, expandedStandardItemId]);

  const filteredStandards = useMemo(() => {
    let base = standards.filter(s => !s.fldIsArchived);
    
    if (selectedType !== 'ALL') {
      const wantT = selectedType.trim().toLowerCase();
      base = base.filter(
        (s) => String(s.fldStandardType ?? '').trim().toLowerCase() === wantT
      );
    }
    
    if (selectedVersion !== 'ALL') {
      const wantV = selectedVersion.trim().toLowerCase();
      base = base.filter(
        (s) => String(s.fldStandardVersion ?? '').trim().toLowerCase() === wantV
      );
    }

    if (!searchQuery) return base;
    const query = searchQuery.toLowerCase();
    const filtered = base.filter(s =>
      searchFieldLower(s.citation_num).includes(query) ||
      searchFieldLower(s.citation_name).includes(query) ||
      searchFieldLower(s.content_text).includes(query) ||
      searchFieldLower(s.chapter_name).includes(query) ||
      searchFieldLower(s.section_name).includes(query)
    );
    return filtered;
  }, [standards, searchQuery, selectedType, selectedVersion]);

  /** Type/version filter only (no search) — for empty-state copy when the catalog has no rows for the selection. */
  const standardsMatchingTypeAndVersion = useMemo(() => {
    let base = standards.filter((s) => !s.fldIsArchived);
    if (selectedType !== 'ALL') {
      const wantT = selectedType.trim().toLowerCase();
      base = base.filter(
        (s) => String(s.fldStandardType ?? '').trim().toLowerCase() === wantT
      );
    }
    if (selectedVersion !== 'ALL') {
      const wantV = selectedVersion.trim().toLowerCase();
      base = base.filter(
        (s) => String(s.fldStandardVersion ?? '').trim().toLowerCase() === wantV
      );
    }
    return base;
  }, [standards, selectedType, selectedVersion]);

  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string>();
    const duplicates = new Set<string>();
    standards.forEach(s => {
      const key = `${s.citation_num}|${s.content_text}|${s.relation_type}`;
      if (seen.has(key)) {
        duplicates.add(s.id);
        const firstId = seen.get(key);
        if (firstId) duplicates.add(firstId);
      } else {
        seen.set(key, s.id);
      }
    });
    return duplicates;
  }, [standards]);

  const groupedStandards = useMemo(() => {
    const chapterMap: Record<string, { 
      name: string; 
      minOrder: number; 
      sections: Record<string, { 
        name: string; 
        minOrder: number; 
        items: MasterStandard[]; 
      }> 
    }> = {};
    
    filteredStandards.forEach(s => {
      // Normalize Chapter Name to handle inconsistencies like '.' vs ':'
      let chapterName = (s.chapter_name || 'Unknown Chapter')
        .replace(':', '.')
        .trim();
      
      if (/^\d+$/.test(chapterName)) {
        chapterName = `Chapter ${chapterName}`;
      }
      
      // Strict length check for chapter name
      if (chapterName.length > 100) {
        chapterName = 'General';
      }

      // Section label
      let sectionName = s.section_num ? `${s.section_num} ${s.section_name}`.trim() : (s.section_name || 'General');
      if (sectionName.length > 150) {
        sectionName = s.section_num || 'General';
      }

      // Initialize chapter
      const sOrder = Number(s.order) || 0;
      if (!chapterMap[chapterName]) {
        chapterMap[chapterName] = { name: chapterName, minOrder: sOrder, sections: {} };
      } else {
        chapterMap[chapterName].minOrder = Math.min(chapterMap[chapterName].minOrder, sOrder);
      }

      // Initialize section
      if (!chapterMap[chapterName].sections[sectionName]) {
        chapterMap[chapterName].sections[sectionName] = { name: sectionName, minOrder: sOrder, items: [] };
      }
      
      // Update section minOrder
      chapterMap[chapterName].sections[sectionName].minOrder = Math.min(chapterMap[chapterName].sections[sectionName].minOrder, sOrder);

      // Add item directly to section
      chapterMap[chapterName].sections[sectionName].items.push(s);
    });

    // Convert to sorted arrays
    const chapters = Object.values(chapterMap)
      .sort((a, b) => a.minOrder - b.minOrder)
      .map(chapter => {
        const sections = Object.values(chapter.sections)
          .sort((a, b) => a.minOrder - b.minOrder)
          .map(section => ({
            ...section,
            items: [...section.items].sort((a, b) => a.order - b.order)
          }))
          .filter(section => section.items.length > 0);
        return { ...chapter, sections };
      })
      .filter(chapter => chapter.sections.length > 0);

    return chapters;
  }, [filteredStandards]);

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    groupedStandards.forEach(chapter => {
      allExpanded[chapter.name] = true;
    });
    setExpandedChapters(allExpanded);
  };

  const contractAll = () => {
    setExpandedChapters({});
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm", className)}>
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Book size={16} className="text-zinc-500" />
            Standards Library
          </h2>
          {showBulkExpandControls && (
            <div className="flex gap-2">
              <button type="button" onClick={expandAll} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase">
                Expand All
              </button>
              <button type="button" onClick={contractAll} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase">
                Contract All
              </button>
            </div>
          )}
          <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] font-bold rounded-full ml-auto">
            {filteredStandards.length} ITEMS
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Type</label>
            <select 
              value={selectedType}
              onChange={(e) => {
                const nextType = e.target.value;
                setSelectedType(nextType);
                setSelectedVersion('ALL');
                if (standardSelectionPersistKey) {
                  writePersistedStandardSelection(standardSelectionPersistKey, nextType, 'ALL');
                }
              }}
              className="w-full px-2 py-1.5 text-[11px] border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none"
            >
              {typeSelectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Version</label>
            <select 
              value={selectedVersion}
              onChange={(e) => {
                const nextVersion = e.target.value;
                setSelectedVersion(nextVersion);
                if (standardSelectionPersistKey) {
                  writePersistedStandardSelection(standardSelectionPersistKey, selectedType, nextVersion);
                }
              }}
              className="w-full px-2 py-1.5 text-[11px] border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none"
            >
              {versionSelectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4 pointer-events-none" />
          <input 
            className={cn(
              'w-full pl-10 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all',
              showSearchClear ? 'pr-10' : 'pr-4'
            )}
            placeholder="Search (e.g. 206, ramp, advisory)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {showSearchClear && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              disabled={!searchQuery}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors',
                searchQuery
                  ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  : 'text-zinc-200 cursor-not-allowed'
              )}
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {groupedStandards.map((chapter) => {
          const chapterOpen = expandedChapters[chapter.name] || Boolean(searchQuery);
          return (
          <div key={chapter.name} className="space-y-1">
            <button 
              type="button"
              onClick={() => toggleChapter(chapter.name)}
              className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg transition-colors text-left group"
            >
              {chapterOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
              <Book size={14} className="text-zinc-500" />
              <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider line-clamp-1">{chapter.name}</span>
            </button>

            {chapterOpen && (
              <div className="ml-4 space-y-1 border-l border-zinc-100 pl-2">
                {chapter.sections.map((section) => {
                  const secKey = sectionStorageKey(chapter.name, section.name, accordion);
                  const sectionOpen = expandedSections[secKey] || Boolean(searchQuery);
                  return (
                  <div key={secKey} className="space-y-1">
                    <button 
                      type="button"
                      onClick={() => toggleSection(chapter.name, section.name)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg transition-colors text-left group"
                    >
                      {sectionOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                      <FileText size={14} className="text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-700">{section.name}</span>
                    </button>

                    {sectionOpen && (
                      <div className="ml-4 space-y-1 border-l border-zinc-100 pl-2">
                        {section.items.map(s => (
                          <StandardItem
                            key={s.id}
                            s={s}
                            onSelect={onSelect}
                            isDuplicate={duplicateIds.has(s.id)}
                            expansionMode={treeExpansionMode}
                            isExpandedControlled={expandedStandardItemId === s.id}
                            onToggleExpand={() =>
                              setExpandedStandardItemId((id) => (id === s.id ? null : s.id))
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            )}
          </div>
        );})}

        {groupedStandards.length === 0 && (
          <div className="p-12 text-center">
            <Book size={48} className="mx-auto mb-4 text-zinc-200" />
            <p className="text-sm text-zinc-500 font-medium">No standards available</p>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              {searchQuery
                ? 'No standards match your search query.'
                : standardsMatchingTypeAndVersion.length === 0 &&
                    (selectedType !== 'ALL' || selectedVersion !== 'ALL')
                  ? 'No standards loaded for this type/version.'
                  : standards.filter((s) => !s.fldIsArchived).length === 0
                    ? 'The 2012 TAS Standards library is currently empty.'
                    : 'No standards match the current filters.'}
            </p>
            {!searchQuery && onSeed && (
              <button 
                type="button"
                onClick={onSeed}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Database size={14} />
                Seed Standards Library
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
