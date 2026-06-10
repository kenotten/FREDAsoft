/**
 * FREDAsoft Project Management — Clickable Prototype (Phase A)
 *
 * MOCK ONLY · NO FIREBASE · NO PRODUCTION DATA · DISPOSABLE
 *
 * Purpose:
 *   Staff workflow review (Kenneth, Kathy, Jessica, RAS) before schema or production PM UI.
 *   Exercises intake, parties, TDLR source panel, status/scope, and feedback capture.
 *
 * Safety:
 *   - Separate Vite entry (`index-pm-prototype.html`) — does not load App.tsx or Auth.
 *   - All data is in-memory fixtures; reset via dashboard control.
 *   - No Firestore, Storage, TDLR/TABS calls, email, or SMS.
 *   - May be deleted after Archie #11 review without merge obligation.
 *
 * Grounding docs:
 *   - docs/FREDASOFT_PROJECT_PM_WIREFRAME_PLAN.md
 *   - docs/FREDASOFT_PROJECT_DAILY_WORKFLOW_DISCOVERY.md
 */

import React from 'react';
import { LayoutDashboard, Plus } from 'lucide-react';
import { PrototypeBanner } from './components/PrototypeBanner';
import { NewProjectIntake } from './screens/NewProjectIntake';
import { PmDashboard } from './screens/PmDashboard';
import { ProjectOverview } from './screens/ProjectOverview';
import { MockPmProvider, useMockPm } from './state/MockPmContext';

function PrototypeShell() {
  const { view, goToDashboard, goToIntake } = useMockPm();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <PrototypeBanner />

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">PM Prototype</p>
            <p className="text-sm font-semibold text-zinc-800 mt-1">FREDAsoft Mock</p>
          </div>
          <nav className="p-2 space-y-1 flex-1">
            <button
              type="button"
              onClick={goToDashboard}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'dashboard'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              type="button"
              onClick={goToIntake}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'intake'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <Plus size={16} />
              New project
            </button>
          </nav>
          <div className="p-3 border-t border-zinc-100 text-[10px] text-zinc-400 leading-relaxed">
            Disposable prototype. No Google sign-in. No saves.
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          {view === 'dashboard' && <PmDashboard />}
          {view === 'intake' && <NewProjectIntake />}
          {view === 'project' && <ProjectOverview />}
        </main>
      </div>
    </div>
  );
}

export function PmPrototypeApp() {
  return (
    <MockPmProvider>
      <PrototypeShell />
    </MockPmProvider>
  );
}
