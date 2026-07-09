/**
 * Mock-only TDLR role → FREDA stakeholder typical-role mapping for prototype search.
 * Not production matching logic.
 */

import type { TypicalStakeholderRole } from '../types';

/** Map TABS #tblContacts Contact Type to likely FREDA stakeholder typical roles. */
export function tdlrContactTypeToTypicalRoles(
  contactType: string
): TypicalStakeholderRole[] | null {
  const normalized = contactType.trim().toLowerCase();

  if (normalized.includes('building or facility owner') || normalized === 'owner') {
    return ['Owner'];
  }
  if (normalized.includes('design firm') || normalized.includes('design professional')) {
    return ['Design Professional'];
  }
  if (
    normalized.includes('owners designated agent') ||
    normalized.includes('owner agent') ||
    normalized.includes('owner\'s designated agent')
  ) {
    return ['Owner Agent'];
  }
  if (
    normalized.includes('registered accessibility specialist') ||
    normalized === 'ras'
  ) {
    return ['RAS'];
  }
  if (normalized.includes('tenant')) {
    return ['Tenant'];
  }
  if (normalized.includes('registrant contact')) {
    return ['Client', 'Contact Person'];
  }
  if (normalized.includes('client')) {
    return ['Client'];
  }
  if (normalized.includes('contact person')) {
    return ['Contact Person'];
  }

  // Unknown / other TDLR role — no default filter (show all when filtering is on).
  return null;
}

export function stakeholderMatchesTypicalRoles(
  typicalRoles: TypicalStakeholderRole[] | undefined,
  targetRoles: TypicalStakeholderRole[]
): boolean {
  if (!typicalRoles?.length || !targetRoles.length) return false;
  return typicalRoles.some((role) => targetRoles.includes(role));
}

export function formatTypicalRolesLabel(roles: TypicalStakeholderRole[] | undefined): string {
  if (!roles?.length) return 'Typical role not set';
  return roles.join(', ');
}
