import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, Book, FileText, Hash, Info, AlertCircle, Image as ImageIcon, Database, Plus } from 'lucide-react';
import { MasterStandard } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StandardItem = ({ s, onSelect, isDuplicate }: { s: MasterStandard, onSelect?: (s: MasterStandard) => void, isDuplicate?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => {
        setIsExpanded(!isExpanded);
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

interface StandardsBrowserProps {
  standards: MasterStandard[];
  onSelect?: (standard: MasterStandard) => void;
  onSeed?: () => void;
  className?: string;
}

export function StandardsBrowser({ standards, onSelect, onSeed, className }: StandardsBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(() => {
    const types = new Set(standards.map(s => s.fldStandardType).filter(Boolean));
    return types.has('TAS') ? 'TAS' : 'ALL';
  });
  const [selectedVersion, setSelectedVersion] = useState<string>(() => {
    const versions = new Set(standards.map(s => s.fldStandardVersion).filter(Boolean));
    return versions.has('2012') ? '2012' : 'ALL';
  });
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  const standardTypes = useMemo(() => {
    const types = new Set(standards.map(s => s.fldStandardType).filter(Boolean));
    return ['ALL', ...Array.from(types).sort()];
  }, [standards]);

  const standardVersions = useMemo(() => {
    const filtered = selectedType === 'ALL' 
      ? standards 
      : standards.filter(s => s.fldStandardType === selectedType);
    const versions = new Set(filtered.map(s => s.fldStandardVersion).filter(Boolean));
    return ['ALL', ...Array.from(versions).sort().reverse()];
  }, [standards, selectedType]);

  useEffect(() => {
    if (standards.length > 0) {
      const types = new Set(standards.map(s => s.fldStandardType).filter(Boolean));
      const versions = new Set(standards.map(s => s.fldStandardVersion).filter(Boolean));

      // Only set defaults if we are currently on 'ALL' (initial state)
      if (selectedType === 'ALL' && types.has('TAS')) {
        setSelectedType('TAS');
      }
      if (selectedVersion === 'ALL' && versions.has('2012')) {
        setSelectedVersion('2012');
      }

      const target = standards.find(s => s.citation_num?.includes('502.2'));
      if (target) {
        // Clean up chapter name logic to match grouping
        let chapterName = target.chapter_name || 'Unknown Chapter';
        if (/^\d+$/.test(chapterName)) chapterName = `Chapter ${chapterName}`;
        if (chapterName.length > 100) chapterName = 'General';

        let sectionName = target.section_num ? `${target.section_num} ${target.section_name}`.trim() : (target.section_name || 'General');
        if (sectionName.length > 150) sectionName = target.section_num || 'General';

        setExpandedChapters(prev => ({ ...prev, [chapterName]: true }));
        setExpandedSections(prev => ({ ...prev, [sectionName]: true }));
        // console.log('DEBUG: Auto-expanding for 502.2:', { chapterName, sectionName });
      }
    }
  }, [standards]);

  const toggleChapter = (chapter: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapter]: !prev[chapter] }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleCitation = (citation: string) => {
    setExpandedCitations(prev => ({ ...prev, [citation]: !prev[citation] }));
  };

  const filteredStandards = useMemo(() => {
    let base = standards.filter(s => !s.fldIsArchived);
    
    if (selectedType !== 'ALL') {
      base = base.filter(s => s.fldStandardType === selectedType);
    }
    
    if (selectedVersion !== 'ALL') {
      base = base.filter(s => s.fldStandardVersion === selectedVersion);
    }

    if (!searchQuery) return base;
    const query = searchQuery.toLowerCase();
    const filtered = base.filter(s => 
      s.citation_num.toLowerCase().includes(query) || 
      s.citation_name.toLowerCase().includes(query) ||
      s.content_text.toLowerCase().includes(query) ||
      s.chapter_name.toLowerCase().includes(query) ||
      s.section_name.toLowerCase().includes(query)
    );
    return filtered;
  }, [standards, searchQuery, selectedType, selectedVersion]);

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            <Book size={16} className="text-zinc-500" />
            Standards Library
          </h2>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase">Expand All</button>
            <button onClick={contractAll} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 uppercase">Contract All</button>
          </div>
          <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 text-[10px] font-bold rounded-full">
            {filteredStandards.length} ITEMS
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Type</label>
            <select 
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedVersion('ALL');
              }}
              className="w-full px-2 py-1.5 text-[11px] border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none"
            >
              {standardTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Version</label>
            <select 
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="w-full px-2 py-1.5 text-[11px] border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none"
            >
              {standardVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input 
            className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-black/5 outline-none transition-all"
            placeholder="Search (e.g. 206, ramp, advisory)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {groupedStandards.map((chapter) => (
          <div key={chapter.name} className="space-y-1">
            <button 
              onClick={() => toggleChapter(chapter.name)}
              className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg transition-colors text-left group"
            >
              {expandedChapters[chapter.name] || searchQuery ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
              <Book size={14} className="text-zinc-500" />
              <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider line-clamp-1">{chapter.name}</span>
            </button>

            {(expandedChapters[chapter.name] || searchQuery) && (
              <div className="ml-4 space-y-1 border-l border-zinc-100 pl-2">
                {chapter.sections.map((section) => (
                  <div key={section.name} className="space-y-1">
                    <button 
                      onClick={() => toggleSection(section.name)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg transition-colors text-left group"
                    >
                      {expandedSections[section.name] || searchQuery ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                      <FileText size={14} className="text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-700">{section.name}</span>
                    </button>

                    {(expandedSections[section.name] || searchQuery) && (
                      <div className="ml-4 space-y-1 border-l border-zinc-100 pl-2">
                        {section.items.map(s => (
                          <StandardItem key={s.id} s={s} onSelect={onSelect} isDuplicate={duplicateIds.has(s.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {groupedStandards.length === 0 && (
          <div className="p-12 text-center">
            <Book size={48} className="mx-auto mb-4 text-zinc-200" />
            <p className="text-sm text-zinc-500 font-medium">No standards available</p>
            <p className="text-xs text-zinc-400 mt-1 mb-6">
              {searchQuery ? "No standards match your search query." : "The 2012 TAS Standards library is currently empty."}
            </p>
            {!searchQuery && onSeed && (
              <button 
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
