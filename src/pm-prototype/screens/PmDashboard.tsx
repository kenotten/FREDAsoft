import React, { useMemo } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button, Card } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';
import { QUEUE_LABELS, type QueueKey } from '../types';

const QUEUE_KEYS: QueueKey[] = [
  'intake_pending',
  'assigned_to_ras',
  'in_review',
  'awaiting_payment',
  'ready_for_tdlr_send',
];

export function PmDashboard() {
  const {
    projects,
    selectedQueue,
    setSelectedQueue,
    openProject,
    goToIntake,
    resetMockData,
  } = useMockPm();

  const queueCounts = useMemo(() => {
    const counts: Record<QueueKey, number> = {
      intake_pending: 0,
      assigned_to_ras: 0,
      in_review: 0,
      awaiting_payment: 0,
      ready_for_tdlr_send: 0,
    };
    for (const p of projects) {
      counts[p.queue] += 1;
    }
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedQueue === 'all') return projects;
    return projects.filter((p) => p.queue === selectedQueue);
  }, [projects, selectedQueue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">PM Dashboard / Work Queue</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Mock queues replacing spreadsheet tabs — click a project to open overview. Rows tagged{' '}
            <span className="font-medium text-violet-700">TABS sample</span> are sanitized
            validation fixtures.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetMockData}>
            <RefreshCw size={16} className="mr-2" />
            Reset mock data
          </Button>
          <Button variant="primary" onClick={goToIntake}>
            <Plus size={16} className="mr-2" />
            New project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {QUEUE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedQueue(key)}
            className={`text-left p-4 rounded-xl border transition-colors ${
              selectedQueue === key
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {QUEUE_LABELS[key]}
            </p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{queueCounts[key]}</p>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-800">
            {selectedQueue === 'all' ? 'All mock projects' : QUEUE_LABELS[selectedQueue]}
          </h2>
          {selectedQueue !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedQueue('all')}
              className="text-xs text-blue-600 hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-semibold">OCG #</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Site</th>
                <th className="px-4 py-3 font-semibold">Sample</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">RAS</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.ocgProjectNumber}</td>
                  <td className="px-4 py-3">{p.clientLabel}</td>
                  <td className="px-4 py-3">{p.siteName}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.validationSampleLabel ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-violet-100 text-violet-800 max-w-[200px] truncate">
                        TABS sample
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-zinc-100 text-xs">
                      {p.currentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.assignedRas ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.nextDueDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.paymentPending ? (
                      <span className="text-amber-700 font-medium text-xs">Pending</span>
                    ) : (
                      <span className="text-zinc-400 text-xs">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                    No mock projects in this queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
