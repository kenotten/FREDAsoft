import React from 'react';
import { AlertTriangle, Link2 } from 'lucide-react';
import { Button, Card } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import { PARTY_ROLE_LABELS, TABS_DOCUMENT_TYPE_OPTIONS, type MockTdlrSourceSnapshot } from '../types';

interface SourceTabProps {
  projectId: string;
  snapshot: MockTdlrSourceSnapshot | undefined;
}

export function SourceTab({ projectId, snapshot }: SourceTabProps) {
  const { approveCandidateLink } = useMockPm();

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-600">
          No TDLR data snapshot for this mock project yet. Add a TABS # at intake or use a
          fixture project that includes TDLR data (e.g. Riverside Medical Annex).
        </div>
      </div>
    );
  }

  const { asRecorded } = snapshot;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 flex gap-3 text-sm text-amber-950">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <p>
          <strong>TDLR data values are as-recorded from TDLR/TABS.</strong> They do not overwrite
          FREDA project roles. Review candidate FREDA stakeholder links separately.
        </p>
      </div>

      {snapshot.sourceNote && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
          <strong>MOCK TABS notice:</strong> {snapshot.sourceNote}
        </div>
      )}

      <Card className="p-5 bg-amber-50/40 border-amber-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
            TDLR data snapshot — Manage Project panel (read-only mock)
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-200 text-amber-900">
            TDLR DATA — READ ONLY
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Project ID</dt>
            <dd className="mt-1 font-mono font-medium">{asRecorded.projectIdLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">TABS #</dt>
            <dd className="mt-1 font-mono font-medium">{snapshot.tabsNumber}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Status</dt>
            <dd className="mt-1">{asRecorded.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Last Action</dt>
            <dd className="mt-1">{asRecorded.lastAction}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Project Created By</dt>
            <dd className="mt-1">{asRecorded.projectCreatedBy}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Plan Review By</dt>
            <dd className="mt-1">{asRecorded.planReviewBy}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Inspection By</dt>
            <dd className="mt-1">{asRecorded.inspectionBy}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Captured at</dt>
            <dd className="mt-1">{new Date(snapshot.capturedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Registrant</dt>
            <dd className="mt-1">{asRecorded.registrantName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Owner (as recorded)</dt>
            <dd className="mt-1 font-medium">{asRecorded.ownerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">Registration date</dt>
            <dd className="mt-1">{asRecorded.registrationDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-amber-800 uppercase">DataVersionId</dt>
            <dd className="mt-1 font-mono text-xs">{asRecorded.dataVersionId}</dd>
          </div>
          {snapshot.managePanel && (
            <>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Project Name</dt>
                <dd className="mt-1">{snapshot.managePanel.projectName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">
                  Building or FacilityName
                </dt>
                <dd className="mt-1">{snapshot.managePanel.buildingOrFacilityName}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-amber-800 uppercase">Address</dt>
                <dd className="mt-1">{snapshot.managePanel.address}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-amber-800 uppercase">Scope of Work</dt>
                <dd className="mt-1">{snapshot.managePanel.scopeOfWork}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">
                  Estimate of square footage
                </dt>
                <dd className="mt-1">{snapshot.managePanel.squareFootage}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Est. Start Date</dt>
                <dd className="mt-1">{snapshot.managePanel.estStartDate}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Est. End Date</dt>
                <dd className="mt-1">{snapshot.managePanel.estEndDate}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Estimated Cost</dt>
                <dd className="mt-1">{snapshot.managePanel.estimatedCost}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Job Class</dt>
                <dd className="mt-1">{snapshot.managePanel.jobClass}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-amber-800 uppercase">Owner Class</dt>
                <dd className="mt-1">{snapshot.managePanel.ownerClass}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">
                  Private Funds Provided By Tenant?
                </dt>
                <dd className="mt-1">{snapshot.managePanel.privateFundsByTenant}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">RAS</dt>
                <dd className="mt-1">{snapshot.managePanel.rasDisplay || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Tenant</dt>
                <dd className="mt-1">{snapshot.managePanel.tenant || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">
                  Is Roadway Construction?
                </dt>
                <dd className="mt-1">{snapshot.managePanel.roadwayConstruction}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-amber-800 uppercase">Project CAD Number</dt>
                <dd className="mt-1">{snapshot.managePanel.cadNumber || '—'}</dd>
              </div>
            </>
          )}
        </dl>
      </Card>

      {snapshot.tabsStatusUpdates.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Project Status Updates (TDLR data)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Report Date</th>
                  <th className="px-4 py-3 font-semibold">Submitted On</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.tabsStatusUpdates.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50">
                    <td className="px-4 py-3">{row.description}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.reportDate}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.submittedOn}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-xs">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {snapshot.inspectionDocuments && snapshot.inspectionDocuments.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Inspection — InspectionUploadedTable (TDLR data mock)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2 font-semibold">RAS</th>
                  <th className="px-3 py-2 font-semibold">Document</th>
                  <th className="px-3 py-2 font-semibold">File</th>
                  <th className="px-3 py-2 font-semibold">Reported</th>
                  <th className="px-3 py-2 font-semibold">Submitted</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.inspectionDocuments.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50">
                    <td className="px-3 py-2">{row.ras}</td>
                    <td className="px-3 py-2">{row.document}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-600">{row.file}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.reported}</td>
                    <td className="px-3 py-2 text-zinc-600">{row.submitted}</td>
                    <td className="px-3 py-2 text-xs">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-4 bg-zinc-50 border-zinc-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Upload Documents — Document Type reference (PSUUPDocumentTypeId mock)
        </h4>
        <p className="text-xs text-zinc-500 mb-3">
          Checklist labels only — not FREDA project role fields.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-zinc-700">
          {TABS_DOCUMENT_TYPE_OPTIONS.map((label) => (
            <li key={label} className="truncate">
              {label}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Link2 size={14} />
          Candidate FREDA stakeholder link badges (assistive only)
        </h4>
        {snapshot.candidateLinks.map((link) => (
          <Card key={link.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {PARTY_ROLE_LABELS[link.partyRole]} — {link.matchReason}
              </p>
              {link.approved && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-800">
                  Link approved (mock badge only)
                </span>
              )}
            </div>
            <Button
              variant={link.approved ? 'secondary' : 'primary'}
              size="sm"
              type="button"
              onClick={() => approveCandidateLink(projectId, link.id)}
            >
              {link.approved ? 'Revoke mock link' : 'Approve link (mock)'}
            </Button>
          </Card>
        ))}
        {snapshot.candidateLinks.length === 0 && (
          <p className="text-sm text-zinc-400">No candidate FREDA stakeholder links in this mock snapshot.</p>
        )}
      </div>
    </div>
  );
}
