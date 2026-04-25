import type { UserRole } from '../permissions/role-permissions';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
  permissions: string[];
};

export type JwtPayload = {
  sub: string;
  username: string;
  role: UserRole;
  permissions: string[];
};

