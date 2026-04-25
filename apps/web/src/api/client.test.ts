import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTaskFromOpportunity,
  createStrategy,
  createAccount,
  createExchange,
  createRiskRule,
  createUser,
  deleteAccount,
  executeTask,
  exportPnlCsv,
  acknowledgeAlert,
  dismissAlert,
  getDashboardAssetSummary,
  getDashboardRiskSummary,
  getDashboardStrategySummary,
  getOpportunityAudit,
  getOpportunityDetail,
  getOpportunitySummary,
  getOpportunities,
  getPnlByExchange,
  getPnlByStrategy,
  getPnlDetails,
  getPnlSummary,
  getPnlTrend,
  getAccounts,
  getAuditLogs,
  getExchanges,
  getRiskAccounts,
  getRiskOverview,
  getRiskRules,
  getSystemStatus,
  getUsers,
  getStrategies,
  getTaskOrders,
  getTaskPositions,
  getAlerts,
  getTasks,
  login,
  pauseTask,
  resumeTask,
  resolveAlert,
  scanOpportunities,
  stopTask,
  toggleRiskRule,
  toggleStrategy,
  triggerCircuitBreak,
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

  it('serializes opportunity filters and scan requests', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 1 }),
    } as Response);

    await getOpportunities('abc', {
      symbol: 'BTC',
      minSpread: 0.0001,
      sortBy: 'score',
      sortDirection: 'desc',
      page: 1,
      size: 1,
    });
    await scanOpportunities('abc', { symbol: 'ETHUSDT', page: 1, size: 1 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/opportunities?symbol=BTC&min_spread=0.0001&sort_by=score&sort_direction=desc&page=1&size=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer abc' },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/opportunities/scan?symbol=ETHUSDT&page=1&size=1',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer abc' },
      }),
    );
  });

  it('loads opportunity scan audit records', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 2, size: 5 }),
    } as Response);

    await getOpportunityAudit('abc', 2, 5);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/opportunities/audit?page=2&size=5',
      expect.objectContaining({
        headers: { Authorization: 'Bearer abc' },
      }),
    );
  });

  it('loads opportunity detail with an encoded opportunity id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'BTC/USDT:USDT:binance:okx' }),
    } as Response);

    await getOpportunityDetail('abc', 'BTC/USDT:USDT:binance:okx');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/opportunities/BTC%2FUSDT%3AUSDT%3Abinance%3Aokx',
      expect.objectContaining({
        headers: { Authorization: 'Bearer abc' },
      }),
    );
  });

  it('loads opportunity summary with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ total_count: 3 }),
    } as Response);

    await getOpportunitySummary('abc');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/opportunities/summary',
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
    }, {
      leverage: 4,
      targetPositionSize: 500,
    });
    await executeTask('abc', 'task-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/tasks',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"leverage":4'),
      }),
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

  it('mutates task lifecycle status with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-1', status: 'paused' }),
    } as Response);

    await pauseTask('abc', 'task-1');
    await resumeTask('abc', 'task-1');
    await stopTask('abc', 'task-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/tasks/task-1/pause',
      expect.objectContaining({ method: 'PUT', headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3000/api/v1/tasks/task-1/resume',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/tasks/task-1/stop',
      expect.objectContaining({ method: 'PUT' }),
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
    await resolveAlert('abc', 'alert-1');
    await dismissAlert('abc', 'alert-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/alerts',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/alerts/alert-1/resolve',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/alerts/alert-1/dismiss',
      expect.objectContaining({ method: 'PUT' }),
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
      text: async () => 'task_id,net_pnl\n',
    } as Response);

    await getPnlSummary('abc');
    await getPnlTrend('abc');
    await getPnlDetails('abc');
    await getPnlByStrategy('abc');
    await getPnlByExchange('abc');
    await exportPnlCsv('abc');

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
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/analytics/pnl/by-strategy',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://localhost:3000/api/v1/analytics/pnl/export',
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

  it('loads and mutates risk resources with bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, size: 0 }),
    } as Response);

    await getRiskOverview('abc');
    await getRiskRules('abc');
    await createRiskRule('abc', {
      name: 'max leverage',
      metric: 'leverage',
      operator: '<=',
      threshold: 3,
      severity: 'high',
    });
    await toggleRiskRule('abc', 'rule-1');
    await getRiskAccounts('abc');
    await triggerCircuitBreak('abc', 'test');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3000/api/v1/risk/overview',
      expect.objectContaining({ headers: { Authorization: 'Bearer abc' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3000/api/v1/risk/rules',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3000/api/v1/risk/rules/rule-1/toggle',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://localhost:3000/api/v1/risk/circuit-break',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
