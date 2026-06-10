import React from 'react';
import { BadgeCheck, Building2, User, Users } from 'lucide-react';
import { Card } from '../../components/ui/core';
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
  const clientParty = parties.find((p) => p.role === 'Client');
  const ownerParty = parties.find((p) => p.role === 'Owner');
  const clientDiffersFromOwner =
    clientParty &&
    ownerParty &&
    clientParty.displayName.trim().toLowerCase() !== ownerParty.displayName.trim().toLowerCase();

  return (
    <div className="space-y-4">
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
                  {party.phone && (
                    <p className="text-sm text-zinc-500">{party.phone}</p>
                  )}
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
  );
}
