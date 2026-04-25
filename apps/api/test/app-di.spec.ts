import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/auth/auth.controller';

describe('AppModule dependency injection', () => {
  it('wires controllers and services under tsx runtime', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const authController = moduleRef.get(AuthController);
    const response = await authController.login({
      username: 'admin',
      password: 'change-me-admin',
    });

    expect(response.token).toBeTruthy();
    expect(response.user.role).toBe('super_admin');
  });
});
