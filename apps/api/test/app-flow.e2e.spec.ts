import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

describe('Core API flow', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs the authenticated mock trading and operations flow over HTTP', async () => {
    const login = await post('/auth/login', {
      username: 'admin',
      password: 'change-me-admin',
    });
    token = login.token;

    expect(token).toBeTruthy();
    expect(login.user.permissions).toContain('task:create');
    expect(login.user.permissions).toContain('risk:circuit_break');

    const opportunities = await get('/opportunities');
    expect(opportunities.total).toBeGreaterThan(0);

    const opportunity = opportunities.items[0];
    const task = await post('/tasks', {
      opportunity_id: opportunity.id,
      unified_symbol: opportunity.unified_symbol,
      long_exchange: opportunity.long_exchange,
      short_exchange: opportunity.short_exchange,
      long_account_id: 'binance-mock-account',
      short_account_id: 'okx-mock-account',
      leverage: 3,
      target_position_size: 200,
    });
    const executed = await post(`/tasks/${task.id}/execute`);
    const orders = await get(`/tasks/${task.id}/orders`);
    const positions = await get(`/tasks/${task.id}/positions`);
    const pnl = await get('/analytics/pnl/summary');
    const pnlByStrategy = await get('/analytics/pnl/by-strategy');
    const pnlByExchange = await get('/analytics/pnl/by-exchange');
    const pnlExport = await getText('/analytics/pnl/export');
    const pausedTask = await put(`/tasks/${task.id}/pause`);
    const resumedTask = await put(`/tasks/${task.id}/resume`);
    const stoppedTask = await put(`/tasks/${task.id}/stop`);

    expect(executed.status).toBe('running');
    expect(orders.total).toBe(2);
    expect(positions.total).toBe(2);
    expect(pnl.net_pnl).toBe(0.16);
    expect(pnlByStrategy.total).toBe(1);
    expect(pnlByExchange.total).toBe(2);
    expect(pnlExport).toContain('task_id,task_number,unified_symbol');
    expect(pausedTask.status).toBe('paused');
    expect(resumedTask.status).toBe('running');
    expect(stoppedTask.status).toBe('canceled');

    const strategy = await post('/strategies', {
      name: '资金费套利_HTTP',
      symbol: 'HTTP/USDT:USDT',
      min_spread_pct: 0.03,
      max_position_size: 300,
      leverage: 2,
    });
    const updatedStrategy = await put(`/strategies/${strategy.id}`, { leverage: 3 });
    const toggledStrategy = await put(`/strategies/${strategy.id}/toggle`);

    expect(updatedStrategy.leverage).toBe(3);
    expect(toggledStrategy.status).toBe('running');

    const exchange = await post('/exchanges', { name: 'HTTP Mock', code: 'httpmock', is_testnet: true });
    const account = await post('/accounts', {
      exchange_code: exchange.code,
      name: 'httpmock-test-account',
      is_testnet: true,
    });
    const user = await post('/users', { username: 'http-viewer', role: 'viewer' });
    const reassignedUser = await put(`/users/${user.id}/role`, { role: 'trader' });
    const deletedAccount = await deleteRequest(`/accounts/${account.id}`);
    const systemStatus = await get('/system/status');

    expect(reassignedUser.role).toBe('trader');
    expect(deletedAccount.status).toBe('deleted');
    expect(systemStatus.exchange_mode).toBe('mock');

    const riskRule = await post('/risk/rules', {
      name: 'HTTP max position',
      metric: 'position_size',
      operator: '<=',
      threshold: 1000,
      severity: 'high',
    });
    const toggledRule = await put(`/risk/rules/${riskRule.id}/toggle`);
    const riskAccounts = await get('/risk/accounts');
    const circuitBreak = await post('/risk/circuit-break', { reason: 'http flow test', scope: 'all' });
    const riskOverview = await get('/risk/overview');
    const alerts = await get('/alerts');
    const resolvedAlert = await put(`/alerts/${alerts.items[0].id}/resolve`);
    const auditLogs = await get('/audit-logs');

    expect(toggledRule.enabled).toBe(false);
    expect(riskAccounts.total).toBe(2);
    expect(circuitBreak.enabled).toBe(true);
    expect(riskOverview.risk_level).toBe('critical');
    expect(alerts.items[0]).toMatchObject({ source: 'risk_engine', severity: 'critical' });
    expect(resolvedAlert.status).toBe('resolved');
    expect(auditLogs.total).toBeGreaterThan(0);
  });

  async function get(path: string) {
    return request(path, { method: 'GET' });
  }

  async function getText(path: string) {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok, `GET ${path} failed with ${response.status}`).toBe(true);
    return response.text();
  }

  async function post(path: string, body?: unknown) {
    return request(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function put(path: string, body?: unknown) {
    return request(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async function deleteRequest(path: string) {
    return request(path, { method: 'DELETE' });
  }

  async function request(path: string, init: RequestInit) {
    const response = await fetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });

    expect(response.ok, `${init.method} ${path} failed with ${response.status}`).toBe(true);
    return response.json();
  }
});
