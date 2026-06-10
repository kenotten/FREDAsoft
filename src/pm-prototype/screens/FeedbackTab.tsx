import React, { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { Button, Card, Input, Select } from '../../components/ui/core';
import { useMockPm } from '../state/MockPmContext';

const SCREEN_OPTIONS = [
  { value: 'dashboard', label: 'PM Dashboard' },
  { value: 'intake', label: 'New Project Intake' },
  { value: 'overview', label: 'Project Overview' },
  { value: 'parties', label: 'Parties' },
  { value: 'source', label: 'TDLR Source Snapshot' },
  { value: 'status', label: 'Status & Scope' },
  { value: 'feedback', label: 'Staff Feedback' },
];

const ISSUE_OPTIONS = [
  { value: 'missing_step', label: 'Missing step' },
  { value: 'wrong_status', label: 'Rename / wrong status' },
  { value: 'required_field', label: 'Required field missing' },
  { value: 'wrong_handoff', label: 'Wrong handoff' },
  { value: 'terminology', label: 'Terminology confusion' },
  { value: 'other', label: 'Other' },
];

interface FeedbackTabProps {
  projectId: string;
}

export function FeedbackTab({ projectId }: FeedbackTabProps) {
  const { feedback, addFeedback } = useMockPm();
  const [screen, setScreen] = useState('overview');
  const [issueType, setIssueType] = useState('missing_step');
  const [reviewerName, setReviewerName] = useState('');
  const [notes, setNotes] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const projectFeedback = feedback.filter((f) => f.projectId === projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;
    addFeedback({
      screen,
      issueType,
      reviewerName: reviewerName.trim() || 'Anonymous reviewer',
      notes: notes.trim(),
      projectId,
    });
    setNotes('');
  };

  const buildSummary = () => {
    const lines = [
      'FREDAsoft PM Prototype — Staff Feedback Summary (MOCK)',
      `Generated: ${new Date().toLocaleString()}`,
      `Project ID: ${projectId}`,
      '---',
      ...projectFeedback.map(
        (f, i) =>
          `${i + 1}. [${f.screen}] ${f.issueType} — ${f.reviewerName}\n   ${f.notes}\n   (${new Date(f.createdAt).toLocaleString()})`
      ),
    ];
    if (projectFeedback.length === 0) {
      lines.push('(No feedback entries yet for this project.)');
    }
    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = buildSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied to clipboard');
    } catch {
      setCopyStatus('Copy failed — see summary below');
    }
    setTimeout(() => setCopyStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-4">
          Staff feedback (mock)
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Screen"
            value={screen}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScreen(e.target.value)}
            options={SCREEN_OPTIONS}
          />
          <Select
            label="Issue type"
            value={issueType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIssueType(e.target.value)}
            options={ISSUE_OPTIONS}
          />
          <Input
            label="Reviewer name"
            value={reviewerName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setReviewerName(e.target.value)
            }
            placeholder="Kathy, Jessica, Kenneth, …"
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black min-h-[100px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Missing step? Wrong status name? Required field?"
            />
          </div>
          <Button type="submit" variant="primary">
            Add feedback (local only)
          </Button>
        </form>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="secondary" type="button" onClick={handleCopy}>
          <ClipboardCopy size={16} className="mr-2" />
          Copy feedback summary
        </Button>
        {copyStatus && <span className="text-sm text-green-700">{copyStatus}</span>}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Feedback for this project ({projectFeedback.length})
          </h4>
        </div>
        <ul className="divide-y divide-zinc-50">
          {projectFeedback.map((f) => (
            <li key={f.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                <span className="font-semibold uppercase">{f.screen}</span>
                <span>·</span>
                <span>{f.issueType}</span>
                <span>·</span>
                <span>{f.reviewerName}</span>
                <span>·</span>
                <span>{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-zinc-800">{f.notes}</p>
            </li>
          ))}
          {projectFeedback.length === 0 && (
            <li className="px-4 py-6 text-center text-zinc-400 text-sm">
              No feedback yet. Use the form above during walkthrough.
            </li>
          )}
        </ul>
      </Card>

      <Card className="p-4 bg-zinc-50">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Summary preview
        </p>
        <pre className="text-xs text-zinc-700 whitespace-pre-wrap font-mono">{buildSummary()}</pre>
      </Card>
    </div>
  );
}
