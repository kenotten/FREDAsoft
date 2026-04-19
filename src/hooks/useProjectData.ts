import { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import { ProjectData, Location } from '../types';

export interface ProjectDataResult {
  rawProjectData: ProjectData[];
  rawLocations: Location[];
}

/**
 * Hook to manage project-specific Firestore subscriptions for projectData and locations.
 */
export function useProjectData(projectId: string | null): ProjectDataResult {
  const [rawProjectData, setRawProjectData] = useState<ProjectData[]>([]);
  const [rawLocations, setRawLocations] = useState<Location[]>([]);

  useEffect(() => {
    // Null safety: If projectId is null or empty, return empty arrays and ensure all existing listeners are unsubscribed.
    if (!projectId) {
      setRawProjectData([]);
      setRawLocations([]);
      return;
    }

    // Subscription dependency rules: The subscription effect depends ONLY on projectId.
    // This eliminates unnecessary churn from unrelated UI state (like activeTab).
    const unsub = firestoreService.data.onSnapshot((data) => {
      if (data && Array.isArray(data)) {
        // App.tsx line 407: Filter out standards derived from legacy projectData imports
        const validProjectData = data.filter(d => !d.citation_num);
        setRawProjectData(validProjectData);
      }
    });

    const locUnsub = firestoreService.onSnapshot('locations', (data) => {
      setRawLocations(data);
    });

    return () => {
      unsub();
      locUnsub();
    };
  }, [projectId]);

  return { rawProjectData, rawLocations };
}
