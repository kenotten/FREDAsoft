import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import metadata from '../../metadata.json';
// @ts-ignore
import ocgLogoNew from '../Assets/ocglogonew.jpg';
import { 
  Project, 
  Client, 
  ProjectData, 
  Inspector, 
  Facility, 
  MasterStandard,
  Glossary,
  Category,
  Item,
  Finding,
  Location,
  Recommendation
} from '../types';
import { cn, formatMeasurement, formatCurrency } from '../lib/utils';
import { Printer, Download, X, ChevronLeft, ChevronRight, FileText, Menu, ExternalLink, FlaskConical, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface ReportPreviewProps {
  project: Project;
  client: Client;
  facility: Facility;
  inspector: Inspector;
  projectData: ProjectData[];
  standards: MasterStandard[];
  glossary: Glossary[];
  categories: Category[];
  items: Item[];
  locations: Location[];
  recommendations: Recommendation[];
  findings: Finding[];
  onClose: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

// Helper functions for pagination
const toRoman = (num: number, uppercase = false) => {
  if (num <= 0) return '';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  let n = num;
  for (const [letter, value] of lookup) {
    while (n >= value) {
      roman += letter;
      n -= value;
    }
  }
  return uppercase ? roman : roman.toLowerCase();
};

interface StandardSnapshot {
  fldStandardType: string;
  fldStandardVersion: string;
  fldCitationNum: string;
  fldCitationName: string;
  fldContentText: string;
  fldStandardId: string;
  fldImageUrl?: string;
}

export function ReportPreview({
  project,
  client,
  facility,
  inspector,
  projectData,
  standards,
  glossary,
  categories,
  items,
  locations,
  recommendations,
  findings,
  onClose,
  isSidebarOpen,
  toggleSidebar
}: ReportPreviewProps) {
  
  const reportRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  
  // State for measured heights
  const [measuredDocHeights, setMeasuredDocHeights] = useState<Record<string, number>>({});
  const [measuredFinHeights, setMeasuredFinHeights] = useState<number[]>([]);
  const [measuredAddendumHeights, setMeasuredAddendumHeights] = useState<Record<string, number>>({});
  const [isMeasuring, setIsMeasuring] = useState(true);

  // Filter and sort project data for this specific project
  const filteredData = useMemo(() => {
    const rawData = projectData.filter(d => d.fldPDataProject === project.fldProjID);
    
    // Ensure uniqueness by fldPDataID
    const uniqueMap = new Map();
    rawData.forEach(d => uniqueMap.set(d.fldPDataID, d));
    const data = Array.from(uniqueMap.values());

    const multiplier = project.fldCostMultiplier || 1;

    const enriched = data.map(record => {
      const multiplier = project.fldCostMultiplier || 1;
      const unitCost = record.fldUnitCost || 0;
      const baseTotal = record.fldTotalCost || (unitCost * (record.fldQTY || 0));
      const cost = baseTotal * multiplier;
      return { 
        ...record, 
        totalCost: cost, 
        displayUnitCost: unitCost * multiplier,
        // Ensure unit type is passed through or fallback
        displayUnitType: record.fldUnitType || 'N/A'
      };
    });
    
    return enriched.sort((a, b) => {
      const keyA = (a.fldData || "").trim().toLowerCase();
      const keyB = (b.fldData || "").trim().toLowerCase();
      const glosA = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === keyA);
      const glosB = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === keyB);
      const catA = categories.find(c => c.fldCategoryID === glosA?.fldCat);
      const catB = categories.find(c => c.fldCategoryID === glosB?.fldCat);
      const catOrderA = catA?.fldOrder ?? 999;
      const catOrderB = catB?.fldOrder ?? 999;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;
      const locA = locations.find(l => l.fldLocID === a.fldLocation)?.fldLocName || '';
      const locB = locations.find(l => l.fldLocID === b.fldLocation)?.fldLocName || '';
      const locCompare = locA.localeCompare(locB);
      if (locCompare !== 0) return locCompare;
      const itemA = items.find(i => i.fldItemID === glosA?.fldItem);
      const itemB = items.find(i => i.fldItemID === glosB?.fldItem);
      const itemOrderA = itemA?.fldOrder ?? 999;
      const itemOrderB = itemB?.fldOrder ?? 999;
      if (itemOrderA !== itemOrderB) return itemOrderA - itemOrderB;
      const findA = findings.find(f => f.fldFindID === glosA?.fldFind);
      const findB = findings.find(f => f.fldFindID === glosB?.fldFind);
      const findOrderA = findA?.fldOrder ?? 999;
      const findOrderB = findB?.fldOrder ?? 999;
      if (findOrderA !== findOrderB) return findOrderA - findOrderB;
      return (itemA?.fldItemName || '').localeCompare(itemB?.fldItemName || '');
    });
  }, [projectData, project.fldProjID, glossary, categories, items, locations, findings]);

  const referencedStandards = useMemo(() => {
    const standardsMap = new Map<string, any>();
    filteredData.forEach(d => {
      const cleanKey = (d.fldData || "").trim().toLowerCase();
      const glos = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === cleanKey);
      const rawIds = glos?.fldStandards || [];
      const ids = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' && rawIds ? [rawIds] : []);
      ids.forEach(id => {
        if (!standardsMap.has(id)) {
          const std = standards.find(s => s.id === id);
          if (std) {
            standardsMap.set(id, {
              fldStandardType: std.fldStandardType,
              fldStandardVersion: std.fldStandardVersion,
              fldCitationNum: std.citation_num,
              fldCitationName: std.citation_name,
              fldContentText: std.content_text,
              fldStandardId: id
            });
          }
        }
      });
    });
    return Array.from(standardsMap.values())
      .sort((a, b) => a.fldCitationNum.localeCompare(b.fldCitationNum, undefined, { numeric: true }));
  }, [filteredData, glossary, standards]);

  const financialData = useMemo(() => {
    const groups: Record<string, { category: string, records: any[], subtotal: number }> = {};
    filteredData.forEach(record => {
      const cleanKey = (record.fldData || "").trim().toLowerCase();
      const glos = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === cleanKey);
      const cat = categories.find(c => c.fldCategoryID === glos?.fldCat);
      const catName = cat?.fldCategoryName || 'Uncategorized';
      if (!groups[catName]) {
        groups[catName] = { category: catName, records: [], subtotal: 0 };
      }
      const location = locations.find(l => l.fldLocID === record.fldLocation);
      groups[catName].records.push({
        ...record,
        itemName: items.find(i => i.fldItemID === glos?.fldItem)?.fldItemName || 'N/A',
        locationName: location?.fldLocName || 'N/A'
      });
      groups[catName].subtotal += (record as any).totalCost;
    });
    return Object.values(groups).sort((a, b) => {
      const catA = categories.find(c => c.fldCategoryName === a.category);
      const catB = categories.find(c => c.fldCategoryName === b.category);
      const orderA = catA?.fldOrder ?? 999;
      const orderB = catB?.fldOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.category.localeCompare(b.category);
    });
  }, [filteredData, glossary, categories, items, locations, project.fldCostMultiplier]);

  const financialRows = useMemo(() => {
    const rows: any[] = [];
    financialData.forEach(group => {
      rows.push({ type: 'header', content: group.category });
      group.records.forEach(rec => {
        rows.push({ type: 'record', content: rec });
      });
      rows.push({ type: 'subtotal', category: group.category, subtotal: group.subtotal });
    });
    return rows;
  }, [financialData]);

  // Measurement Pass
  useLayoutEffect(() => {
    if (!measurementRef.current) return;

    const measure = async () => {
      setIsMeasuring(true);
      
      // Wait for fonts to load
      await document.fonts.ready;

      // Wait for all images in the measurement container to load
      const images = measurementRef.current?.querySelectorAll('img');
      if (images && images.length > 0) {
        const imagePromises = Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });
        await Promise.all(imagePromises);
      }

      // Small delay to ensure layout has settled after images load
      await new Promise(resolve => setTimeout(resolve, 300));

      const docHeights: Record<string, number> = {};
      const finHeights: number[] = [];
      const addendumHeights: Record<string, number> = {};

      const docElements = measurementRef.current?.querySelectorAll('[data-measure-type="doc"]');
      docElements?.forEach(el => {
        const id = el.getAttribute('data-id');
        if (id) docHeights[id] = el.getBoundingClientRect().height;
      });

      const finElements = measurementRef.current?.querySelectorAll('[data-measure-type="fin"]');
      finElements?.forEach(el => {
        finHeights.push(el.getBoundingClientRect().height);
      });

      const addendumElements = measurementRef.current?.querySelectorAll('[data-measure-type="addendum"]');
      addendumElements?.forEach(el => {
        const id = el.getAttribute('data-id');
        if (id) addendumHeights[id] = el.getBoundingClientRect().height;
      });

      setMeasuredDocHeights(docHeights);
      setMeasuredFinHeights(finHeights);
      setMeasuredAddendumHeights(addendumHeights);
      setIsMeasuring(false);
    };

    measure();
  }, [filteredData, financialRows, referencedStandards]);

  // Pagination Chunks using measured heights
  const narrativePages = ["Project Narrative Placeholder"];

  const documentationPages = useMemo(() => {
    if (isMeasuring) return [];
    const chunks: ProjectData[][] = [];
    let currentChunk: ProjectData[] = [];
    let currentHeight = 0;
    const standardLimit = 660; // Reduced further for extra safety buffer
    const firstPageLimit = 595; // 660 - 65

    for (const item of filteredData) {
      const height = (measuredDocHeights[item.fldPDataID] || 200) + 32; // +32 for gap
      const limit = chunks.length === 0 ? firstPageLimit : standardLimit;
      
      if (currentHeight + height > limit && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [item];
        currentHeight = height;
      } else {
        currentChunk.push(item);
        currentHeight += height;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  }, [filteredData, measuredDocHeights, isMeasuring]);

  const financialPages = useMemo(() => {
    if (isMeasuring) return [];
    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    let currentHeight = 0;
    const standardLimit = 630; // Reduced further for extra safety buffer
    const firstPageLimit = 565; // 630 - 65

    for (let i = 0; i < financialRows.length; i++) {
      const row = financialRows[i];
      const height = measuredFinHeights[i] || 32;
      let limit = chunks.length === 0 ? firstPageLimit : standardLimit;
      
      if (i > financialRows.length - 3) limit -= 60; // Grand total space

      if (currentHeight + height > limit && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [row];
        currentHeight = height;
      } else {
        currentChunk.push(row);
        currentHeight += height;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  }, [financialRows, measuredFinHeights, isMeasuring]);

  const addendumPages = useMemo(() => {
    if (isMeasuring) return [];
    const chunks: StandardSnapshot[][] = [];
    let currentChunk: StandardSnapshot[] = [];
    let currentHeight = 0;
    const standardLimit = 660; // Reduced further for extra safety buffer
    const firstPageLimit = 595; // 660 - 65

    for (const item of referencedStandards) {
      const height = (measuredAddendumHeights[item.fldStandardId] || 100) + 24;
      const limit = chunks.length === 0 ? firstPageLimit : standardLimit;
      
      if (currentHeight + height > limit && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [item];
        currentHeight = height;
      } else {
        currentChunk.push(item);
        currentHeight += height;
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
  }, [referencedStandards, measuredAddendumHeights, isMeasuring]);

  const handlePrint = () => {
    // Current-window print flow consolidation (Task 125.D)
    // We no longer use the new-tab flow as print CSS is now hardened.
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    let year = date.getUTCFullYear();
    if (year < 100) year += 2000;
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}, ${year}`;
  };

  return (
    <div className={cn(
      "fixed inset-0 bg-zinc-900 z-50 flex flex-col transition-all duration-300",
      "print:bg-white print:absolute print:top-0 print:left-0 print:z-0 print:h-auto print:w-full print:block print:overflow-visible",
      isSidebarOpen && "left-64 print:left-0"
    )}>
      {/* Measurement Pass (Hidden) */}
      <div 
        ref={measurementRef}
        className="absolute top-0 left-0 w-[1056px] opacity-0 pointer-events-none overflow-hidden h-0"
        style={{ paddingLeft: '48px', paddingRight: '48px' }}
      >
        {filteredData.map(record => (
          <div key={record.fldPDataID} data-measure-type="doc" data-id={record.fldPDataID} className="mb-8">
            <DocumentationCard 
              record={record} 
              index={0} 
              glossary={glossary} 
              standards={standards} 
              locations={locations}
              categories={categories}
              items={items}
            />
          </div>
        ))}
        <table className="w-full border-collapse">
          <tbody>
            {financialRows.map((row, idx) => (
              <tr key={idx} data-measure-type="fin" className="text-xs">
                {row.type === 'header' ? (
                  <td className="py-2 px-3 font-black uppercase">{row.content}</td>
                ) : row.type === 'record' ? (
                  <td className="py-2 px-3">{row.content.itemName}</td>
                ) : (
                  <td className="py-2 px-3 font-bold">Subtotal</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {referencedStandards.map(standard => (
          <div key={standard.fldStandardId} data-measure-type="addendum" data-id={standard.fldStandardId} className="mb-6 space-y-2">
            <h3 className="font-bold text-zinc-900 text-sm">{standard.fldCitationNum} {standard.fldCitationName}</h3>
            <p className="text-xs text-zinc-700 leading-relaxed">{standard.fldContentText}</p>
            {standard.fldImageUrl && (
              <div className="my-2">
                <img 
                  src={standard.fldImageUrl} 
                  className="max-h-64 object-contain border border-zinc-200 rounded-lg" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Header / Controls */}
      <div className="h-16 bg-zinc-800 border-b border-zinc-700 flex items-center justify-between px-6 shrink-0 print:hidden no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={toggleSidebar} className="text-zinc-400 hover:text-white hover:bg-zinc-700">
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </Button>
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold leading-tight">Report Preview</h2>
            </div>
            <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">{project.fldProjName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isMeasuring && (
            <div className="flex items-center gap-2 text-blue-500 text-xs font-bold animate-pulse mr-4">
              <AlertCircle size={14} />
              CALCULATING PIXEL-PERFECT LAYOUT...
            </div>
          )}
          <Button 
            variant="primary" 
            onClick={handlePrint} 
            className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
            disabled={isMeasuring}
          >
            <Printer size={16} className="mr-2" /> 
            Print / Save as PDF
          </Button>
          
          <div className="w-px h-6 bg-zinc-700 mx-2" />
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-700 gap-2">
            <X size={18} />
            <span className="font-bold">Close Preview</span>
          </Button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto p-12 flex flex-col items-center gap-12 bg-zinc-900 print:bg-white print:p-0 print:gap-0 print:overflow-visible print:block print:h-auto no-scrollbar">
        {isMeasuring ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            <p className="font-bold tracking-widest text-sm uppercase">Analyzing Content Geometry...</p>
          </div>
        ) : (
          <div className="report-container-wrapper print:bg-white print:w-full print:h-auto print:overflow-visible print:block">
            <div ref={reportRef} className="flex flex-col items-center gap-12 print:gap-0 bg-transparent py-12 print:py-0 print:block print:h-auto print:overflow-visible">
              {/* Cover Page */}
              <PageContainer>
                <div className="absolute top-[203px] left-0 right-0 flex justify-center pointer-events-none z-10">
                  <div className="text-[18.6px] font-semibold text-zinc-900 uppercase tracking-tight text-center max-w-[80%]">
                    {facility.fldFacName}
                  </div>
                </div>
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-16">
                    <div className="flex gap-6">
                      <div className="w-32 h-32 bg-blue-900 flex items-center justify-center overflow-hidden">
                        <img src={ocgLogoNew} alt="OCG Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-zinc-900">Otten Consulting Group, Inc.</h1>
                        <p className="text-sm text-zinc-600">7171 Highway 6 N., Suite 285</p>
                        <p className="text-sm text-zinc-600">Houston, Texas 77095</p>
                        <p className="text-sm text-zinc-600">Tele (713) 975-1029</p>
                        <p className="text-sm text-zinc-600">Fax (713) 785-7769</p>
                        <p className="text-xs text-blue-600 underline">www.statereview.com</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Accessibility Assessment</h2>
                      <p className="text-sm font-bold text-zinc-700 mt-2">Americans with Disabilities Act</p>
                      <p className="text-sm font-bold text-zinc-700">Texas Accessibility Standards</p>
                      <p className="text-sm font-bold text-zinc-700">Fair Housing Act</p>
                      <p className="text-sm font-bold text-zinc-700">Rehabilitation Act (504)</p>
                    </div>
                  </div>
                  <div className="space-y-7">
                    <ReportSection title="OCG INFORMATION">
                      <InfoRow label="Inspector:" value={inspector.fldInspName + (inspector.fldTitle ? `, ${inspector.fldTitle}` : '')} />
                      <InfoRow label="Inspection Date:" value={formatDate(facility.fldInspectionDate || project.fldPDDate || '')} />
                      <InfoRow label="OCG Project #:" value={project.fldProjNumber || 'TBD'} />
                    </ReportSection>
                    <ReportSection title="PROJECT INFORMATION">
                      <InfoRow label="Project Name:" value={project.fldProjName} />
                      <InfoRow label="Facility Name:" value={facility.fldFacName} />
                      <InfoRow label="Project Address:" value={facility.fldFacAddress || 'TBD'} />
                      <InfoRow label="City, State Zip:" value={`${facility.fldFacCity || ''}, ${facility.fldFacState || ''} ${facility.fldFacZip || ''}`} />
                    </ReportSection>
                    <ReportSection title="OWNER INFORMATION">
                      <InfoRow label="Name:" value={client.fldClientName} />
                      <InfoRow label="Address:" value={client.fldClientAddress || 'TBD'} />
                      <div className="grid grid-cols-3 gap-4">
                        <InfoRow label="City:" value={client.fldClientCity || 'TBD'} />
                        <InfoRow label="State:" value={client.fldClientState || 'TBD'} />
                        <InfoRow label="ZIP:" value={client.fldClientZIP || 'TBD'} />
                      </div>
                    </ReportSection>
                  </div>
                </div>
              </PageContainer>

              {/* Narrative Pages */}
              {narrativePages.map((content, pIdx) => (
                <PageContainer key={`narrative-${pIdx}`} pageNumber={toRoman(pIdx + 1, false)} facilityName={facility.fldFacName}>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">Narrative:</h2>
                    <div className="text-sm text-zinc-800 leading-relaxed space-y-6 whitespace-pre-wrap">
                      {content || "No narrative content provided for this project."}
                    </div>
                  </div>
                </PageContainer>
              ))}

              {/* Documentation Section */}
              {documentationPages.length > 0 ? (
                documentationPages.map((pageRecords, pIdx) => (
                  <PageContainer key={`doc-${pIdx}`} pageNumber={(pIdx + 1).toString()} facilityName={facility.fldFacName}>
                    <div className="flex flex-col">
                      {pIdx === 0 && (
                        <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                          Documentation Section
                        </h2>
                      )}
                      <div className="space-y-8">
                        {pageRecords.map((record, rIdx) => (
                          <DocumentationCard 
                            key={record.fldPDataID} 
                            record={record} 
                            index={documentationPages.slice(0, pIdx).reduce((sum, p) => sum + p.length, 0) + rIdx + 1} 
                            glossary={glossary} 
                            standards={standards} 
                            locations={locations}
                            categories={categories}
                            items={items}
                          />
                        ))}
                      </div>
                    </div>
                  </PageContainer>
                ))
              ) : (
                <PageContainer facilityName={facility.fldFacName} pageNumber="1">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                      Documentation Section
                    </h2>
                    <p className="text-sm text-zinc-500 italic">No documentation records found for this project.</p>
                  </div>
                </PageContainer>
              )}

              {/* Financial Section */}
              {financialPages.map((pageRows, pIdx) => (
                <PageContainer key={`fin-${pIdx}`} pageNumber={`A${pIdx + 1}`} facilityName={facility.fldFacName}>
                  <div className="flex flex-col h-full">
                    {pIdx === 0 && (
                      <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                        Financial Summary
                      </h2>
                    )}
                    <div className="flex-1 flex flex-col">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-100 border-y border-zinc-200">
                            <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Item</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Location</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">QTY</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">UNIT COST</th>
                            <th className="py-2 px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {pageRows.map((row, rIdx) => {
                            if (row.type === 'header') {
                              return (
                                <tr key={rIdx} className="bg-zinc-100 break-inside-avoid">
                                  <td colSpan={5} className="py-2 px-3 text-xs font-black text-zinc-900 uppercase tracking-tight">
                                    {row.content}
                                  </td>
                                </tr>
                              );
                            }
                            if (row.type === 'record') {
                              const rec = row.content;
                              return (
                                <tr key={rIdx} className="text-xs break-inside-avoid">
                                  <td className="py-2 px-3 text-zinc-700">{rec.itemName}</td>
                                  <td className="py-2 px-3 text-zinc-500 italic">{rec.locationName}</td>
                                  <td className="py-2 px-3 text-right text-zinc-700">{rec.fldQTY} {rec.displayUnitType}</td>
                                  <td className="py-2 px-3 text-right text-zinc-700">{formatCurrency(rec.displayUnitCost)}</td>
                                  <td className="py-2 px-3 text-right font-bold text-zinc-900">{formatCurrency(rec.totalCost)}</td>
                                </tr>
                              );
                            }
                            if (row.type === 'subtotal') {
                              return (
                                <tr key={rIdx} className="bg-zinc-50 break-inside-avoid">
                                  <td colSpan={4} className="py-2 px-3 text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                    Subtotal {row.category}:
                                  </td>
                                  <td className="py-2 px-3 text-right font-black text-zinc-900 border-t border-zinc-200">
                                    {formatCurrency(row.subtotal)}
                                  </td>
                                </tr>
                              );
                            }
                            return null;
                          })}
                        </tbody>
                        {pIdx === financialPages.length - 1 && (
                          <tfoot>
                            <tr className="border-t-2 border-zinc-900 break-inside-avoid">
                              <td colSpan={4} className="py-4 px-3 text-right text-sm font-black text-zinc-900 uppercase tracking-widest">
                                Grand Total:
                              </td>
                              <td className="py-4 px-3 text-right text-lg font-black text-blue-600">
                                {formatCurrency(financialData.reduce((sum, g) => sum + g.subtotal, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </PageContainer>
              ))}

              {/* Addendum Section */}
              {addendumPages.length > 0 ? (
                addendumPages.map((pageRecords, pIdx) => (
                  <PageContainer key={`add-${pIdx}`} pageNumber={`B${pIdx + 1}`} facilityName={facility.fldFacName}>
                    <div className="flex flex-col">
                      {pIdx === 0 && (
                        <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                          Addendum: Texas Accessibility Standards
                        </h2>
                      )}
                      <div className="space-y-6">
                        {pageRecords.map(standard => (
                          <div key={standard.fldStandardId} className="space-y-2 break-inside-avoid">
                            <h3 className="font-bold text-zinc-900 text-sm">{standard.fldCitationNum} {standard.fldCitationName}</h3>
                            <p className="text-xs text-zinc-700 leading-relaxed">{standard.fldContentText}</p>
                            {standard.fldImageUrl && (
                              <div className="my-2">
                                <img 
                                  src={standard.fldImageUrl} 
                                  alt={`Figure ${standard.fldCitationNum}`} 
                                  className="max-h-64 object-contain border border-zinc-200 rounded-lg" 
                                  referrerPolicy="no-referrer" 
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </PageContainer>
                ))
              ) : (
                <PageContainer facilityName={facility.fldFacName} pageNumber="C1">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-zinc-900 mb-8 uppercase tracking-widest border-b-2 border-zinc-900 pb-2">
                      Addendum: Texas Accessibility Standards
                    </h2>
                    <p className="text-sm text-zinc-500 italic">No standards citations referenced in this report.</p>
                  </div>
                </PageContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components (Simplified for Sandbox) ---

function PageContainer({ children, className, pageNumber, facilityName }: any) {
  return (
    <div className={cn("report-page w-[1056px] h-[816px] bg-white shadow-2xl shrink-0 relative print:shadow-none flex flex-col overflow-hidden", className)}>
      <div className="flex-1 px-[48px] pt-[48px] pb-[72px] relative overflow-hidden">
        <div className="h-full overflow-hidden">{children}</div>
      </div>
      {/* Footer Area at exactly 0.5" (48px) from bottom */}
      <div className="absolute bottom-[48px] left-[48px] right-[48px] pointer-events-none z-20 bg-white">
        {/* Thin black line 8 points (~10.6px) above the text */}
        <div className="w-full h-[0.5px] bg-black mb-[8pt]" />
        <div className="flex justify-between items-end">
          <div className="text-[10px] font-semibold text-zinc-900 uppercase tracking-tight">{facilityName}</div>
          <div className="text-[10px] font-semibold text-zinc-900 tracking-tight">
            {pageNumber ? `PAGE ${pageNumber}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="bg-black text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
        {title}
      </div>
      <div className="border border-zinc-200 divide-y divide-zinc-100">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center text-xs py-1.5 px-3">
      <span className="w-40 font-bold text-zinc-900">{label}</span>
      <span className="text-zinc-700">{value}</span>
    </div>
  );
}

function DocumentationCard({ record, index, glossary, standards, locations, categories, items }: { record: any, index: number, glossary: Glossary[], standards: MasterStandard[], locations: Location[], categories: Category[], items: Item[] }) {
  const cleanKey = (record.fldData || "").trim().toLowerCase();
  const glos = glossary.find(g => (g.fldGlosId || "").trim().toLowerCase() === cleanKey);
  const cat = categories.find(c => c.fldCategoryID === glos?.fldCat);
  const item = items.find(i => i.fldItemID === glos?.fldItem);
  const location = locations.find(l => l.fldLocID === record.fldLocation);
  const refs = useMemo(() => {
    const rawIds = record.fldStandards || glos?.fldStandards || [];
    const standardIds = Array.isArray(rawIds) ? rawIds : (typeof rawIds === 'string' && rawIds ? [rawIds] : []);
    if (standardIds.length === 0) return '';
    return standardIds
      .map(id => standards.find(s => s.id === id)?.citation_num)
      .filter(Boolean)
      .join('; ');
  }, [record.fldStandards, glos, standards]);

  return (
    <div className="border-2 border-zinc-900 flex break-inside-avoid">
      {/* Number Column */}
      <div className="w-12 border-r-2 border-zinc-900 flex flex-col items-center justify-center font-black text-2xl shrink-0">
        {index}
        <span className="text-[8px] font-mono text-zinc-400 mt-1 print:hidden">{record.fldPDataID?.slice(0, 8)}</span>
      </div>

      {/* Content Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Row */}
        <div className="flex border-b border-zinc-300">
          <div className="w-32 bg-zinc-50 px-2 py-1 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Category</div>
          <div className="flex-1 px-2 py-1 text-[10px] font-bold text-zinc-900 border-r border-zinc-300 truncate">{cat?.fldCategoryName || 'N/A'}</div>
          <div className="w-32 bg-zinc-50 px-2 py-1 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Item</div>
          <div className="flex-1 bg-black text-white px-2 py-1 text-[10px] font-bold uppercase truncate">{item?.fldItemName || 'N/A'}</div>
        </div>
        
        {/* Location Row */}
        <div className="flex border-b border-zinc-300">
          <div className="w-32 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Location</div>
          <div className="flex-1 px-2 py-2 text-xs font-medium">{location?.fldLocName || 'N/A'}</div>
        </div>

        {/* Finding Row */}
        <div className="flex border-b border-zinc-300">
          <div className="w-32 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Finding</div>
          <div className="flex-1 px-2 py-2 text-[11px] leading-snug border-r border-zinc-300">
            {record.fldFindLong}
            
            {/* Glossary Reference Images */}
            {Array.isArray(glos?.fldImages) && glos.fldImages.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {glos.fldImages.map((img: string, i: number) => (
                  <img 
                    key={i} 
                    src={img} 
                    className="w-16 h-16 object-cover border border-zinc-200 rounded" 
                    alt="Glossary Ref" 
                    referrerPolicy="no-referrer" 
                  />
                ))}
              </div>
            )}
          </div>
          <div className="w-32 flex flex-col shrink-0">
            <div className="bg-zinc-50 px-2 py-1 text-[9px] font-bold uppercase border-b border-zinc-300">Measurement</div>
            <div className="flex-1 flex items-center justify-center text-xs font-bold p-2">
              {formatMeasurement(record.fldMeasurement, record.fldMeasurementUnit || record.fldUnitType)}
            </div>
          </div>
        </div>

        {/* Recommendation Row */}
        <div className="flex">
          <div className="w-32 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Recommendation</div>
          <div className="flex-1 px-2 py-2 text-[11px] leading-snug">{record.fldRecLong}</div>
        </div>

        {/* Spacer to push Reference to bottom */}
        <div className="flex-1 flex">
          <div className="w-32 bg-zinc-50 border-r border-zinc-300 shrink-0" />
          <div className="flex-1" />
        </div>

        {/* Reference Row */}
        <div className="flex border-t border-zinc-300">
          <div className="w-32 bg-zinc-50 px-2 py-2 text-[9px] font-bold uppercase border-r border-zinc-300 shrink-0">Reference</div>
          <div className="flex-1 px-2 py-2 text-xs font-bold flex justify-between items-center gap-4">
            <span className="flex-1">{refs}</span>
            <span className="text-blue-600 shrink-0">Estimated Cost: ${record.totalCost?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Images Column */}
      <div className={cn(
        "w-48 border-l-2 border-zinc-900 flex flex-col bg-zinc-900 shrink-0",
        (!Array.isArray(record.fldImages) || record.fldImages.length === 0) && "hidden"
      )}>
        {Array.isArray(record.fldImages) && record.fldImages.slice(0, 2).map((img: string, i: number) => (
          <div key={i} className={cn(
            "bg-white overflow-hidden p-1 flex-1 min-h-0",
            i === 0 && record.fldImages.length > 1 && "border-b border-zinc-900"
          )}>
            <img 
              src={img} 
              className="w-full h-full object-cover rounded-sm" 
              alt={`Finding ${i + 1}`}
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
