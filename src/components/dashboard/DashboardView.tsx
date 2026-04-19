import React, { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { TrashBin } from './TrashBin';
import { StatsGrid } from './StatsGrid';
import { SystemResources } from './SystemResources';
import { 
  EntityManagementProps, 
  MasterDataProps, 
  ProjectContextProps 
} from '../layout/LayoutOrchestrator';

interface DashboardViewProps {
  isAdmin: boolean;
  setActiveTab: (tab: string) => void;
  entityProps: EntityManagementProps;
  masterDataProps: MasterDataProps;
  projectProps: ProjectContextProps;
}

export function DashboardView({ 
  isAdmin, 
  setActiveTab,
  entityProps,
  masterDataProps,
  projectProps
}: DashboardViewProps) {
  const [showTrash, setShowTrash] = useState(false);

  // Stats calculation
  const stats = {
    clients: entityProps.clients,
    projects: entityProps.projects,
    glossary: masterDataProps.glossary,
    projectData: projectProps.projectData,
    categories: masterDataProps.categories,
    items: masterDataProps.items,
    findings: masterDataProps.findings,
    recommendations: masterDataProps.recommendations,
  };

  const exportMasterGlossary = () => {
    const headers = [
      'Category Name',
      'Item Name',
      'Finding Short',
      'Finding Long',
      'Recommendation Short',
      'Recommendation Long',
      'Unit Cost'
    ];

    const rows: string[][] = [];
    const sortedCats = [...masterDataProps.categories].sort((a, b) => a.fldCategoryName.localeCompare(b.fldCategoryName));

    sortedCats.forEach(cat => {
      const catItems = masterDataProps.items.filter((i: any) => i.fldCatID === cat.fldCategoryID);
      
      if (catItems.length === 0) {
        rows.push([cat.fldCategoryName, '--- NO ITEMS ---', '', '', '', '', '']);
      } else {
        catItems.sort((a: any, b: any) => a.fldItemName.localeCompare(b.fldItemName)).forEach((item: any) => {
          const itemFindings = masterDataProps.findings.filter((f: any) => f.fldItem === item.fldItemID);
          
          if (itemFindings.length === 0) {
            rows.push([cat.fldCategoryName, item.fldItemName, '--- NO FINDINGS ---', '', '', '', '']);
          } else {
            itemFindings.sort((a: any, b: any) => a.fldFindShort.localeCompare(b.fldFindShort)).forEach((find: any) => {
              const findRecs = masterDataProps.recommendations.filter((r: any) => r.fldFind === find.fldFindID);
              
              if (findRecs.length === 0) {
                rows.push([cat.fldCategoryName, item.fldItemName, find.fldFindShort, find.fldFindLong, '--- NO RECOMMENDATIONS ---', '', '']);
              } else {
                findRecs.sort((a: any, b: any) => a.fldRecShort.localeCompare(b.fldRecShort)).forEach((rec: any) => {
                  rows.push([
                    cat.fldCategoryName,
                    item.fldItemName,
                    find.fldFindShort,
                    find.fldFindLong,
                    rec.fldRecShort,
                    rec.fldRecLong,
                    (rec.fldUnit || 0).toString()
                  ]);
                });
              }
            });
          }
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Master_Glossary_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFullBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      activeRecords: stats,
      deletedRecords: entityProps.deletedRecords
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Full_Backup_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-8 overflow-y-auto p-1">
      <DashboardHeader 
        isAdmin={isAdmin}
        showTrash={showTrash}
        setShowTrash={setShowTrash}
        downloadFullBackup={downloadFullBackup}
        exportMasterGlossary={exportMasterGlossary}
        onCleanupOrphans={entityProps.onCleanupOrphans}
      />

      {isAdmin && showTrash && (
        <TrashBin 
          deletedRecords={entityProps.deletedRecords}
          onRestoreClient={entityProps.onRestoreClient}
          onRestoreFacility={entityProps.onRestoreFacility}
          onRestoreProject={entityProps.onRestoreProject}
        />
      )}

      <StatsGrid stats={stats} />

      <SystemResources onViewDocuments={() => setActiveTab('documents')} />
    </div>
  );
}
