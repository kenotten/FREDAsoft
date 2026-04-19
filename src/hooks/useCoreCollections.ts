import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { firestoreService } from '../services/firestoreService';
import { 
  Category, 
  Item, 
  Finding, 
  UnitType, 
  MasterRecommendation,
  Glossary, 
  MasterStandard 
} from '../types';

export interface CoreCollections {
  rawCategories: Category[];
  rawItems: Item[];
  rawFindings: Finding[];
  rawUnitTypes: UnitType[];
  rawMasterRecommendations: MasterRecommendation[];
  glossary: Glossary[];
  standards: MasterStandard[];
  setRawFindings: Dispatch<SetStateAction<Finding[]>>;
  setRawMasterRecommendations: Dispatch<SetStateAction<MasterRecommendation[]>>;
  setGlossary: Dispatch<SetStateAction<Glossary[]>>;
  setStandards: Dispatch<SetStateAction<MasterStandard[]>>;
}

export function useCoreCollections(userId: string | undefined): CoreCollections {
  const [rawCategories, setRawCategories] = useState<Category[]>([]);
  const [rawItems, setRawItems] = useState<Item[]>([]);
  const [rawFindings, setRawFindings] = useState<Finding[]>([]);
  const [rawUnitTypes, setRawUnitTypes] = useState<UnitType[]>([]);
  const [rawMasterRecommendations, setRawMasterRecommendations] = useState<MasterRecommendation[]>([]);
  const [glossary, setGlossary] = useState<Glossary[]>([]);
  const [standards, setStandards] = useState<MasterStandard[]>([]);

  useEffect(() => {
    // We follow the same logic as App.tsx: if userId is the trigger, 
    // but the actual listeners handle their own state.
    // In the original App.tsx, the effect dependency was [user?.uid].
    
    try {
      const coreCollections = [
        { name: 'categories', setter: setRawCategories },
        { name: 'items', setter: setRawItems },
        { name: 'findings', setter: setRawFindings },
        { name: 'unitTypes', setter: setRawUnitTypes },
        { name: 'recommendations', setter: setRawMasterRecommendations },
        { name: 'glossary', setter: setGlossary },
        { name: 'tas_standards', setter: setStandards },
      ];

      const unsubs = coreCollections.map(col => firestoreService.onSnapshot(col.name, col.setter));
      
      return () => unsubs.forEach(u => u());
    } catch (error) {
      console.error('Error setting up core collection listeners in useCoreCollections:', error);
    }
  }, [userId]);

  return {
    rawCategories,
    rawItems,
    rawFindings,
    rawUnitTypes,
    rawMasterRecommendations,
    glossary,
    standards,
    setRawFindings,
    setRawMasterRecommendations,
    setGlossary,
    setStandards
  };
}
