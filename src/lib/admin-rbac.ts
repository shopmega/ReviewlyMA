export type AdminAccessLevel =
  | 'super_admin'
  | 'admin_ops'
  | 'moderator'
  | 'analyst'
  | 'support';

export type AdminPermission =
  | 'admin.panel.access'
  | 'settings.write'
  | 'settings.maintenance.toggle'
  | 'user.role.manage'
  | 'user.suspend'
  | 'user.delete'
  | 'business.delete'
  | 'moderation.review.bulk'
  | 'moderation.business.bulk'
  | 'moderation.report.bulk'
  | 'moderation.claim.bulk';

export type AdminAccessProfile = {
  role?: string | null;
  admin_access_level?: string | null;
  admin_permissions?: string[] | null;
};

const ALL_ADMIN_PERMISSIONS: ReadonlySet<AdminPermission> = new Set([
  'admin.panel.access',
  'settings.write',
  'settings.maintenance.toggle',
  'user.role.manage',
  'user.suspend',
  'user.delete',
  'business.delete',
  'moderation.review.bulk',
  'moderation.business.bulk',
  'moderation.report.bulk',
  'moderation.claim.bulk',
]);

const ADMIN_ROLE_PERMISSIONS: Record<AdminAccessLevel, ReadonlySet<AdminPermission>> = {
  super_admin: ALL_ADMIN_PERMISSIONS,
  admin_ops: new Set([
    'admin.panel.access',
    'settings.write',
    'settings.maintenance.toggle',
    'user.suspend',
    'business.delete',
    'moderation.review.bulk',
    'moderation.business.bulk',
    'moderation.report.bulk',
    'moderation.claim.bulk',
  ]),
  moderator: new Set([
    'admin.panel.access',
    'moderation.review.bulk',
    'moderation.report.bulk',
    'moderation.claim.bulk',
  ]),
  analyst: new Set([
    'admin.panel.access',
  ]),
  support: new Set([
    'admin.panel.access',
    'user.suspend',
    'moderation.report.bulk',
  ]),
};

export function normalizeAdminAccessLevel(value?: string | null): AdminAccessLevel {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized === 'super_admin'
    || normalized === 'admin_ops'
    || normalized === 'moderator'
    || normalized === 'analyst'
    || normalized === 'support'
  ) {
    return normalized;
  }

  // Backward compatible fallback for existing admin records.
  return 'super_admin';
}

export function resolveAdminPermissions(profile: AdminAccessProfile): Set<string> {
  const permissions = new Set<string>();

  if (String(profile.role || '').toLowerCase() !== 'admin') {
    return permissions;
  }

  const level = normalizeAdminAccessLevel(profile.admin_access_level);
  for (const permission of ADMIN_ROLE_PERMISSIONS[level]) {
    permissions.add(permission);
  }

  for (const permission of profile.admin_permissions || []) {
    const value = String(permission || '').trim();
    if (!value) continue;
    permissions.add(value);
  }

  return permissions;
}

export function hasAdminPermission(profile: AdminAccessProfile, permission: AdminPermission): boolean {
  if (String(profile.role || '').toLowerCase() !== 'admin') {
    return false;
  }

  const permissions = resolveAdminPermissions(profile);
  return permissions.has('*') || permissions.has(permission);
}
