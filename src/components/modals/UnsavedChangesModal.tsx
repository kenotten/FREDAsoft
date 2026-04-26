import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Save, Trash2, X } from 'lucide-react';
import { Button, Card } from '../ui/core';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
}

export function UnsavedChangesModal({ 
  isOpen, 
  onClose, 
  onDiscard, 
  onSave,
  isSaving = false
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm" 
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md"
        >
          <Card className="shadow-2xl border-zinc-200 p-0 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Unsaved Changes</h2>
              <p className="text-sm text-zinc-500 font-medium">
                You have unsaved changes. What would you like to do?
              </p>
            </div>
            
            <div className="bg-zinc-50 p-4 border-t border-zinc-100 flex flex-col gap-2">
              <Button 
                onClick={onSave} 
                disabled={isSaving}
                className="w-full bg-black text-white hover:bg-zinc-800 py-3 font-bold"
              >
                <Save size={16} className="mr-2" /> {isSaving ? 'Saving Changes...' : 'Save & Leave'}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={onDiscard} 
                  disabled={isSaving}
                  className="flex-1 bg-white border-zinc-200 text-zinc-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 font-bold"
                >
                  <Trash2 size={14} className="mr-2" /> Discard Changes
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  disabled={isSaving}
                  className="flex-1 font-bold text-zinc-400 hover:text-zinc-600"
                >
                  <X size={14} className="mr-2" /> Cancel
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
