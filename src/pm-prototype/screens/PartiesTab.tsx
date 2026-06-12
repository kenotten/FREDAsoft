import React, { useMemo } from 'react';
import { BadgeCheck, Building2, User, Users } from 'lucide-react';
import { StakeholderLinkReviewPanel } from '../components/StakeholderLinkReviewPanel';
import { Card } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import { PARTY_ROLE_LABELS, type MockProject, type MockProjectParty } from '../types';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  Client: <Building2 size={18} />,
  Owner: <User size={18} />,
  DesignProfessional: <Users size={18} />,
  OwnerAgent: <User size={18} />,
};

interface PartiesTabProps {
  project: MockProject;
  parties: MockProjectParty[];
}

export function PartiesTab({ project, parties }: PartiesTabProps) {
  const {
    getProjectSnapshot,
    getStakeholderLinkReviewsForProject,
    getCanonicalStakeholder,
    setStakeholderReviewDecision,
    updateStakeholderReviewNote,
  } = useMockPm();
  const snapshot = getProjectSnapshot(project.id);
  const tabsContacts = snapshot?.tabsContacts ?? [];
  const linkReviews = getStakeholderLinkReviewsForProject(project.id);
  const reviewByContactId = useMemo(
    () => new Map(linkReviews.map((r) => [r.tabsContactRowId, r])),
    [linkReviews]
  );

  const clientParty = parties.find((p) => p.role === 'Client');
  const ownerParty = parties.find((p) => p.role === 'Owner');
  const clientDiffersFromOwner =
    clientParty &&
    ownerParty &&
    clientParty.displayName.trim().toLowerCase() !== ownerParty.displayName.trim().toLowerCase();

  return (
    <div className="space-y-6">
      {tabsContacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
              Contact Info — TABS as-recorded (#tblContacts mock)
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-100 text-amber-800">
              SOURCE ONLY
            </span>
          </div>
          <Card className="overflow-hidden border-amber-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 bg-amber-50/50">
                    <th className="px-3 py-2 font-semibold">Contact Type</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Contact or Professional Name</th>
                    <th className="px-3 py-2 font-semibold">Address</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">E-mail</th>
                    <th className="px-3 py-2 font-semibold">Type of License</th>
                    <th className="px-3 py-2 font-semibold">License</th>
                    <th className="px-3 py-2 font-semibold">Is Current</th>
                  </tr>
                </thead>
                <tbody>
                  {tabsContacts.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-50">
                      <td className="px-3 py-2 text-xs font-medium">{row.contactType}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.contactOrProfessionalName}</td>
                      <td className="px-3 py-2 text-zinc-600 text-xs">{row.address}</td>
                      <td className="px-3 py-2 text-zinc-600">{row.phone}</td>
                      <td className="px-3 py-2 text-zinc-600 text-xs">{row.email}</td>
                      <td className="px-3 py-2 text-zinc-600">{row.typeOfLicense || '—'}</td>
                      <td className="px-3 py-2 text-zinc-600">{row.license || '—'}</td>
                      <td className="px-3 py-2">{row.isCurrent ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-xs text-zinc-400">
            Exact TABS spellings preserved (e.g. Owners Designated Agent, Registered Accessibility
            Specialists).
          </p>
        </div>
      )}

      {tabsContacts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">
              Canonical stakeholder review (mock)
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-indigo-100 text-indigo-800">
              Mock only — not saved
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            TABS rows are source/as-recorded and are not edited here. Staff review links each row to
            a canonical stakeholder candidate — separate from Client, Owner, Design Firm, Agent, and
            RAS roles.
          </p>
          <div className="space-y-4">
            {tabsContacts.map((row) => {
              const review = reviewByContactId.get(row.id);
              const candidate = review?.candidateStakeholderId
                ? getCanonicalStakeholder(review.candidateStakeholderId)
                : undefined;
              return (
                <StakeholderLinkReviewPanel
                  key={row.id}
                  contactRow={row}
                  review={review}
                  candidate={candidate}
                  onSetDecision={setStakeholderReviewDecision}
                  onUpdateNote={updateStakeholderReviewNote}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">
          FREDAsoft canonical parties (mock operational)
        </h3>

        {clientDiffersFromOwner && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
            <strong>Client ≠ Owner:</strong> Client ({project.clientLabel}) is the paying customer.
            Owner ({project.ownerLabel}) is the legally responsible party — shown separately below.
          </div>
        )}

        <div className="grid gap-3">
          {parties.map((party) => (
            <Card
              key={party.id}
              className={`p-4 ${
                party.role === 'Client'
                  ? 'border-l-4 border-l-blue-500'
                  : party.role === 'Owner'
                    ? 'border-l-4 border-l-emerald-500'
                    : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      party.role === 'Client'
                        ? 'bg-blue-100 text-blue-700'
                        : party.role === 'Owner'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {ROLE_ICONS[party.role]}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {PARTY_ROLE_LABELS[party.role]}
                      {party.role === 'Client' && (
                        <span className="ml-2 text-blue-600">(paying customer)</span>
                      )}
                      {party.role === 'Owner' && (
                        <span className="ml-2 text-emerald-600">(legal owner)</span>
                      )}
                    </p>
                    <p className="text-base font-semibold text-zinc-900 mt-0.5">
                      {party.displayName}
                    </p>
                    {party.email && (
                      <p className="text-sm text-zinc-500 mt-1">{party.email}</p>
                    )}
                    {party.phone && <p className="text-sm text-zinc-500">{party.phone}</p>}
                    {party.isPrimaryCorrespondence && (
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        Primary correspondence
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {party.isCanonicalLinked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-green-100 text-green-800">
                      <BadgeCheck size={12} />
                      Canonical linked (mock)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-zinc-100 text-zinc-500">
                      Not linked (mock)
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {parties.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-8">
            No mock parties for this project yet.
          </p>
        )}

        <p className="text-xs text-zinc-400">
          No stakeholder directory search in this prototype — parties are mock fixtures only.
        </p>
      </div>
    </div>
  );
}
