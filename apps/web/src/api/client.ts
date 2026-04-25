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
  status: 'pending' | 'confirming' | 'running' | 'failed';
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
