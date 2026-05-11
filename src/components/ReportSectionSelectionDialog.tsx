import React, { useEffect, useState } from 'react';
import { Modal } from './ui/modal';
import { Button } from './ui/button';
import type { ReportRecordSortOrder } from '../lib/reportPreviewShared';

export type ReportSectionSelection = {
  cover: true;
  narrative: boolean;
  documentation: boolean;
  financial: boolean;
  referencedStandards: boolean;
  photoAddendum: boolean;
  recordSortOrder: ReportRecordSortOrder;
};

export const DEFAULT_REPORT_SECTION_SELECTION: ReportSectionSelection = {
  cover: true,
  narrative: true,
  documentation: true,
  financial: true,
  referencedStandards: true,
  photoAddendum: true,
  recordSortOrder: 'category_location_item'
};

export interface ReportSectionSelectionDialogProps {
  isOpen: boolean;
  hasReferencedStandards: boolean;
  hasPhotoAddendum: boolean;
  onClose: () => void;
  onConfirm: (selection: ReportSectionSelection) => void;
}

export function ReportSectionSelectionDialog({
  isOpen,
  hasReferencedStandards,
  hasPhotoAddendum,
  onClose,
  onConfirm
}: ReportSectionSelectionDialogProps) {
  const [narrative, setNarrative] = useState(true);
  const [documentation, setDocumentation] = useState(true);
  const [financial, setFinancial] = useState(true);
  const [referencedStandards, setReferencedStandards] = useState(true);
  const [photoAddendum, setPhotoAddendum] = useState(true);
  const [recordSortOrder, setRecordSortOrder] = useState<ReportRecordSortOrder>('category_location_item');

  useEffect(() => {
    if (!isOpen) return;
    setNarrative(true);
    setDocumentation(true);
    setFinancial(true);
    setReferencedStandards(hasReferencedStandards);
    setPhotoAddendum(hasPhotoAddendum);
    setRecordSortOrder('category_location_item');
  }, [isOpen, hasReferencedStandards, hasPhotoAddendum]);

  const handleConfirm = () => {
    onConfirm({
      cover: true,
      narrative,
      documentation,
      financial,
      referencedStandards: hasReferencedStandards ? referencedStandards : false,
      photoAddendum: hasPhotoAddendum ? photoAddendum : false,
      recordSortOrder
    });
  };

  if (!isOpen) return null;

  return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Choose report sections"
        maxWidth="lg"
        overlayClassName="z-[100]"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirm}>
              View report
            </Button>
          </div>
        }
      >
        <p className="text-sm text-zinc-600 leading-relaxed">
          The cover page is always included. Uncheck sections you do not want in this preview or print.
        </p>
        <ul className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
          <li className="flex items-start gap-3">
            <input
              id="rs-cover"
              type="checkbox"
              checked
              disabled
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
            />
            <label htmlFor="rs-cover" className="text-sm text-zinc-800">
              <span className="font-semibold">Cover page</span>
              <span className="ml-2 text-xs font-normal text-zinc-500">(Always included)</span>
            </label>
          </li>
          <li className="flex items-start gap-3">
            <input
              id="rs-narrative"
              type="checkbox"
              checked={narrative}
              onChange={(e) => setNarrative(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/30"
            />
            <label htmlFor="rs-narrative" className="text-sm font-medium text-zinc-800">
              Narrative
            </label>
          </li>
          <li className="flex items-start gap-3">
            <input
              id="rs-documentation"
              type="checkbox"
              checked={documentation}
              onChange={(e) => setDocumentation(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/30"
            />
            <label htmlFor="rs-documentation" className="text-sm font-medium text-zinc-800">
              Documentation
            </label>
          </li>
          <li className="flex items-start gap-3">
            <input
              id="rs-financial"
              type="checkbox"
              checked={financial}
              onChange={(e) => setFinancial(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/30"
            />
            <label htmlFor="rs-financial" className="text-sm font-medium text-zinc-800">
              Financial summary
            </label>
          </li>
          {hasReferencedStandards ? (
            <li className="flex items-start gap-3">
              <input
                id="rs-standards"
                type="checkbox"
                checked={referencedStandards}
                onChange={(e) => setReferencedStandards(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/30"
              />
              <label htmlFor="rs-standards" className="text-sm font-medium text-zinc-800">
                Referenced standards
              </label>
            </li>
          ) : null}
          {hasPhotoAddendum ? (
            <li className="flex items-start gap-3">
              <input
                id="rs-photo"
                type="checkbox"
                checked={photoAddendum}
                onChange={(e) => setPhotoAddendum(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-blue-500/30"
              />
              <label htmlFor="rs-photo" className="text-sm font-medium text-zinc-800">
                Photo addendum
              </label>
            </li>
          ) : null}
        </ul>

        <div className="mt-6 border-t border-zinc-100 pt-5">
          <h3 className="text-sm font-semibold text-zinc-900">Sort records by</h3>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="report-record-sort"
                className="mt-1 h-4 w-4 shrink-0 border-zinc-300 text-blue-600 focus:ring-blue-500/30"
                checked={recordSortOrder === 'category_location_item'}
                onChange={() => setRecordSortOrder('category_location_item')}
              />
              <span className="text-sm text-zinc-800">Category → Location → Item</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="report-record-sort"
                className="mt-1 h-4 w-4 shrink-0 border-zinc-300 text-blue-600 focus:ring-blue-500/30"
                checked={recordSortOrder === 'location_category_item'}
                onChange={() => setRecordSortOrder('location_category_item')}
              />
              <span className="text-sm text-zinc-800">Location → Category → Item</span>
            </label>
          </div>
        </div>
      </Modal>
  );
}
