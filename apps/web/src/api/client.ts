import type { AuthUser } from '../auth/auth-store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export type LoginResponse = {
  token: string;
  expires_in: number;
  user: AuthUser;
};

export type Opportunity = {
  id: string;
  unified_symbol: string;
  symbol_display: string;
  long_exchange: string;
  short_exchange: string;
  long_funding_rate: number;
  short_funding_rate: number;
  rate_spread: number;
  spread_8h_pct: number;
  estimated_pnl_8h: number;
  annualized_return: number;
  feasibility_score: number;
  settlement_time: string;
  settlement_countdown: string;
  discovered_at: string;
};

export type OpportunityListResponse = {
  items: Opportunity[];
  total: number;
  page: number;
  size: number;
};

export type ArbitrageTask = {
  id: string;
  task_number: number;
  status: 'pending' | 'confirming' | 'running' | 'paused' | 'canceled' | 'failed';
  unified_symbol: string;
  long_exchange: string;
  short_exchange: string;
  leverage: number;
  target_position_size: number;
  actual_position_size: number;
  margin_used: number;
  long_qty: number;
  short_qty: number;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  created_at: string;
  started_at?: string;
};

export type TaskListResponse = {
  items: ArbitrageTask[];
  total: number;
  page: number;
  size: number;
};

export type TaskOrder = {
  id: string;
  task_id: string;
  exchange: string;
  unified_symbol: string;
  side: 'buy' | 'sell';
  position_side: 'long' | 'short';
  order_type: 'market';
  qty: number;
  avg_fill_price: number;
  status: 'filled';
  leg: 'long' | 'short';
  is_close: boolean;
  filled_at: string;
};

export type TaskPosition = {
  id: string;
  task_id: string;
  exchange: string;
  unified_symbol: string;
  side: 'long' | 'short';
  qty: number;
  avg_entry_price: number;
  leverage: number;
  margin: number;
  unrealized_pnl: number;
  is_open: boolean;
  opened_at: string;
};

export type TaskRelationsResponse<T> = {
  items: T[];
  total: number;
};

export type AssetSummary = {
  total_equity: number;
  today_pnl: number;
  available_balance: number;
  available_pct: number;
};

export type StrategySummary = {
  active_strategies: number;
  total_strategies: number;
  active_tasks: number;
  total_tasks: number;
};

export type RiskSummary = {
  risk_level: 'low' | 'medium' | 'high';
  risk_exposure: number;
  leverage_usage_pct: number;
  active_alerts: number;
};

export type AlertRecord = {
  id: string;
  source: 'risk_engine' | 'execution_engine' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  created_at: string;
};

export type AlertListResponse = {
  items: AlertRecord[];
  total: number;
  page: number;
  size: number;
};

export type PnlSummary = {
  total_pnl: number;
  realized_pnl: number;
  unrealized_pnl: number;
  funding_income: number;
  fee_cost: number;
  net_pnl: number;
};

export type PnlTrendPoint = {
  time: string;
  total: number;
  funding: number;
  fee: number;
};

export type PnlTrendResponse = {
  points: PnlTrendPoint[];
};

export type PnlDetail = {
  task_id: string;
  task_number: number;
  unified_symbol: string;
  long_exchange: string;
  short_exchange: string;
  realized_pnl: number;
  unrealized_pnl: number;
  funding_income: number;
  fee_cost: number;
  net_pnl: number;
  snapshot_at: string;
};

export type PnlDetailsResponse = {
  items: PnlDetail[];
  total: number;
};

export type PnlByStrategy = {
  strategy_id: string;
  tasks: number;
  funding_income: number;
  fee_cost: number;
  net_pnl: number;
};

export type PnlByExchange = {
  exchange: string;
  legs: number;
  funding_income: number;
  fee_cost: number;
  net_pnl: number;
};

export type StrategyRecord = {
  id: string;
  name: string;
  type: 'funding_rate_arb';
  status: 'draft' | 'running' | 'paused' | 'stopped';
  symbol: string;
  min_spread_pct: number;
  max_position_size: number;
  leverage: number;
  running_duration: string;
  today_pnl: number;
  total_pnl: number;
  return_rate: number;
  win_rate: number;
  max_drawdown: number;
  active_tasks: number;
  total_tasks: number;
  created_at: string;
  updated_at: string;
};

export type StrategyListResponse = {
  items: StrategyRecord[];
  total: number;
  page: number;
  size: number;
};

export type CreateStrategyRequest = {
  name?: string;
  symbol?: string;
  min_spread_pct?: number;
  max_position_size?: number;
  leverage?: number;
};

export type ExchangeRecord = {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'disabled';
  is_testnet: boolean;
  created_at: string;
};

export type AccountRecord = {
  id: string;
  exchange_code: string;
  name: string;
  status: 'active' | 'disabled' | 'deleted';
  is_testnet: boolean;
  created_at: string;
  deleted_at?: string;
};

export type UserRecord = {
  id: string;
  username: string;
  role: 'super_admin' | 'trader' | 'risk_manager' | 'viewer';
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
};

export type AuditLogRecord = {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  createdAt: string;
};

