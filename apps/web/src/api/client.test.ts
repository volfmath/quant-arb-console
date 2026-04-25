import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOpportunities, login } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('posts credentials to login endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'token',
        expires_in: 86400,
        user: { id: 'user-1', username: 'admin', role: 'super_admin', permissions: [] },
      }),
    } as Response);

    const response = await login('admin', 'password');

    expect(response.token).toBe('token');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends bearer token for opportunities endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getOpportunities('abc');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/opportunities',
      expect.objectContaining({
        headers: { Authorization: 'Bearer abc' },
      }),
    );
  });
});

