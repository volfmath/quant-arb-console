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
    const canActivate = guard.canActivate({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: [] } }),
      }),
    } as never);

    expect(canActivate).toBe(true);
  });
});
