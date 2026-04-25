import { describe, expect, it } from 'vitest';
import { getPermissionsForRole, roleHasPermission } from '../src/permissions/role-permissions';

describe('role permissions', () => {
  it('keeps viewer read-only for MVP analytics and opportunities', () => {
    expect(roleHasPermission('viewer', 'dashboard:view')).toBe(true);
    expect(roleHasPermission('viewer', 'opportunity:view')).toBe(true);
    expect(roleHasPermission('viewer', 'task:create')).toBe(false);
    expect(roleHasPermission('viewer', 'exchange:manage')).toBe(false);
  });

  it('allows risk managers to handle risk but not edit strategies', () => {
    expect(roleHasPermission('risk_manager', 'risk:edit_rule')).toBe(true);
    expect(roleHasPermission('risk_manager', 'alert:acknowledge')).toBe(true);
    expect(roleHasPermission('risk_manager', 'strategy:edit')).toBe(false);
  });

  it('gives super admin every defined permission', () => {
    const permissions = getPermissionsForRole('super_admin');

    expect(permissions).toContain('settings:manage');
    expect(permissions).toContain('task:create');
    expect(permissions).toContain('risk:circuit_break');
  });
});

