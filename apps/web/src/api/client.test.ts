import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTaskFromOpportunity,
  createStrategy,
  createAccount,
  createExchange,
  createUser,
  deleteAccount,
  executeTask,
  acknowledgeAlert,
  dismissAlert,
  getDashboardAssetSummary,
  getDashboardRiskSummary,
  getDashboardStrategySummary,
  getOpportunities,
  getPnlDetails,
  getPnlSummary,
  getPnlTrend,
  getAccounts,
  getAuditLogs,
  getExchanges,
  getSystemStatus,
  getUsers,
  getStrategies,
  getTaskOrders,
  getTaskPositions,
  getAlerts,
  getTasks,
  login,
  toggleStrategy,
  updateStrategy,
  updateUserRole,
} from './client';

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

  it('sends bearer token for tasks endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getTasks('task-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/tasks',
      expect.objectContaining({
        headers: { Authorization: 'Bearer task-token' },
      }),
    );
  });

  it('creates and executes tasks with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'task-1',
        task_number: 1,
        status: 'running',
      }),
    } as Response);

    await createTaskFromOpportunity('abc', {
      id: 'opp-1',
      unified_symbol: 'BTC/USDT:USDT',
      symbol_display: 'BTC',
      long_exchange: 'binance',
      short_exchange: 'okx',
      long_funding_rate: -0.0001,
      short_funding_rate: 0.0001,
      rate_spread: 0.0002,
      spread_8h_pct: 0.02,
      estimated_pnl_8h: 0.2,
      annualized_return: 21.9,
      feasibility_score: 80,
      settlement_time: '2026-04-25T16:00:00Z',
      settlement_countdown: '02:00:00',
      discovered_at: '2026-04-25T14:00:00Z',
    });
    await executeTask('abc', 'task-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/tasks',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/tasks/task-1/execute',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('loads task orders and positions with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    } as Response);

    await getTaskOrders('abc', 'task-1');
    await getTaskPositions('abc', 'task-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/tasks/task-1/orders',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/tasks/task-1/positions',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
  });

  it('loads dashboard summaries with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    await getDashboardAssetSummary('abc');
    await getDashboardStrategySummary('abc');
    await getDashboardRiskSummary('abc');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/dashboard/asset-summary',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/dashboard/risk-summary',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
  });

  it('loads and updates alerts with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getAlerts('abc');
    await acknowledgeAlert('abc', 'alert-1');
    await dismissAlert('abc', 'alert-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/alerts',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/alerts/alert-1/acknowledge',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('loads pnl analytics with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, points: [] }),
    } as Response);

    await getPnlSummary('abc');
    await getPnlTrend('abc');
    await getPnlDetails('abc');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/analytics/pnl/summary',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/analytics/pnl/trend',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/analytics/pnl/details',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
  });

  it('loads and mutates strategies with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getStrategies('abc');
    await createStrategy('abc', { name: 'strategy', symbol: 'BTC/USDT:USDT' });
    await updateStrategy('abc', 'strategy-1', { leverage: 4 });
    await toggleStrategy('abc', 'strategy-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/strategies',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/strategies',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/strategies/strategy-1',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/strategies/strategy-1/toggle',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('loads and mutates settings resources with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getExchanges('abc');
    await createExchange('abc', { name: 'Bybit Mock', code: 'bybit' });
    await getAccounts('abc');
    await createAccount('abc', { exchange_code: 'bybit', name: 'bybit-test' });
    await deleteAccount('abc', 'account-1');
    await getUsers('abc');
    await createUser('abc', { username: 'viewer-1', role: 'viewer' });
    await updateUserRole('abc', 'user-1', 'trader');
    await getAuditLogs('abc');
    await getSystemStatus('abc');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/exchanges',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/exchanges',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'http://localhost:3000/api/v1/accounts/account-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      'http://localhost:3000/api/v1/users/user-1/role',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      'http://localhost:3000/api/v1/system/status',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
  });
});
