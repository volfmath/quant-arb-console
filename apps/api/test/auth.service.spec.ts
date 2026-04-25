import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth/auth.service';

describe('AuthService', () => {
  it('signs and verifies the demo admin user', async () => {
    const auth = new AuthService(new JwtService({ secret: 'test-secret' }));

    const response = await auth.login('admin', 'change-me-admin');
    const user = await auth.verifyToken(response.token);

    expect(user.username).toBe('admin');
    expect(user.role).toBe('super_admin');
    expect(user.permissions).toContain('dashboard:view');
    expect(user.permissions).toContain('exchange:manage');
  });

  it('rejects invalid credentials', async () => {
    const auth = new AuthService(new JwtService({ secret: 'test-secret' }));

    await expect(auth.login('admin', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

