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
