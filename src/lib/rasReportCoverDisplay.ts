/**
 * RAS cover display strings (Slice B).
 * Formats adapter view-model values for the OCG RAS cover. No JSX.
 */

import type { ReportViewModel } from './reportAdapter';
import type { ReportProfile } from './reportProfile';
import { coverAddressPairRow, formatCityStateZip } from './coverAddressDisplay';
import { getReportCoverHeroIdentity } from './reportPreviewShared';

export { formatCityStateZip } from './coverAddressDisplay';

export function usesRasCover(profile: ReportProfile): boolean {
  return profile === 'plan_review' || profile === 'inspection';
}

export function formatRasProfessionalLine(name: string, rasNumber: string): string {
  const n = name.trim();
  const num = rasNumber.trim();
  if (n && num) return `${n}, RAS #${num}`;
  if (n) return n;
  if (num) return `RAS #${num}`;
  return '';
}

export function formatTenantFundsProvided(value: boolean | null | undefined): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '';
}

/** Match Assessment cover date style (UTC month day, year). Blank when missing — not TBD. */
export function formatRasCoverDate(dateStr: string): string {
  const raw = dateStr.trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  let year = date.getUTCFullYear();
  if (year < 100) year += 2000;
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate();
  return `${month} ${day}, ${year}`;
}

export type RasCoverLabeledValue = {
  label: string;
  value: string;
};

export type RasCoverPairRow = {
  kind: 'pair';
  left: RasCoverLabeledValue;
  right: RasCoverLabeledValue;
};

export type RasCoverSpanRow = {
  kind: 'span';
  label: string;
  value: string;
  wrap?: boolean;
};

export type RasCoverLayoutRow = RasCoverPairRow | RasCoverSpanRow;

export type RasCoverLayoutModel = {
  ocgInformation: RasCoverPairRow[];
  projectInformation: RasCoverLayoutRow[];
  ownerInformation: RasCoverLayoutRow[];
};

export type RasCoverDisplayModel = {
  title: string;
  standardsLine: string;
  heroProjectName: string;
  rasNameLine: string;
  designFirmName: string;
  dateLabel: string;
  dateValue: string;
  typeOfWork: string;
  ocgProjectNumber: string;
  tabsProjectNumber: string;
  projectName: string;
  facilityName: string;
  projectAddress: string;
  cityStateZip: string;
  projectDescription: string;
  tenantFundsProvided: string;
  ownerName: string;
  ownerAddress: string;
  ownerCity: string;
  ownerState: string;
  ownerZip: string;
  ownerCityStateZip: string;
  ownerContactName: string;
  /** RAS cover omits the shared page-footer identity; both names already appear in cover data. */
  footerIdentityText: string;
};

export function buildRasCoverDisplayModel(viewModel: ReportViewModel): RasCoverDisplayModel | null {
  const ras = viewModel.ras;
  if (!ras) return null;
  const cover = ras.cover;
  return {
    title: cover.header.title,
    standardsLine: cover.header.standardsLine,
    heroProjectName: getReportCoverHeroIdentity(viewModel.profile, {
      fldProjName: cover.projectInformation.projectName,
    }),
    rasNameLine: formatRasProfessionalLine(
      cover.ocgInformation.professionalName,
      cover.ocgInformation.rasNumber
    ),
    designFirmName: cover.ocgInformation.designFirmName,
    dateLabel: `${cover.ocgInformation.dateLabel}:`,
    dateValue: formatRasCoverDate(cover.ocgInformation.date),
    typeOfWork: cover.ocgInformation.typeOfWork,
    ocgProjectNumber: cover.ocgInformation.ocgProjectNumber,
    tabsProjectNumber: cover.ocgInformation.tabsProjectNumber,
    projectName: cover.projectInformation.projectName,
    facilityName: cover.projectInformation.facilityName,
    projectAddress: cover.projectInformation.address,
    cityStateZip: formatCityStateZip(
      cover.projectInformation.city,
      cover.projectInformation.state,
      cover.projectInformation.zip
    ),
    projectDescription: cover.projectInformation.projectDescription,
    tenantFundsProvided: formatTenantFundsProvided(cover.projectInformation.tenantFunded),
    ownerName: cover.ownerInformation.name,
    ownerAddress: cover.ownerInformation.address,
    ownerCity: cover.ownerInformation.city,
    ownerState: cover.ownerInformation.state,
    ownerZip: cover.ownerInformation.zip,
    ownerCityStateZip: formatCityStateZip(
      cover.ownerInformation.city,
      cover.ownerInformation.state,
      cover.ownerInformation.zip
    ),
    ownerContactName: cover.ownerInformation.contactName,
    footerIdentityText: rasCoverFooterIdentityText(),
  };
}

/** RAS cover does not repeat Project/Facility identity in the shared page footer. */
export function rasCoverFooterIdentityText(): string {
  return '';
}

/** OCG stays paired; Project/Owner Address shares a pair row with City/State/ZIP. */
export function buildRasCoverLayout(display: RasCoverDisplayModel): RasCoverLayoutModel {
  const ownerRows: RasCoverLayoutRow[] = [
    { kind: 'span', label: 'Name:', value: display.ownerName },
    coverAddressPairRow('Address:', display.ownerAddress, display.ownerCityStateZip),
  ];
  if (display.ownerContactName) {
    ownerRows.push({ kind: 'span', label: 'Contact:', value: display.ownerContactName });
  }

  return {
    ocgInformation: [
      {
        kind: 'pair',
        left: { label: 'RAS Name / #:', value: display.rasNameLine },
        right: { label: 'Design Firm:', value: display.designFirmName },
      },
      {
        kind: 'pair',
        left: { label: display.dateLabel, value: display.dateValue },
        right: { label: 'Type of Work:', value: display.typeOfWork },
      },
      {
        kind: 'pair',
        left: { label: 'OCG Project #:', value: display.ocgProjectNumber },
        right: { label: 'TABS #:', value: display.tabsProjectNumber },
      },
    ],
    projectInformation: [
      { kind: 'span', label: 'Project Name:', value: display.projectName },
      { kind: 'span', label: 'Facility Name:', value: display.facilityName },
      coverAddressPairRow('Project Address:', display.projectAddress, display.cityStateZip),
      { kind: 'span', label: 'Project Description:', value: display.projectDescription, wrap: true },
      { kind: 'span', label: 'Tenant Funds:', value: display.tenantFundsProvided },
    ],
    ownerInformation: ownerRows,
  };
}
