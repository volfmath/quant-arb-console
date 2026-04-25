import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { PermissionGuard } from '../src/permissions/permission.guard';

describe('PermissionGuard', () => {
  it('receives Reflector through Nest dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [Reflector, PermissionGuard],
    }).compile();

    const guard = moduleRef.get(PermissionGuard);
    const canActivate = await guard.canActivate({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: [] } }),
      }),
    } as never);

    expect(canActivate).toBe(true);
  });

  it('can hydrate the request user before checking global permissions', async () => {
    class TestController {}
    function handler() {}

    Reflect.defineMetadata('required_permission', 'analytics:view', handler);

    const reflector = new Reflector();
    const guard = new PermissionGuard(reflector, {
      verifyToken: async () => ({
        id: 'user-1',
        username: 'admin',
        role: 'super_admin',
        permissions: ['analytics:view'],
      }),
    } as never);
    const request = {
      headers: { authorization: 'Bearer token' },
    };

    const canActivate = await guard.canActivate({
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never);

    expect(canActivate).toBe(true);
    expect(request).toHaveProperty('user.username', 'admin');
  });
});
