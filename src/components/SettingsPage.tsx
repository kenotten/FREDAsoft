// @ts-nocheck
import React from 'react';
import { 
  Settings, RefreshCw, Database, ShieldCheck, AlertCircle, Loader2, Play, Search, Trash2
} from 'lucide-react';
import { Button, Card } from './ui/core';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { firestoreService } from '../services/firestoreService';
import { QuotaGauge } from './QuotaGauge';

export const SettingsPage = ({
  sessionReads, sessionWrites, findings = [], recommendations = [], glossary = [], onEditGlossaryItem, isAdmin
}: any) => {
  const [auditResults, setAuditResults] = React.useState<any[] | null>(null);
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [isNormalizing, setIsNormalizing] = React.useState(false);
  
  // ✅ DECIDED: Surgery complete. Debug tools hidden for clean production-ready UI.
  const SHOW_DEBUG_TOOLS = false; 

  const runAudit = async () => {
    setIsAuditing(true);
    toast.loading("Scanning database schema...");
    
    setTimeout(() => {
      const results: any[] = [];
      const recIds = new Set(recommendations.map(r => (r.id || r.fldRecID)));

      // 1. Audit Findings
      findings.forEach(f => {
        const issues: string[] = [];
        // Type Mismatch
        if (f.fldSuggestedRecs && !Array.isArray(f.fldSuggestedRecs)) {
          issues.push("fldSuggestedRecs is not an array");
        }
        // Empty Title
        if (!f.fldFindShort || f.fldFindShort.trim() === "" || f.fldFindShort.toLowerCase() === "no title") {
          issues.push("Missing or 'No Title' short title");
        }
        // Broken Links
        if (Array.isArray(f.fldSuggestedRecs)) {
          f.fldSuggestedRecs.forEach(rid => {
            if (!recIds.has(rid)) issues.push(`Broken link to Rec ID: ${rid}`);
          });
        }

        if (issues.length > 0) {
          results.push({
            type: 'finding',
            id: f.id || f.fldFindID,
            name: f.fldFindShort || "Unnamed Finding",
            issues,
            raw: f
          });
        }
      });

      // 2. Audit Recommendations
      recommendations.forEach(r => {
        const issues: string[] = [];
        if (!r.fldRecShort || r.fldRecShort.trim() === "" || r.fldRecShort.toLowerCase() === "no title") {
          issues.push("Missing or 'No Title' short title");
        }
        if (issues.length > 0) {
          results.push({
            type: 'recommendation',
            id: r.id || r.fldRecID,
            name: r.fldRecShort || "Unnamed Recommendation",
            issues,
            raw: r
          });
        }
      });

      setAuditResults(results);
      setIsAuditing(false);
      toast.dismiss();
      toast.success(`Audit complete. Found ${results.length} issues.`);
    }, 800);
  };

  const forceNormalizeAll = async () => {
    setIsNormalizing(true);
    toast.info("NORMALIZING DATABASE...", { duration: 3000 });
    
    toast.loading("Performing hard normalization...");
    try {
      let fixedCount = 0;
      const batch = writeBatch(db);
      
      // Fix Findings - Targeted Schema Flush
      findings.forEach(f => {
        try {
          const findId = f.id || f.fldFindID;
          if (!findId) {
            console.error("CRITICAL: Found finding record with no ID, skipping...", f);
            return;
          }

          let needsUpdate = false;
          const update: any = {};
          
          // CRITICAL FIX: Ensure fldSuggestedRecs is always a clean array
          const rawRecs = f.fldSuggestedRecs;
          // Force everything into a real array: Detect string and wrap in []
          if (rawRecs && !Array.isArray(rawRecs)) {
            update.fldSuggestedRecs = typeof rawRecs === 'string' ? [rawRecs.trim()] : [];
            needsUpdate = true;
          } else if (rawRecs === undefined || rawRecs === null) {
            update.fldSuggestedRecs = [];
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            const docRef = doc(db, 'findings', findId);
            batch.update(docRef, update);
            fixedCount++;
          }
        } catch (recordErr) {
          console.error(`Normalization error for finding ${f.id || f.fldFindID}:`, recordErr);
          toast.warning(`Skipped corrupt finding: ${f.id || f.fldFindID}`);
        }
      });

      // Purge Ghost Recommendations
      for (const r of recommendations) {
        try {
          const recId = r.id || r.fldRecID;
          if (!recId) {
            console.error("CRITICAL: Found recommendation record with no ID, skipping...", r);
            continue;
          }
          const title = (r.fldRecShort || "").trim();
          if (!title || title === "" || title.toLowerCase() === "no title") {
            const docRef = doc(db, 'recommendations', recId);
            batch.delete(docRef);
            fixedCount++;
          }
        } catch (recordErr) {
          console.error(`Normalization error for recommendation ${r.id || r.fldRecID}:`, recordErr);
        }
      }

      await batch.commit();
      firestoreService.incrementWrites(fixedCount);
      toast.dismiss();
      toast.success(`Normalization complete. ${fixedCount} operations performed.`);
      runAudit(); // Refresh
    } catch (err) {
      toast.dismiss();
      console.error("Critical normalization failure:", err);
      toast.error("Normalization failed.");
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleForcePurge = async (issue: any) => {
    const confirmMsg = `EMERGENCY PURGE: Are you sure you want to permanently delete this ${issue.type} (${issue.id}) from the database?`;
    // Note: We use a simple toast for confirmation or just execute as this is a "Force" facility.
    // User requested: "The handleForcePurge function must use the direct document reference"
    
    toast.loading(`Purging ${issue.id}...`);
    try {
      const collectionName = issue.type === 'finding' ? 'findings' : 'recommendations';
      await deleteDoc(doc(db, collectionName, issue.id));
      
      // Filter out locally immediately
      setAuditResults(prev => prev ? prev.filter(item => item.id !== issue.id) : null);
      
      toast.dismiss();
      toast.success("Record purged successfully.");
      
      // Optionally notify parents if they need to refresh their main lists
      // (This will happen on next sync/mount anyway)
    } catch (err) {
      toast.dismiss();
      console.error("Purge failure:", err);
      toast.error("Failed to purge record.");
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-sans tracking-tight text-zinc-900">Settings & System</h1>
        <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded-full">v85.1 | CLEAN_SWEEP_COMPLETE</div>
      </div>
      
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Database size={20} className="text-blue-600" />
          System Health & API Usage
        </h2>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Firestore Daily Quota</h3>
              <p className="text-xs text-zinc-500">Real-time read/write operations in the current session.</p>
            </div>
            <QuotaGauge reads={sessionReads} writes={sessionWrites} />
          </div>
        </div>
      </Card>

      {(isAdmin && SHOW_DEBUG_TOOLS) && (
        <Card className="p-6 border-zinc-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 rounded-lg text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Data Integrity Command Center</h2>
                <p className="text-xs text-zinc-500">Advanced diagnostic and schema enforcement tools.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={runAudit} disabled={isAuditing} variant="secondary">
                <RefreshCw size={16} className={cn("mr-2", isAuditing && "animate-spin")} />
                RUN SCHEMA AUDIT
              </Button>
              <Button onClick={forceNormalizeAll} variant="danger" disabled={isNormalizing}>
                <Play size={16} className={cn("mr-2", isNormalizing && "animate-spin")} /> FORCE NORMALIZE ALL
              </Button>
            </div>
          </div>

          {auditResults && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diagnostic Report: {auditResults.length} Issues Found</p>
                <Button size="xs" variant="ghost" onClick={() => setAuditResults(null)}>Clear Report</Button>
              </div>

              {auditResults.length > 0 ? (
                <div className="border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 bg-white">
                  {auditResults.map((issue, idx) => (
                    <div key={`${issue.id}-${idx}`} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-lg mt-1",
                          issue.type === 'finding' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                        )}>
                          {issue.type === 'finding' ? <Search size={14} /> : <Database size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-zinc-900">{issue.name}</h4>
                            <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{issue.id}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {issue.issues.map((msg: string, i: number) => (
                              <span key={i} className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle size={10} /> {msg}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 h-auto"
                          onClick={() => handleForcePurge(issue)}
                          title="FORCE PURGE"
                        >
                          <Trash2 size={16} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] uppercase tracking-widest"
                          onClick={() => {
                          const glossaryEntry = glossary.find(g => 
                            (issue.type === 'finding' && g.fldFind === issue.id) || 
                            (issue.type === 'recommendation' && g.fldRec === issue.id)
                          );
                          if (glossaryEntry) {
                            onEditGlossaryItem(glossaryEntry);
                          } else {
                            toast.error("Could not find direct glossary entry for this record.");
                          }
                        }}
                      >
                        VIEW / REPAIR
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                  <ShieldCheck size={48} className="mx-auto text-green-500 mb-4 opacity-20" />
                  <h3 className="text-zinc-900 font-bold">Schema Integrity Confirmed</h3>
                  <p className="text-sm text-zinc-500">No issues found in the current library.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};