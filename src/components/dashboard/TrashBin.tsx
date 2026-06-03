import React from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Card } from '../ui/core';

export interface TrashInspectionLookup {
  clients: any[];
  facilities: any[];
  projects: any[];
  locations: any[];
  categories: any[];
  items: any[];
}

const EMPTY_LOOKUP: TrashInspectionLookup = {
  clients: [],
  facilities: [],
  projects: [],
  locations: [],
  categories: [],
  items: []
};

function normId(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function truncateId(id: string, len = 8): string {
  const s = String(id || '').trim();
  if (!s) return '';
  return s.length <= len ? s : `${s.slice(0, len)}…`;
}

function formatDeletedAt(v: unknown): string {
  if (v == null || v === '') return '';
  try {
    if (
      typeof v === 'object' &&
      v !== null &&
      'toDate' in v &&
      typeof (v as { toDate: () => Date }).toDate === 'function'
    ) {
      const dt = (v as { toDate: () => Date }).toDate();
      if (dt instanceof Date && !Number.isNaN(dt.getTime())) return dt.toLocaleString();
    }
  } catch {
    /* ignore */
  }
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  return '';
}

function resolveInspectionRecordContext(
  d: Record<string, unknown>,
  lookup: TrashInspectionLookup
): {
  findingShort: string;
  clientLine: string;
  locationLine: string;
  categoryItemLine: string;
  deletedLine: string;
  idHint: string;
} {
  const projects = lookup.projects;
  const facilities = lookup.facilities;
  const clients = lookup.clients;
  const locations = lookup.locations;
  const categories = lookup.categories;
  const items = lookup.items;

  const pid = normId(d.fldPDataProject);
  const fid = normId(d.fldFacility);
  const locId = normId(d.fldLocation);

  const project =
    projects.find((p: any) => normId(p?.fldProjID) === pid) ?? null;
  const facility =
    facilities.find((f: any) => normId(f?.fldFacID) === fid) ?? null;
  const clientFromProject = project
    ? clients.find((c: any) => normId(c?.fldClientID) === normId(project.fldClient)) ?? null
    : null;
  const clientFromFacility =
    !clientFromProject && facility
      ? clients.find((c: any) => normId(c?.fldClientID) === normId(facility.fldClient)) ?? null
      : null;
  const client = clientFromProject || clientFromFacility;

  const clientName =
    (client?.fldClientName && String(client.fldClientName).trim()) || 'Unknown client';
  const facilityName =
    (facility?.fldFacName && String(facility.fldFacName).trim()) || 'Unknown facility';
  const projectName =
    (project?.fldProjName && String(project.fldProjName).trim()) ||
    (pid ? `Unknown project (${truncateId(String(d.fldPDataProject))})` : 'Unknown project');

  const clientLine = `${clientName} / ${facilityName} / ${projectName}`;

  const locRow =
    locations.find((l: any) => normId(l?.fldLocID) === locId) ?? null;
  const denormLoc =
    typeof d.fldLocationName === 'string' ? String(d.fldLocationName).trim() : '';
  const locationLine =
    (locRow?.fldLocName && String(locRow.fldLocName).trim()) ||
    denormLoc ||
    (locId ? `Unknown location (${truncateId(String(d.fldLocation))})` : 'Unknown location');

  const catId = normId(d.fldPDataCategoryID);
  const itemId = normId(d.fldPDataItemID);
  const cat =
    categories.find((c: any) => normId(c?.fldCategoryID) === catId) ?? null;
  const item =
    items.find((i: any) => normId(i?.fldItemID) === itemId) ?? null;
  const catName =
    (cat?.fldCategoryName && String(cat.fldCategoryName).trim()) ||
    (catId ? `Unknown category (${truncateId(String(d.fldPDataCategoryID))})` : 'Unknown category');
  const itemName =
    (item?.fldItemName && String(item.fldItemName).trim()) ||
    (itemId ? `Unknown item (${truncateId(String(d.fldPDataItemID))})` : 'Unknown item');

  const hasCat = Boolean(String(d.fldPDataCategoryID ?? '').trim());
  const hasItem = Boolean(String(d.fldPDataItemID ?? '').trim());
  const categoryItemLine =
    !hasCat && !hasItem
      ? 'Category / Item: —'
      : `Category / Item: ${catName} · ${itemName}`;

  const deletedAtStr = formatDeletedAt(d.fldDeletedAt);
  let deletedBy = '';
  if (typeof d.fldDeletedBy === 'string' && d.fldDeletedBy.trim()) {
    deletedBy = d.fldDeletedBy.trim();
  }
  const deletedParts: string[] = [];
  if (deletedAtStr) deletedParts.push(deletedAtStr);
  if (deletedBy) deletedParts.push(`by ${deletedBy}`);
  const deletedLine =
    deletedParts.length > 0 ? `Deleted: ${deletedParts.join(' ')}` : 'Deleted: —';

  const findingRaw = d.fldFindShort;
  const findingShort =
    (typeof findingRaw === 'string' && findingRaw.trim()) ||
    `Untitled finding (${truncateId(String(d.fldPDataID))})`;

  const idHint = String(d.fldPDataID || '').trim()
    ? `Record ID: ${truncateId(String(d.fldPDataID), 12)}`
    : '';

  return { findingShort, clientLine, locationLine, categoryItemLine, deletedLine, idHint };
}

interface TrashBinProps {
  deletedRecords: {
    clients: any[];
    facilities: any[];
    projects: any[];
    projectData?: any[];
  };
  trashInspectionLookup?: TrashInspectionLookup;
  deletedInspectionLoading?: boolean;
  deletedInspectionError?: string | null;
  onRetryDeletedInspectionFetch?: () => void;
  onRestoreClient: (id: string) => void;
  onRestoreFacility: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onRestoreProjectData: (id: string) => void;
}

export function TrashBin({
  deletedRecords,
  trashInspectionLookup,
  deletedInspectionLoading = false,
  deletedInspectionError = null,
  onRetryDeletedInspectionFetch,
  onRestoreClient,
  onRestoreFacility,
  onRestoreProject,
  onRestoreProjectData
}: TrashBinProps) {
  const deletedProjectRows = deletedRecords.projectData ?? [];
  const lookup = trashInspectionLookup ?? EMPTY_LOOKUP;
  const listScrollClass =
    'max-h-[min(42vh,280px)] overflow-y-auto overscroll-contain space-y-2 pr-2';
  const inspectionListScrollClass =
    'max-h-[min(55vh,480px)] overflow-y-auto overscroll-contain space-y-2 pr-2';

  return (
    <Card className="shrink-0 overflow-visible p-6 border-red-100 bg-red-50/10 mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg text-red-600">
            <Trash2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-900">Trash Bin (Soft-Deleted Records)</h2>
            <p className="text-xs text-red-600">
              These records are hidden from the app but can be restored. Inspection records are loaded
              across all projects when Trash is opened.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Deleted Clients */}
        <div className="min-w-0 space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Clients ({deletedRecords.clients.length})</h3>
          <div className={listScrollClass}>
            {deletedRecords.clients
              .filter((c: any) => c && c.fldClientID) 
              .map((c: any) => (
              <div key={c.fldClientID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{c.fldClientName}</span>
                <button onClick={() => onRestoreClient(c.fldClientID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.clients.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted clients.</p>}
          </div>
        </div>

        {/* Deleted Facilities */}
        <div className="min-w-0 space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Facilities ({deletedRecords.facilities.length})</h3>
          <div className={listScrollClass}>
            {deletedRecords.facilities
              .filter((f: any) => f && f.fldFacID)
              .map((f: any) => (
              <div key={f.fldFacID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{f.fldFacName}</span>
                <button onClick={() => onRestoreFacility(f.fldFacID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.facilities.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted facilities.</p>}
          </div>
        </div>

        {/* Deleted Projects */}
        <div className="min-w-0 space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Projects ({deletedRecords.projects.length})</h3>
          <div className={listScrollClass}>
            {deletedRecords.projects
              .filter((p: any) => p && p.fldProjID)
              .map((p: any) => (
              <div key={p.fldProjID} className="p-3 bg-white border border-red-100 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-xs font-medium truncate mr-2">{p.fldProjName}</span>
                <button onClick={() => onRestoreProject(p.fldProjID)} className="flex items-center text-blue-600 hover:bg-blue-50 h-7 text-[10px] px-2 rounded font-medium">
                  <RotateCcw size={12} className="mr-1" /> Restore
                </button>
              </div>
            ))}
            {deletedRecords.projects.length === 0 && <p className="text-xs text-zinc-400 italic">No deleted projects.</p>}
          </div>
        </div>

        {/* Deleted inspection / project data records */}
        <div className="min-w-0 space-y-3">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Inspection records (
            {deletedInspectionLoading ? '…' : deletedProjectRows.length})
          </h3>
          <div className={inspectionListScrollClass}>
            {deletedInspectionLoading ? (
              <p className="text-xs text-zinc-500 italic">Loading deleted inspection records…</p>
            ) : null}
            {!deletedInspectionLoading && deletedInspectionError ? (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3">
                <p className="text-xs text-red-700">{deletedInspectionError}</p>
                {onRetryDeletedInspectionFetch ? (
                  <button
                    type="button"
                    onClick={onRetryDeletedInspectionFetch}
                    className="text-[10px] font-medium text-blue-600 hover:underline"
                  >
                    Retry load
                  </button>
                ) : null}
              </div>
            ) : null}
            {!deletedInspectionLoading && !deletedInspectionError
              ? deletedProjectRows
              .filter((d: any) => d && d.fldPDataID)
              .map((d: any) => {
                const ctx = resolveInspectionRecordContext(d as Record<string, unknown>, lookup);
                return (
                  <div
                    key={d.fldPDataID}
                    className="flex flex-col gap-1.5 rounded-xl border border-red-100 bg-white p-3 shadow-sm"
                  >
                    <div className="text-xs font-semibold leading-snug text-zinc-900">{ctx.findingShort}</div>
                    <div className="text-[10px] leading-snug text-zinc-600">{ctx.clientLine}</div>
                    <div className="text-[10px] leading-snug text-zinc-600">
                      <span className="font-semibold text-zinc-500">Location:</span> {ctx.locationLine}
                    </div>
                    <div className="text-[10px] leading-snug text-zinc-600">{ctx.categoryItemLine}</div>
                    <div className="text-[10px] leading-snug text-zinc-500">{ctx.deletedLine}</div>
                    {ctx.idHint ? (
                      <div className="text-[9px] leading-snug text-zinc-400" title={String(d.fldPDataID)}>
                        {ctx.idHint}
                      </div>
                    ) : null}
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => onRestoreProjectData(d.fldPDataID)}
                        className="flex h-7 shrink-0 items-center rounded px-2 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
                      >
                        <RotateCcw size={12} className="mr-1" /> Restore
                      </button>
                    </div>
                  </div>
                );
              })
              : null}
            {!deletedInspectionLoading &&
              !deletedInspectionError &&
              deletedProjectRows.length === 0 && (
              <p className="text-xs text-zinc-400 italic">No deleted inspection records.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
