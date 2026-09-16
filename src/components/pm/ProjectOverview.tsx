import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Client, Facility, Inspector, Project } from '../../types';
import {
  buildPmProjectOverview,
  formatPmAddressDisplay,
  PM_TDLR_HEADING,
  PM_TDLR_HELPER,
} from '../../lib/pmProjectOverview';
import { PM_NOT_ASSIGNED, PM_NOT_RECORDED } from '../../lib/pmProjectSearch';
import { Card } from '../ui/core';

interface ProjectOverviewProps {
  project: Project;
  clients: Client[];
  facilities: Facility[];
  inspectors: Inspector[];
  onBack: () => void;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const empty = !value;
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className={`mt-1 text-sm text-zinc-900 ${mono ? 'font-mono' : ''} ${empty ? 'text-zinc-400 italic' : ''}`}>
        {empty ? PM_NOT_RECORDED : value}
      </dd>
    </div>
  );
}

function SourceField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const empty = value.trim() === '';
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-amber-800">{label}</dt>
      <dd
        className={`mt-1 text-sm ${mono ? 'font-mono' : ''} ${
          empty ? 'text-amber-800/60 italic' : 'text-amber-950 whitespace-pre-wrap'
        }`}
      >
        {empty ? PM_NOT_RECORDED : value}
      </dd>
    </div>
  );
}

export function ProjectOverview({
  project,
  clients,
  facilities,
  inspectors,
  onBack,
}: ProjectOverviewProps) {
  const vm = buildPmProjectOverview(project, clients, facilities, inspectors);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Back to projects
      </button>

      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Project Overview</p>
        <h1 className="text-xl font-bold text-zinc-900 mt-1">{vm.projectNameDisplay}</h1>
        <p className="text-sm text-zinc-500 mt-1 font-mono">
          {vm.ocgNumberDisplay}
          <span className="mx-2 text-zinc-300">·</span>
          {vm.stateProjectIdDisplay}
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Project Identity</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Project Name" value={vm.projectNameDisplay === PM_NOT_RECORDED ? '' : vm.projectNameDisplay} />
          <Field label="OCG Project Number" value={vm.ocgNumberDisplay === PM_NOT_RECORDED ? '' : vm.ocgNumberDisplay} mono />
          <Field label="State Project ID" value={vm.stateProjectIdDisplay === PM_NOT_RECORDED ? '' : vm.stateProjectIdDisplay} mono />
          <Field label="Project Type" value={vm.projectTypeDisplay === PM_NOT_RECORDED ? '' : vm.projectTypeDisplay} />
          {vm.externalRefDisplay ? (
            <Field label="Architect / Design Professional Project #" value={vm.externalRefDisplay} />
          ) : null}
        </dl>
        <p className="text-[11px] text-zinc-400">TABS / legacy TDLR identifier is shown as State Project ID.</p>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Client / Facility</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Client" value={vm.clientNameDisplay === PM_NOT_RECORDED ? '' : vm.clientNameDisplay} />
          {vm.facilities.map((facility, index) => (
            <React.Fragment key={`${facility.nameDisplay}-${index}`}>
              <Field label={vm.facilities.length > 1 ? `Facility ${index + 1}` : 'Facility'} value={facility.nameDisplay === PM_NOT_ASSIGNED ? '' : facility.nameDisplay} />
              <Field
                label="Facility address"
                value={facility.addressDisplay === PM_NOT_RECORDED ? '' : facility.addressDisplay}
              />
            </React.Fragment>
          ))}
        </dl>
        <p className="text-[11px] text-zinc-400">Client is the FREDA customer. It is not the TDLR/TABS Owner.</p>
      </Card>

      <Card className="p-5 space-y-4 border-amber-200 bg-amber-50/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider">{PM_TDLR_HEADING}</h2>
            <p className="text-[12px] text-amber-900/80 mt-1 max-w-2xl">{PM_TDLR_HELPER}</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-200 text-amber-900">
            Read only
          </span>
        </div>

        {vm.tdlrEmptyState || !vm.tdlr ? (
          <p className="text-sm text-amber-950">{vm.tdlrEmptyState}</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SourceField label="State Project ID" value={vm.tdlr.stateProjectIdDisplay} mono />
            <SourceField label="Source" value={vm.tdlr.sourceDisplay} />
            <SourceField label="Owner (as recorded)" value={vm.tdlr.ownerNameDisplay} />
            <SourceField
              label="Owner address"
              value={
                formatPmAddressDisplay(vm.tdlr.ownerAddress) === PM_NOT_RECORDED
                  ? ''
                  : formatPmAddressDisplay(vm.tdlr.ownerAddress)
              }
            />
            <SourceField label="Owner contact" value={vm.tdlr.ownerContactDisplay} />
            <SourceField label="Design Firm (as recorded)" value={vm.tdlr.designFirmNameDisplay} />
            <SourceField label="Design Professional" value={vm.tdlr.designProfessionalDisplay} />
            <SourceField label="Registered site / facility" value={vm.tdlr.siteNameDisplay} />
            <SourceField
              label="Registered site address"
              value={
                formatPmAddressDisplay(vm.tdlr.siteAddress) === PM_NOT_RECORDED
                  ? ''
                  : formatPmAddressDisplay(vm.tdlr.siteAddress)
              }
            />
            <SourceField label="Scope of work" value={vm.tdlr.scopeOfWorkDisplay} />
            <SourceField label="Type of work" value={vm.tdlr.typeOfWorkDisplay} />
            <SourceField label="Tenant funded" value={vm.tdlr.tenantFundedDisplay === PM_NOT_RECORDED ? '' : vm.tdlr.tenantFundedDisplay} />
          </dl>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">RAS Assignment</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Plan Review RAS"
            value={vm.planReviewRasDisplay === PM_NOT_ASSIGNED ? '' : vm.planReviewRasDisplay}
          />
          <Field
            label="Inspection RAS"
            value={vm.inspectionRasDisplay === PM_NOT_ASSIGNED ? '' : vm.inspectionRasDisplay}
          />
        </dl>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Existing Dates</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Plan Review Date"
            value={vm.planReviewDateDisplay === PM_NOT_RECORDED ? '' : vm.planReviewDateDisplay}
          />
          <Field
            label="Inspection Date"
            value={vm.inspectionDateDisplay === PM_NOT_RECORDED ? '' : vm.inspectionDateDisplay}
          />
          <Field label="PD Date" value={vm.pdDateDisplay === PM_NOT_RECORDED ? '' : vm.pdDateDisplay} />
        </dl>
      </Card>
    </div>
  );
}
