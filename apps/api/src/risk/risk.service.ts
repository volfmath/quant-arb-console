import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { getAppConfig } from '../config/app.config';

export type RiskCheckInput = {
  targetPositionSize: number;
  leverage: number;
  longAccountId: string;
  shortAccountId: string;
};

export type RiskCheckResult = {
  passed: boolean;
  reasons: string[];
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

export type CreateRiskRuleBody = {
  name?: string;
  metric?: RiskRule['metric'];
  operator?: RiskRule['operator'];
  threshold?: number | string;
  severity?: RiskRule['severity'];
};

export type RiskCircuitBreakBody = {
  reason?: string;
  scope?: 'all' | 'exchange' | 'strategy';
};

@Injectable()
export class RiskService {
  private readonly rules: RiskRule[] = [
    {
      id: 'risk-rule-max-leverage',
      name: '最大杠杆限制',
      metric: 'leverage',
      operator: '<=',
      threshold: 3,
      severity: 'high',
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'risk-rule-live-trading-lock',
      name: '实盘交易保护',
      metric: 'exchange_mode',
      operator: '=',
      threshold: 'mock',
      severity: 'critical',
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  private circuitBreaker = {
    enabled: false,
    reason: '',
    scope: 'all' as RiskCircuitBreakBody['scope'],
    triggered_at: '',
  };

  constructor(
    @Optional()
    @Inject(AuditService)
    private readonly auditService?: AuditService,
  ) {}

  checkBeforeOpen(input: RiskCheckInput): RiskCheckResult {
    const reasons: string[] = [];

    if (!Number.isFinite(input.targetPositionSize) || input.targetPositionSize <= 0) {
      reasons.push('target_position_size must be greater than 0');
    }

    if (!Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > 3) {
      reasons.push('leverage must be an integer between 1 and 3');
    }

    if (input.longAccountId === input.shortAccountId) {
      reasons.push('long and short accounts must be different');
    }

    const config = getAppConfig();
    if (config.exchangeMode === 'live' && !config.liveTradingEnabled) {
      reasons.push('live trading is disabled');
    }

    return {
      passed: reasons.length === 0,
      reasons,
    };
  }

  overview() {
    const config = getAppConfig();
    const enabledRules = this.rules.filter((rule) => rule.enabled);
    return {
      risk_level: this.circuitBreaker.enabled ? 'critical' : config.exchangeMode === 'mock' ? 'low' : 'medium',
      risk_exposure: 0,
      leverage_usage_pct: 0,
      active_rules: enabledRules.length,
      circuit_breaker_enabled: this.circuitBreaker.enabled,
      circuit_breaker_reason: this.circuitBreaker.reason,
      exchange_mode: config.exchangeMode,
      live_trading_enabled: config.liveTradingEnabled,
      updated_at: new Date().toISOString(),
    };
  }

  rulesList() {
    return {
      items: [...this.rules],
      total: this.rules.length,
      page: 1,
      size: this.rules.length,
    };
  }

  accounts() {
    const items = [
      {
        account_id: 'binance-mock-account',
        exchange: 'binance',
        risk_level: 'low',
        margin_usage_pct: 0,
        leverage: 0,
        open_positions: 0,
      },
      {
        account_id: 'okx-mock-account',
        exchange: 'okx',
        risk_level: 'low',
        margin_usage_pct: 0,
        leverage: 0,
        open_positions: 0,
      },
    ];
    return { items, total: items.length, page: 1, size: items.length };
  }

  createRule(body: CreateRiskRuleBody): RiskRule {
    const now = new Date().toISOString();
    const rule: RiskRule = {
      id: crypto.randomUUID(),
      name: body.name?.trim() ?? '',
      metric: body.metric ?? 'leverage',
      operator: body.operator ?? '<=',
      threshold: body.threshold ?? 3,
      severity: body.severity ?? 'medium',
      enabled: true,
      created_at: now,
      updated_at: now,
    };
    validateRule(rule);
    this.rules.unshift(rule);
    this.auditService?.record({
      action: 'risk_rule:create',
      resourceType: 'risk_rule',
      resourceId: rule.id,
      afterState: rule,
    });

    return rule;
  }

  updateRule(id: string, body: CreateRiskRuleBody): RiskRule {
    const rule = this.findRule(id);
    const beforeState = { ...rule };
    if (body.name !== undefined) {
      rule.name = body.name.trim();
    }
    if (body.metric !== undefined) {
      rule.metric = body.metric;
    }
    if (body.operator !== undefined) {
      rule.operator = body.operator;
    }
    if (body.threshold !== undefined) {
      rule.threshold = body.threshold;
    }
    if (body.severity !== undefined) {
      rule.severity = body.severity;
    }
    validateRule(rule);
    rule.updated_at = new Date().toISOString();
    this.auditService?.record({
      action: 'risk_rule:update',
      resourceType: 'risk_rule',
      resourceId: rule.id,
      beforeState,
      afterState: rule,
    });

    return rule;
  }

  toggleRule(id: string): RiskRule {
    const rule = this.findRule(id);
    const beforeState = { ...rule };
    rule.enabled = !rule.enabled;
    rule.updated_at = new Date().toISOString();
    this.auditService?.record({
      action: 'risk_rule:toggle',
      resourceType: 'risk_rule',
      resourceId: rule.id,
      beforeState,
      afterState: rule,
    });

    return rule;
  }

  circuitBreak(body: RiskCircuitBreakBody) {
    this.circuitBreaker = {
      enabled: true,
      reason: body.reason?.trim() || 'manual circuit break',
      scope: body.scope ?? 'all',
      triggered_at: new Date().toISOString(),
    };
    this.auditService?.record({
      action: 'risk:circuit_break',
      resourceType: 'risk',
      resourceId: this.circuitBreaker.scope,
      afterState: this.circuitBreaker,
    });

    return this.circuitBreaker;
  }

  private findRule(id: string): RiskRule {
    const rule = this.rules.find((item) => item.id === id);
    if (!rule) {
      throw new NotFoundException('Risk rule not found');
    }

    return rule;
  }
}

function validateRule(rule: RiskRule): void {
  if (!rule.name) {
    throw new BadRequestException('Risk rule name is required');
  }
  if (rule.threshold === '' || rule.threshold === undefined || rule.threshold === null) {
    throw new BadRequestException('Risk rule threshold is required');
  }
}
