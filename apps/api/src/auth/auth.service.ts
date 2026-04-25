import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getAppConfig } from '../config/app.config';
import { getPermissionsForRole } from '../permissions/role-permissions';
import type { AuthUser, JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async login(username: string, password: string) {
    const user = this.validateDemoUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };

    return {
      token: await this.jwtService.signAsync(payload),
      expires_in: getAppConfig().jwtExpiresInSeconds,
      user,
    };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
    };
  }

  private validateDemoUser(username: string, password: string): AuthUser | null {
    const config = getAppConfig();
    if (username !== config.adminUsername || password !== config.adminPassword) {
      return null;
    }

    return {
      id: '00000000-0000-0000-0000-000000000001',
      username,
      role: 'super_admin',
      permissions: getPermissionsForRole('super_admin'),
    };
  }
}
