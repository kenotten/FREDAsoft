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
  fldUnitType?: string;
  fldStandards: string[]; // Array of MasterStandard IDs
  fldSuggestedRecs: string[]; // Array of MasterRecommendation IDs
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
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
  fldOrder?: number;
  fldUnit: number; // Unit Cost (Currency)
  fldUOM: string; // Unit of Measure (EA, LF, etc.)
  fldCitation?: string;
  fldStandards: string[]; // Array of MasterStandard IDs
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
}

export interface Recommendation extends MasterRecommendation {
  fldFind: string; // Legacy FK to tblFindings.fldFindID
}

export interface Glossary {
  id?: string;
  fldGlosId: string;
  fldCat: string; // FK from tblCategories.fldCategoryID
  fldItem: string; // FK from tblItems.fldItemID
  fldFind: string; // FK from tblFindings.fldFindID
  fldRec: string; // FK from tblRecommendations.fldRecID
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
  fldLocation: string; // FK to tblLocation.fldLocID
  fldFindShort: string;
  fldFindLong: string;
  fldRecShort: string;
  fldRecLong: string;
  fldQTY: number;
  fldMeasurement?: number;
  fldUnitType?: string;
  fldImages: string[];
  fldStandards?: string[]; // FKs to tblMasterStandard.id (Snapshot)
  fldInspID: string; // FK to tblInspector.fldInspID
  fldTimestamp: string;
  fldDeleted?: boolean;
  fldIsDeleted?: boolean;
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
  dataEntrySelections?: object;
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
