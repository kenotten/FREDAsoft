import React from 'react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/core';
import { AlertTriangle } from 'lucide-react';

interface GlossaryOverwriteGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

export function GlossaryOverwriteGuardModal({ isOpen, onClose, onConfirm, itemName }: GlossaryOverwriteGuardModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      title="Unsaved Changes"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            onClick={onConfirm}
          >
            Discard & Continue
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
          <AlertTriangle size={24} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold block mb-1">Warning: Unsaved Changes in Builder</p>
            <p className="text-xs leading-relaxed opacity-90">
              You have unsaved changes in the Glossary Builder. Opening {itemName ? `"${itemName}"` : 'another record'} will discard your current progress.
            </p>
            <p className="text-[10px] mt-3 font-semibold uppercase tracking-wider opacity-60">Continue anyway?</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
