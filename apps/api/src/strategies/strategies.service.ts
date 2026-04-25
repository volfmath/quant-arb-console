import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';

export type StrategyStatus = 'draft' | 'running' | 'paused' | 'stopped';

export type StrategyRecord = {
  id: string;
  name: string;
  type: 'funding_rate_arb';
  status: StrategyStatus;
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

export type CreateStrategyBody = {
  name?: string;
  symbol?: string;
  min_spread_pct?: number;
  max_position_size?: number;
  leverage?: number;
};

export type UpdateStrategyBody = Partial<CreateStrategyBody>;

@Injectable()
export class StrategiesService {
  private readonly strategies: StrategyRecord[] = [
    {
      id: 'mock-strategy-btc',
      name: '资金费套利_BTC',
      type: 'funding_rate_arb',
      status: 'running',
      symbol: 'BTC/USDT:USDT',
      min_spread_pct: 0.02,
      max_position_size: 2000,
      leverage: 3,
      running_duration: '12天 07:32:16',
      today_pnl: 0,
      total_pnl: 0,
      return_rate: 0,
      win_rate: 0,
      max_drawdown: 0,
      active_tasks: 1,
      total_tasks: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  list() {
    return {
      items: [...this.strategies],
      total: this.strategies.length,
      page: 1,
      size: this.strategies.length,
    };
  }

  get(id: string): StrategyRecord {
    return this.find(id);
  }

  create(body: CreateStrategyBody): StrategyRecord {
    const now = new Date().toISOString();
    const strategy: StrategyRecord = {
      id: crypto.randomUUID(),
      name: body.name?.trim() || `资金费套利_${body.symbol?.split('/')[0] ?? 'BTC'}`,
      type: 'funding_rate_arb',
      status: 'draft',
      symbol: body.symbol?.trim() || 'BTC/USDT:USDT',
      min_spread_pct: body.min_spread_pct ?? 0.02,
      max_position_size: body.max_position_size ?? 1000,
      leverage: body.leverage ?? 3,
      running_duration: '0天 00:00:00',
      today_pnl: 0,
      total_pnl: 0,
      return_rate: 0,
      win_rate: 0,
      max_drawdown: 0,
      active_tasks: 0,
      total_tasks: 0,
      created_at: now,
      updated_at: now,
    };

    validateStrategy(strategy);
    this.strategies.unshift(strategy);
    this.auditService.record({
      action: 'strategy:create',
      resourceType: 'strategy',
      resourceId: strategy.id,
      afterState: strategy,
    });

    return strategy;
  }

  update(id: string, body: UpdateStrategyBody): StrategyRecord {
    const strategy = this.find(id);
    const beforeState = { ...strategy };

    if (body.name !== undefined) {
      strategy.name = body.name.trim();
    }
    if (body.symbol !== undefined) {
      strategy.symbol = body.symbol.trim();
    }
    if (body.min_spread_pct !== undefined) {
      strategy.min_spread_pct = body.min_spread_pct;
    }
    if (body.max_position_size !== undefined) {
      strategy.max_position_size = body.max_position_size;
    }
    if (body.leverage !== undefined) {
      strategy.leverage = body.leverage;
    }

    validateStrategy(strategy);
    strategy.updated_at = new Date().toISOString();
    this.auditService.record({
      action: 'strategy:update',
      resourceType: 'strategy',
      resourceId: strategy.id,
      beforeState,
      afterState: strategy,
    });

    return strategy;
  }

  toggle(id: string): StrategyRecord {
    const strategy = this.find(id);
    const beforeState = { ...strategy };
    strategy.status = strategy.status === 'running' ? 'paused' : 'running';
    strategy.updated_at = new Date().toISOString();

    this.auditService.record({
      action: 'strategy:toggle',
      resourceType: 'strategy',
      resourceId: strategy.id,
      beforeState,
      afterState: strategy,
    });

    return strategy;
  }

  private find(id: string): StrategyRecord {
    const strategy = this.strategies.find((item) => item.id === id);
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }

    return strategy;
  }
}

function validateStrategy(strategy: StrategyRecord): void {
  if (!strategy.name) {
    throw new BadRequestException('Strategy name is required');
  }
  if (!strategy.symbol) {
    throw new BadRequestException('Strategy symbol is required');
  }
  if (strategy.min_spread_pct <= 0) {
    throw new BadRequestException('Minimum spread must be greater than 0');
  }
  if (strategy.max_position_size <= 0) {
    throw new BadRequestException('Max position size must be greater than 0');
  }
  if (strategy.leverage < 1 || strategy.leverage > 10) {
    throw new BadRequestException('Leverage must be between 1 and 10');
  }
}
