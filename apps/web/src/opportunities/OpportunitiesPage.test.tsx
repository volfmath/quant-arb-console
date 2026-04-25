import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/auth-store';
import { OpportunitiesPage } from './OpportunitiesPage';

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().logout();
});

describe('OpportunitiesPage', () => {
  it('opens the opportunity detail panel from the table', async () => {
    useAuthStore.getState().setSession({
      token: 'token',
      expires_in: 86400,
      user: {
        id: 'user-1',
        username: 'admin',
        role: 'super_admin',
        permissions: ['opportunity:view'],
      },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/opportunities/BTC%2FUSDT%3AUSDT%3Abinance%3Aokx')) {
        return jsonResponse({
          ...opportunity,
          estimated_pnl_24h: 0.48,
          estimated_pnl_7d: 3.36,
          fee_estimate: 0.4,
          slippage_estimate: 0.2,
        });
      }

      return jsonResponse({ items: [opportunity], total: 1, page: 1, size: 20 });
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <OpportunitiesPage />
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByText('BTC'));

    expect(await screen.findByLabelText('opportunity detail')).toBeTruthy();
    expect(await screen.findByText('$0.4800')).toBeTruthy();
    expect(screen.getByText('$0.4000')).toBeTruthy();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/opportunities/BTC%2FUSDT%3AUSDT%3Abinance%3Aokx',
        expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
      );
    });
  });
});

const opportunity = {
  id: 'BTC/USDT:USDT:binance:okx',
  unified_symbol: 'BTC/USDT:USDT',
  symbol_display: 'BTC',
  long_exchange: 'binance',
  short_exchange: 'okx',
  long_funding_rate: -0.00008,
  short_funding_rate: 0.00008,
  rate_spread: 0.00016,
  spread_8h_pct: 0.016,
  estimated_pnl_8h: 0.16,
  annualized_return: 17.52,
  feasibility_score: 64,
  settlement_time: '2026-04-25T16:00:00Z',
  settlement_countdown: '02:00:00',
  discovered_at: '2026-04-25T14:00:00Z',
};

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}
