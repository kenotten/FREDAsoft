import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, Select } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import {
  INTAKE_SCENARIO_LABELS,
  SERVICE_SCOPES,
  type IntakeFormData,
  type IntakeScenario,
  type ServiceScope,
} from '../types';

const SCENARIO_OPTIONS = Object.entries(INTAKE_SCENARIO_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SCOPE_OPTIONS = SERVICE_SCOPES.map((s) => ({ value: s, label: s }));

const DEFAULT_FORM: IntakeFormData = {
  scenario: 'preliminary_review',
  ocgProjectNumber: '',
  tabsNumber: '',
  client: '',
  siteName: '',
  serviceScope: 'Preliminary review only',
  dateReceived: new Date().toISOString().slice(0, 10),
};

export function NewProjectIntake() {
  const { goToDashboard, createProjectFromIntake } = useMockPm();
  const [form, setForm] = useState<IntakeFormData>({ ...DEFAULT_FORM });

  const update = <K extends keyof IntakeFormData>(key: K, value: IntakeFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleScenarioChange = (scenario: IntakeScenario) => {
    setForm((prev) => {
      const next = { ...prev, scenario };
      if (scenario === 'preliminary_review') {
        next.serviceScope = 'Preliminary review only';
      } else if (scenario === 'tabs_registered') {
        next.serviceScope = 'Plan review + inspection';
      } else if (scenario === 'ocg_assisted_registration') {
        next.serviceScope = 'OCG-assisted registration';
      } else if (scenario === 'inspection_only_transfer') {
        next.serviceScope = 'File transfer / takeover inspection';
      } else if (scenario === 'ocg_pending_tabs') {
        next.serviceScope = 'Preliminary review only';
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectFromIntake(form);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={goToDashboard}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </button>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900">New Project Intake</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Choose an intake scenario and enter mock fields. Nothing is saved to production.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-800">
        This intake updates <strong>in-memory mock state only</strong>. Closing the browser
        discards changes unless you stay on this page.
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <Select
          label="Intake scenario"
          value={form.scenario}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handleScenarioChange(e.target.value as IntakeScenario)
          }
          options={SCENARIO_OPTIONS}
        />

        <Input
          label="OCG project number"
          value={form.ocgProjectNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            update('ocgProjectNumber', e.target.value)
          }
          placeholder="e.g. OCG-2026-0142"
        />

        <Input
          label="TABS number (optional)"
          value={form.tabsNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            update('tabsNumber', e.target.value)
          }
          placeholder="e.g. TABS-123456"
        />

        <Input
          label="Client"
          value={form.client}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('client', e.target.value)}
          placeholder="Paying customer (Client FREDA project role)"
        />

        <Input
          label="Site name"
          value={form.siteName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('siteName', e.target.value)}
          placeholder="Building or site label"
        />

        <Select
          label="Service scope"
          value={form.serviceScope}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            update('serviceScope', e.target.value as ServiceScope)
          }
          options={SCOPE_OPTIONS}
        />

        <Input
          label="Date received"
          type="date"
          value={form.dateReceived}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            update('dateReceived', e.target.value)
          }
        />

        <div className="pt-2 flex gap-3">
          <Button type="submit" variant="primary" className="flex-1">
            Create mock project (not saved)
          </Button>
          <Button type="button" variant="secondary" onClick={goToDashboard}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
