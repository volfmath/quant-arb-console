import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION_METADATA = 'required_permission';

export function RequirePermission(permission: string) {
  return SetMetadata(REQUIRED_PERMISSION_METADATA, permission);
}

