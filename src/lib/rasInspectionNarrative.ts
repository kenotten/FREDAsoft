/**
 * RAS Inspection report Narrative fallbacks (user-supplied template text).
 * Display-only. Not persisted. Not independently verified legal guidance.
 * Selected from registered TABS Type of Work after authored Narrative is exhausted.
 */

/** Alteration / Alterations Type of Work — 202.3 / 202.4 template. Do not rewrite wording. */
export const RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK = `The following report identifies violations of the 2012 Texas Accessibility Standards (TAS) that must be addressed within 270 days from the date of this report.  Compliance with the Texas Accessibility Standards (TAS) is required by Texas Government Code chapter 469 (the Statute) and Chapter 121 of the Texas Human Resources Code and governed by the Administrative Rules of the Texas Department of Licensing and Regulation (the Rules).

In this report, citations of the TAS may be identified in a section that includes applicable sub-sections or references to additional sections in the TAS, Rules, or the Statute. In some cases, citations of the TAS or other codes and standards may be provided in abbreviated or restated form for clarity or brevity as a guide.  The owner, commissioned design professionals and other responsible parties should thoroughly review the referenced citations of the Texas Accessibility Standards, Rules, and Statute in their entirety. Please contact the inspector if you have any questions about the applicability of the referenced Standards.

TEXAS ACCESSIBILITY STANDARDS

202.3 Alterations. Where existing elements, spaces, or common use areas are altered, each altered element, space, or common use area shall comply with the applicable requirements of Chapter 2.

202.4 Alterations Affecting Primary Function Areas. In addition to the requirements of 202.3, an alteration that affects or could affect the usability of or access to an area containing a primary function shall be made so as to ensure that, to the maximum extent feasible, the path of travel to the altered area, including the parking areas, rest rooms, telephones, and drinking fountains serving the altered area, are readily accessible to and usable by individuals with disabilities, unless such alterations are disproportionate to the overall alterations in terms of cost and scope.  For purposes of ensuring compliance with requirements of Texas Government Code, Chapter 469, all determinations of maximum extent feasible and disproportionality are made by the Department in accordance with the variance procedures contained in Chapter 68, Texas Administrative Code. If elements of a path of travel at a subject building or facility that have been previously constructed or altered in accordance with the April 1, 1994 Texas Accessibility Standards (TAS) they will enjoy safe harbor and are not required to be retrofitted to reflect the incremental changes in the 2012 TAS solely because of an alteration to a primary function area served by that path of travel.  Those elements would be subject to compliance with the 2012 TAS only when the elements of a path of travel are being altered.  EXCEPTION  2. If a tenant is making alterations as defined in 106.5.5 that would trigger the requirements of this section, those alterations by the tenant in areas that only the tenant occupies do not trigger a path of travel obligation upon the landlord with respect to areas of the facility under the landlord´s authority, if those areas are not otherwise being altered.`;

/**
 * Generic Inspection fallback when Type of Work is blank or unrecognized
 * (including Additions). Same 202.3/202.4 template until a distinct rule is decided.
 */
export const RAS_INSPECTION_NARRATIVE_FALLBACK = RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK;

/** New Construction Type of Work — 201.1 template. Subject to revision. */
export const RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK = `The following report identifies violations of the 2012 Texas Accessibility Standards (TAS) that must be addressed within 270 days from the date of this report.  Compliance with the Texas Accessibility Standards (TAS) is required by Texas Government Code chapter 469 (the Statute) and Chapter 121 of the Texas Human Resources Code and governed by the Administrative Rules of the Texas Department of Licensing and Regulation (the Rules).

In this report, citations of the TAS may be identified in a section that includes applicable sub-sections or references to additional sections in the TAS, Rules, or the Statute. In some cases, citations of the TAS or other codes and standards may be provided in abbreviated or restated form for clarity or brevity as a guide.  The owner, commissioned design professionals and other responsible parties should thoroughly review the referenced citations of the Texas Accessibility Standards, Rules, and Statute in their entirety. Please contact the inspector if you have any questions about the applicability of the referenced Standards.

TEXAS ACCESSIBILITY STANDARDS

201.1 Scope. All areas of newly designed and newly constructed buildings and facilities and altered portions of existing buildings and facilities shall comply with these requirements. These standards apply to fixed or built-in elements of buildings, structures, site improvements, and pedestrian routes or vehicular ways located on a site. Unless specifically stated otherwise, advisory notes and figures explain or illustrate the requirements of the standards; they do not establish enforceable requirements.  The standards for determining the appropriate or minimum numbers contained in this document are considered minimal and the Executive Director shall have the authority to make adjustments when it is determined that the standards would cause the numbers or locations to be insufficient to adequately meet the needs of people with disabilities based on the nature, use, and other circumstances of any particular building or facility.`;

function normalizeTypeOfWork(typeOfWork: string | undefined | null): string {
  return typeof typeOfWork === 'string' ? typeOfWork.trim().normalize().toLowerCase() : '';
}

/**
 * Display-only Inspection Narrative fallback from registered TABS Type of Work.
 * Does not infer from Scope of Work. Does not persist.
 */
export function getRasInspectionNarrativeFallback(
  typeOfWork?: string | null
): string {
  const normalized = normalizeTypeOfWork(typeOfWork);
  if (normalized === 'new construction') {
    return RAS_INSPECTION_NEW_CONSTRUCTION_NARRATIVE_FALLBACK;
  }
  if (normalized === 'alteration' || normalized === 'alterations') {
    return RAS_INSPECTION_ALTERATION_NARRATIVE_FALLBACK;
  }
  return RAS_INSPECTION_NARRATIVE_FALLBACK;
}
