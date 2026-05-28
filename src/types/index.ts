export interface Inspector {
  fldInspID: string;
  fldInspName: string;
  fldTitle?: string;
  fldCredentials?: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Client {
  fldClientID: string;
  fldClientName: string;
  fldClientAddress?: string;
  fldClientCity?: string;
  fldClientState?: string;
  fldClientZIP?: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Facility {
  fldFacID: string;
  fldFacName: string;
  fldFacAddress?: string;
  fldFacCity?: string;
  fldFacState?: string;
  fldFacZip?: string;
  fldClient: string; // FK to tblClient.fldClientID
  fldInspectionDate?: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface DesignFirm {
  fldDesignID: string;
  fldDesignFirmName: string;
}

export interface Project {
  fldProjID: string;
  fldClient: string; // FK from tblClient.fldClientID
  fldDesigner: string; // FK from tblDesignFirm.fldDesignID
  fldInspector: string; // FK from tblInspectors.fldInspID
  fldProjName: string;
  fldProjNumber?: string;
  fldExternalRef?: string;
  fldProjType?: 'Assessment' | 'TAS/RAS';
  fldProjDescription?: string;
  fldFacilities?: string[];
  fldFacID?: string; // Legacy/Filter compatibility
  fldPDDate: string;
  fldNarrative?: string;
  /** Per-facility report narrative within this project (key = fldFacID). */
  fldFacilityNarratives?: Record<string, string>;
  fldCostMultiplier?: number;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Category {
  id?: string;
  fldCategoryID: string;
  fldCategoryName: string;
  fldOrder?: number;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Item {
  id?: string;
  fldItemID: string;
  fldItemName: string;
  fldCatID: string; // FK from tblCategories.fldCategoryID
  fldOrder?: number;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Location {
  id?: string;
  fldLocID: string;
  fldLocName: string;
  fldFacID: string; // FK to tblFacility.fldFacID
  fldProjectID: string; // FK to tblProject.fldProjID
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Finding {
  id?: string;
  fldFindID: string;
  fldItem: string; // FK to tblItems.fldItemID
  fldFindShort: string;
  fldFindLong: string;
  fldOrder?: number;
  /** What is being measured (e.g. Slope, Width) — optional until backfilled */
  fldMeasurementType?: string;
  fldUnitType?: string;
  /** Library default citation IDs; may be absent on older Firestore rows */
  fldStandards?: string[];
  fldSuggestedRecs: string[]; // Array of MasterRecommendation IDs
  /** Glossary Set / standard-version context (e.g. UFAS vs TAS); optional on legacy rows */
  fldGlossarySetId?: string;
  fldGlossarySetName?: string;
  fldStandardType?: string;
  fldStandardVersion?: string;
  /** Lineage only (not equality): source finding this record was copied from */
  fldSourceFindingId?: string;
  /** Lineage only (not equality): source glossary set id */
  fldSourceGlossarySetId?: string;
  /** Lineage timestamp/string */
  fldSourceCopiedAt?: any;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
  /** Library archive: hidden from active selection; distinct from soft delete */
  fldIsArchived?: boolean;
}

export interface UnitType {
  fldUTID: string;
  fldUTName: string;
  fldUTAbbr: string;
  fldUTdataType: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface MasterRecommendation {
  id?: string;
  fldRecID: string;
  fldRecShort: string;
  fldRecLong: string;
  fldItem?: string;
  /** Optional metadata: item ids this recommendation relates to (organize/report only; glossary rows are canonical pairings) */
  fldAssociatedItemIds?: string[];
  fldOrder?: number;
  fldUnit: number; // Unit Cost (Currency)
  fldUOM: string; // Unit of Measure (EA, LF, etc.)
  fldCitation?: string;
  /** Library default citation IDs; may be absent on older Firestore rows */
  fldStandards?: string[];
  /** Glossary Set / standard-version context; optional on legacy rows */
  fldGlossarySetId?: string;
  fldGlossarySetName?: string;
  fldStandardType?: string;
  fldStandardVersion?: string;
  /** Lineage only (not equality): source recommendation this record was copied from */
  fldSourceRecommendationId?: string;
  /** Lineage only (not equality): source glossary set id */
  fldSourceGlossarySetId?: string;
  /** Lineage timestamp/string */
  fldSourceCopiedAt?: any;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
  /** Library archive: hidden from active selection; distinct from soft delete */
  fldIsArchived?: boolean;
}

export interface Recommendation extends MasterRecommendation {
  fldFind: string; // Legacy FK to tblFindings.fldFindID
}

export interface Glossary {
  id?: string;
  fldGlosId: string;
  /** Standard/version glossary set key (e.g. UFAS, ADA_2010, TAS_2012) */
  fldGlossarySetId?: string;
  /** Human-readable glossary set name (e.g. ADA 2010) */
  fldGlossarySetName?: string;
  /** Standard family/type for glossary set (e.g. ADA, TAS, UFAS) */
  fldGlossaryStandardType?: string;
  /** Standard version for glossary set (e.g. 2010, 2012, Guidelines) */
  fldGlossaryStandardVersion?: string;
  fldCat: string; // FK from tblCategories.fldCategoryID
  fldItem: string; // FK from tblItems.fldItemID
  fldFind: string; // FK from tblFindings.fldFindID
  fldRec: string; // FK from tblRecommendations.fldRecID
  fldUnitCost?: number; // Optional Override
  fldUnitType?: string; // Optional Override
  fldStandards?: string[]; // Array of MasterStandard IDs
  fldImages?: string[]; // Array of up to 4 image URLs
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface MasterStandard {
  id: string;
  order: number;
  chapter_name: string;
  section_num: string;
  section_name: string;
  citation_num: string;
  citation_name: string;
  content_text: string;
  relation_type: 'Standard' | 'Advisory' | 'Exception' | 'Figure' | 'Table' | 'Exception Advisory';
  fldStandardType: string;
  fldStandardVersion: string;
  fldIsArchived?: boolean;
  sub_sequence?: number;
  image_url?: string;
}

export interface TASImage {
  image_id: string;
  file_path: string;
  caption?: string;
  is_official_diagram: boolean;
}

export interface TASImageAssociation {
  id: string;
  citation_num: string;
  image_id: string;
}

export interface ProjectData {
  fldPDataID: string;
  fldPDataProject: string; // FK from tblProject.fldProjID
  fldFacility: string; // FK from tblFacility.fldFacID
  fldData: string; // FK from tblGlossary.fldGlosID
  fldRecordSource?: "glossary" | "custom";
  fldPDataCategoryID?: string;
  fldPDataItemID?: string;
  /** Trace: master finding template used for optional copy in custom mode */
  fldPDataMasterFindID?: string;
  fldPDataMasterRecID?: string;
  fldLocation: string; // FK to tblLocation.fldLocID
  fldFindShort: string;
  fldFindLong: string;
  fldRecShort: string;
  fldRecLong: string;
  fldQTY: number;
  fldMeasurement?: number;
  /** Snapshot: what is being measured (from library finding at save time) */
  fldMeasurementType?: string;
  fldMeasurementUnit?: string;
  fldUnitCost?: number;
  fldUnitType?: string;
  fldTotalCost?: number;
  fldImages: string[];
  fldStandards?: string[]; // FKs to tblMasterStandard.id (Snapshot)
  fldInspID: string; // FK to tblInspector.fldInspID
  fldTimestamp: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
  /** Lineage: source projectData id this row was cloned from */
  fldSourcePDataID?: string;
  /** Lineage: when the row was cloned (ISO string or server timestamp) */
  fldSourceClonedAt?: string | unknown;
  /** Lineage: source location id at clone time */
  fldSourceClonedFromLocationId?: string;
  /** Lineage: optional finding / recommendation / glossary ids at clone time */
  fldSourceFindingId?: string;
  fldSourceRecommendationId?: string;
  fldSourceGlossaryId?: string;
}

export interface StandardSnapshot {
  id: string;
  fldFindID: string;
  fldStandards: string[];
}

export interface UserPreference {
  uid: string;
  portfolioClientId?: string;
  portfolioViewMode?: 'projects' | 'facilities';
  dataEntrySelections?: {
    clientId?: string;
    facilityId?: string;
    projectId?: string;
    categoryId?: string;
    itemId?: string;
    findId?: string;
    recId?: string;
    locationId?: string;
    locationName?: string;
    /** Data Entry: glossary-approved path vs project-only custom record */
    dataEntryMode?: 'glossary' | 'custom';
  };
  workspaceContext?: {
    selectedClientId: string;
    selectedFacilityId: string;
    selectedProjectId: string;
    updatedAt: string;
  };
  glossaryBuilderSelections?: object;
  activeTab?: string;
  isSidebarOpen?: boolean;
}

export interface AppDocument {
  fldDocID: string;
  fldDocName: string;
  fldDocType: 'html' | 'pdf' | 'other';
  fldContent?: string;
  fldCreatedAt: string;
  fldUploadedBy: string;
}