export type SystemStatus = {
  api_connection: string;
  trading_service: string;
  strategy_service: string;
  exchange_mode: string;
  version: string;
  updated_at: string;
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

export type RiskOverview = {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_exposure: number;
  leverage_usage_pct: number;
  active_rules: number;
  circuit_breaker_enabled: boolean;
  circuit_breaker_reason: string;
  exchange_mode: string;
  live_trading_enabled: boolean;
  updated_at: string;
};

export type RiskRule = {
  id: string;
  name: string;
  metric: 'leverage' | 'position_size' | 'drawdown' | 'exchange_mode';
  operator: '<=' | '>=' | '=';
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type RiskAccount = {
  account_id: string;
  exchange: string;
  risk_level: string;
  margin_usage_pct: number;
  leverage: number;
  open_positions: number;
};

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error('登录失败');
  }

  return response.json() as Promise<LoginResponse>;
}

export async function getOpportunities(token: string): Promise<OpportunityListResponse> {
  const response = await fetch(`${API_BASE_URL}/opportunities`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('机会列表加载失败');
  }

  return response.json() as Promise<OpportunityListResponse>;
}

export async function getTasks(token: string): Promise<TaskListResponse> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('任务列表加载失败');
  }

  return response.json() as Promise<TaskListResponse>;
}

export async function createTaskFromOpportunity(token: string, opportunity: Opportunity): Promise<ArbitrageTask> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      opportunity_id: opportunity.id,
      unified_symbol: opportunity.unified_symbol,
      long_exchange: opportunity.long_exchange,
      short_exchange: opportunity.short_exchange,
      long_account_id: `${opportunity.long_exchange}-mock-account`,
      short_account_id: `${opportunity.short_exchange}-mock-account`,
      leverage: 3,
      target_position_size: 200,
    }),
  });

  if (!response.ok) {
    throw new Error('任务创建失败');
  }

  return response.json() as Promise<ArbitrageTask>;
}

export async function executeTask(token: string, taskId: string): Promise<ArbitrageTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/execute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('任务执行失败');
  }

  return response.json() as Promise<ArbitrageTask>;
}

export async function pauseTask(token: string, taskId: string): Promise<ArbitrageTask> {
  return mutateTaskStatus(token, taskId, 'pause');
}

export async function resumeTask(token: string, taskId: string): Promise<ArbitrageTask> {
  return mutateTaskStatus(token, taskId, 'resume');
}

export async function stopTask(token: string, taskId: string): Promise<ArbitrageTask> {
  return mutateTaskStatus(token, taskId, 'stop');
}

export async function getTaskOrders(token: string, taskId: string): Promise<TaskRelationsResponse<TaskOrder>> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('订单列表加载失败');
  }

  return response.json() as Promise<TaskRelationsResponse<TaskOrder>>;
}

async function mutateTaskStatus(
  token: string,
  taskId: string,
  action: 'pause' | 'resume' | 'stop',
): Promise<ArbitrageTask> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/${action}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Task status update failed');
  }

  return response.json() as Promise<ArbitrageTask>;
}

export async function getTaskPositions(token: string, taskId: string): Promise<TaskRelationsResponse<TaskPosition>> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/positions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('持仓列表加载失败');
  }

  return response.json() as Promise<TaskRelationsResponse<TaskPosition>>;
}

export async function getDashboardAssetSummary(token: string): Promise<AssetSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/asset-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Dashboard asset summary failed');
  }

  return response.json() as Promise<AssetSummary>;
}

export async function getDashboardStrategySummary(token: string): Promise<StrategySummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/strategy-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Dashboard strategy summary failed');
  }

  return response.json() as Promise<StrategySummary>;
}

export async function getDashboardRiskSummary(token: string): Promise<RiskSummary> {
  const response = await fetch(`${API_BASE_URL}/dashboard/risk-summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Dashboard risk summary failed');
  }

  return response.json() as Promise<RiskSummary>;
}

export async function getAlerts(token: string): Promise<AlertListResponse> {
  const response = await fetch(`${API_BASE_URL}/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('告警列表加载失败');
  }

  return response.json() as Promise<AlertListResponse>;
}

