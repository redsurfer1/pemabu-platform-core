/**
 * Client- and middleware-safe auth types (no @prisma/client).
 * Import from here in 'use client' trees to avoid bundling Prisma.
 */

export type TrustRole = 'PUBLIC' | 'USER' | 'ADVISOR' | 'ADMIN';

/** Map legacy Prisma/localStorage values (AUDITOR, LLC_MEMBER) to client TrustRole. */
export function normalizeTrustRole(value: unknown): TrustRole {
  if (typeof value !== 'string') return 'PUBLIC';
  switch (value) {
    case 'PUBLIC':
    case 'USER':
    case 'ADVISOR':
    case 'ADMIN':
      return value;
    case 'AUDITOR':
      return 'ADVISOR';
    case 'LLC_MEMBER':
      return 'USER';
    default:
      return 'PUBLIC';
  }
}

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  trustRole: TrustRole;
  role: string;
}

const TRUST_CENTER_ROLES: TrustRole[] = ['ADVISOR', 'USER', 'ADMIN'];
const CONTROL_ROLES: TrustRole[] = ['USER', 'ADMIN'];

export function hasTrustCenterAccess(trustRole: TrustRole | null | undefined): boolean {
  if (!trustRole) return false;
  return TRUST_CENTER_ROLES.includes(trustRole);
}

export function canModifyControls(trustRole: TrustRole | null | undefined): boolean {
  if (!trustRole) return false;
  return CONTROL_ROLES.includes(trustRole);
}

/** @deprecated Use isAdvisor */
export function isAuditor(trustRole: TrustRole | null | undefined): boolean {
  return trustRole === 'ADVISOR';
}

export function isAdvisor(trustRole: TrustRole | null | undefined): boolean {
  return trustRole === 'ADVISOR';
}

export function isAdmin(trustRole: TrustRole | null | undefined): boolean {
  return trustRole === 'ADMIN';
}

export function getTrustRoleLabel(trustRole: TrustRole): string {
  const labels: Record<TrustRole, string> = {
    PUBLIC: 'Public User',
    USER: 'Member',
    ADVISOR: 'Advisor (Read-Only)',
    ADMIN: 'Administrator',
  };
  return labels[trustRole] || 'Unknown';
}

export function getTrustRolePermissions(trustRole: TrustRole): {
  canViewTrustCenter: boolean;
  canViewAuditEvidence: boolean;
  canReviewEvidence: boolean;
  canTriggerControls: boolean;
  canManualRelease: boolean;
  canAccessJIT: boolean;
} {
  switch (trustRole) {
    case 'PUBLIC':
      return {
        canViewTrustCenter: false,
        canViewAuditEvidence: false,
        canReviewEvidence: false,
        canTriggerControls: false,
        canManualRelease: false,
        canAccessJIT: false,
      };

    case 'ADVISOR':
      return {
        canViewTrustCenter: true,
        canViewAuditEvidence: true,
        canReviewEvidence: true,
        canTriggerControls: false,
        canManualRelease: false,
        canAccessJIT: false,
      };

    case 'USER':
      return {
        canViewTrustCenter: true,
        canViewAuditEvidence: true,
        canReviewEvidence: true,
        canTriggerControls: false,
        canManualRelease: false,
        canAccessJIT: false,
      };

    case 'ADMIN':
      return {
        canViewTrustCenter: true,
        canViewAuditEvidence: true,
        canReviewEvidence: true,
        canTriggerControls: true,
        canManualRelease: true,
        canAccessJIT: true,
      };
  }
}
