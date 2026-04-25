export type UserRole = 'super_admin' | 'trader' | 'risk_manager' | 'viewer';

const allPermissions = [
  'dashboard:view',
  'opportunity:view',
  'opportunity:view_detail',
  'task:view',
  'task:create',
  'task:pause',
  'task:stop',
  'order:view',
  'order:close_position',
  'position:view',
  'strategy:view',
  'strategy:edit',
  'strategy:toggle',
  'risk:view',
  'risk:edit_rule',
  'risk:circuit_break',
  'alert:view',
  'alert:acknowledge',
  'alert:dismiss',
  'analytics:view',
  'analytics:export',
  'exchange:manage',
  'account:manage',
  'user:manage',
  'user:assign_role',
  'audit:view',
  'settings:manage',
];

const rolePermissions: Record<UserRole, string[]> = {
  super_admin: allPermissions,
  trader: [
    'dashboard:view',
    'opportunity:view',
    'opportunity:view_detail',
    'task:view',
    'task:create',
    'task:pause',
    'task:stop',
    'order:view',
    'order:close_position',
    'position:view',
    'strategy:view',
    'strategy:edit',
    'strategy:toggle',
    'alert:view',
    'analytics:view',
    'analytics:export',
  ],
  risk_manager: [
    'dashboard:view',
    'opportunity:view',
    'opportunity:view_detail',
    'task:view',
    'task:pause',
    'task:stop',
    'order:view',
    'order:close_position',
    'position:view',
    'risk:view',
    'risk:edit_rule',
    'risk:circuit_break',
    'alert:view',
    'alert:acknowledge',
    'alert:dismiss',
    'analytics:view',
    'analytics:export',
  ],
  viewer: [
    'dashboard:view',
    'opportunity:view',
    'opportunity:view_detail',
    'analytics:view',
  ],
};

export function getPermissionsForRole(role: UserRole): string[] {
  return [...rolePermissions[role]];
}

export function roleHasPermission(role: UserRole, permission: string): boolean {
  return rolePermissions[role].includes(permission);
}