export async function getPnlSummary(token: string): Promise<PnlSummary> {
  const response = await fetch(`${API_BASE_URL}/analytics/pnl/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('PnL summary failed');
  }

  return response.json() as Promise<PnlSummary>;
}

export async function getPnlTrend(token: string): Promise<PnlTrendResponse> {
  const response = await fetch(`${API_BASE_URL}/analytics/pnl/trend`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('PnL trend failed');
  }

  return response.json() as Promise<PnlTrendResponse>;
}

export async function getPnlDetails(token: string): Promise<PnlDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/analytics/pnl/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('PnL details failed');
  }

  return response.json() as Promise<PnlDetailsResponse>;
}

export async function getPnlByStrategy(token: string): Promise<ListResponse<PnlByStrategy>> {
  return getList(token, 'analytics/pnl/by-strategy', 'PnL by strategy failed');
}

export async function getPnlByExchange(token: string): Promise<ListResponse<PnlByExchange>> {
  return getList(token, 'analytics/pnl/by-exchange', 'PnL by exchange failed');
}

export async function exportPnlCsv(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/analytics/pnl/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('PnL export failed');
  }

  return response.text();
}

export async function getStrategies(token: string): Promise<StrategyListResponse> {
  const response = await fetch(`${API_BASE_URL}/strategies`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Strategy list failed');
  }

  return response.json() as Promise<StrategyListResponse>;
}

export async function createStrategy(token: string, body: CreateStrategyRequest): Promise<StrategyRecord> {
  const response = await fetch(`${API_BASE_URL}/strategies`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Strategy create failed');
  }

  return response.json() as Promise<StrategyRecord>;
}

export async function updateStrategy(
  token: string,
  strategyId: string,
  body: CreateStrategyRequest,
): Promise<StrategyRecord> {
  const response = await fetch(`${API_BASE_URL}/strategies/${strategyId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Strategy update failed');
  }

  return response.json() as Promise<StrategyRecord>;
}

export async function toggleStrategy(token: string, strategyId: string): Promise<StrategyRecord> {
  const response = await fetch(`${API_BASE_URL}/strategies/${strategyId}/toggle`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Strategy toggle failed');
  }

  return response.json() as Promise<StrategyRecord>;
}

export async function getExchanges(token: string): Promise<ListResponse<ExchangeRecord>> {
  return getList(token, 'exchanges', 'Exchange list failed');
}

export async function createExchange(
  token: string,
  body: { name: string; code: string; is_testnet?: boolean },
): Promise<ExchangeRecord> {
  return postJson(token, 'exchanges', body, 'Exchange create failed') as Promise<ExchangeRecord>;
}

export async function getAccounts(token: string): Promise<ListResponse<AccountRecord>> {
  return getList(token, 'accounts', 'Account list failed');
}

export async function createAccount(
  token: string,
  body: { exchange_code: string; name: string; is_testnet?: boolean },
): Promise<AccountRecord> {
  return postJson(token, 'accounts', body, 'Account create failed') as Promise<AccountRecord>;
}

export async function deleteAccount(token: string, accountId: string): Promise<AccountRecord> {
  const response = await fetch(`${API_BASE_URL}/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Account delete failed');
  }

  return response.json() as Promise<AccountRecord>;
}

export async function getUsers(token: string): Promise<ListResponse<UserRecord>> {
  return getList(token, 'users', 'User list failed');
}

export async function createUser(token: string, body: { username: string; role?: UserRecord['role'] }): Promise<UserRecord> {
  return postJson(token, 'users', body, 'User create failed') as Promise<UserRecord>;
}

export async function updateUserRole(token: string, userId: string, role: UserRecord['role']): Promise<UserRecord> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error('User role update failed');
  }

  return response.json() as Promise<UserRecord>;
}

export async function getAuditLogs(token: string): Promise<ListResponse<AuditLogRecord>> {
  return getList(token, 'audit-logs', 'Audit log list failed');
}

export async function getSystemStatus(token: string): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/system/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('System status failed');
  }

  return response.json() as Promise<SystemStatus>;
}

export async function getRiskOverview(token: string): Promise<RiskOverview> {
  const response = await fetch(`${API_BASE_URL}/risk/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Risk overview failed');
  }

  return response.json() as Promise<RiskOverview>;
}

export async function getRiskRules(token: string): Promise<ListResponse<RiskRule>> {
  return getList(token, 'risk/rules', 'Risk rules failed');
}

export async function createRiskRule(
  token: string,
  body: Pick<RiskRule, 'name' | 'metric' | 'operator' | 'threshold' | 'severity'>,
): Promise<RiskRule> {
  return postJson(token, 'risk/rules', body, 'Risk rule create failed') as Promise<RiskRule>;
}

export async function toggleRiskRule(token: string, ruleId: string): Promise<RiskRule> {
  const response = await fetch(`${API_BASE_URL}/risk/rules/${ruleId}/toggle`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Risk rule toggle failed');
  }

  return response.json() as Promise<RiskRule>;
}

export async function getRiskAccounts(token: string): Promise<ListResponse<RiskAccount>> {
  return getList(token, 'risk/accounts', 'Risk accounts failed');
}

export async function triggerCircuitBreak(token: string, reason: string): Promise<unknown> {
  return postJson(token, 'risk/circuit-break', { reason, scope: 'all' }, 'Circuit break failed');
}

export async function acknowledgeAlert(token: string, alertId: string): Promise<AlertRecord> {
  return updateAlert(token, alertId, 'acknowledge');
}

export async function dismissAlert(token: string, alertId: string): Promise<AlertRecord> {
  return updateAlert(token, alertId, 'dismiss');
}

async function getList<T>(token: string, path: string, errorMessage: string): Promise<ListResponse<T>> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ListResponse<T>>;
}

async function postJson<T>(token: string, path: string, body: T, errorMessage: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json();
}

async function updateAlert(token: string, alertId: string, action: 'acknowledge' | 'dismiss'): Promise<AlertRecord> {
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/${action}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('告警操作失败');
  }

  return response.json() as Promise<AlertRecord>;
}
