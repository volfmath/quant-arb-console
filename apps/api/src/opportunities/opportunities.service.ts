import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  EXCHANGE_ADAPTER,
  type ExchangeAdapter,
  type FundingRateSnapshot,
} from '../exchanges/exchange-adapter.interface';
import { getAppConfig } from '../config/app.config';
import { normalizeInstrumentSymbol } from '../exchanges/instrument-normalizer';
import { RealtimeGateway } from '../realtime/realtime.gateway';

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

export type OpportunityScanAuditSymbol = {
  unified_symbol: string;
  exchanges: string[];
  rates: number;
  comparable: boolean;
};

export type OpportunityScanAudit = {
  id: string;
  source: 'list' | 'manual_scan';
  scanned_at: string;
  requested_symbols: string[];
  monitored_symbols: number;
  funding_snapshots: number;
  data_sources: string[];
  comparable_symbols: number;
  opportunity_count: number;
  best_opportunity: {
    symbol: string;
    long_exchange: string;
    short_exchange: string;
    spread_8h_pct: number;
  } | null;
  symbols: OpportunityScanAuditSymbol[];
};

export type ListOptions = {
  symbols?: string[];
  minScore?: number;
  minSpread?: number;
  sortBy?: 'score' | 'spread' | 'annualized_return' | 'estimated_pnl';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
};

const referencePositionSize = 1000;
const maxAuditRecords = 200;

@Injectable()
export class OpportunitiesService {
  private readonly auditRecords: OpportunityScanAudit[] = [];

  constructor(
    @Inject(EXCHANGE_ADAPTER) private readonly exchangeAdapter: ExchangeAdapter,
    @Optional()
    @Inject(RealtimeGateway)
    private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  async list(options: ListOptions = {}) {
    return this.scan(options, 'list');
  }

  async auditLog(options: { page?: number; size?: number } = {}) {
    if (!this.auditRecords.length) {
      await this.scan({}, 'list');
    }

    const page = positiveInteger(options.page, 1);
    const size = positiveInteger(options.size, 20);
    const start = (page - 1) * size;
    const items = this.auditRecords.slice(start, start + size);

    return {
      items,
      total: this.auditRecords.length,
      page,
      size,
    };
  }

  private async scan(options: ListOptions = {}, auditSource?: OpportunityScanAudit['source']) {
    const monitoredSymbols = getMonitoredSymbols();
    const symbols = normalizeSymbols(options.symbols?.length ? options.symbols : monitoredSymbols);
    const rates = await this.exchangeAdapter.getFundingRates(symbols);
    let items = buildOpportunities(rates);

    if (options.minScore !== undefined && Number.isFinite(options.minScore)) {
      items = items.filter((item) => item.feasibility_score >= Number(options.minScore));
    }
    if (options.minSpread !== undefined && Number.isFinite(options.minSpread)) {
      items = items.filter((item) => item.rate_spread >= Number(options.minSpread));
    }

    items = sortOpportunities(items, options.sortBy ?? 'spread', options.sortDirection ?? 'desc');
    const page = positiveInteger(options.page, 1);
    const size = positiveInteger(options.size, items.length || 1);
    const start = (page - 1) * size;
    const pageItems = items.slice(start, start + size);

    const result = {
      items: pageItems,
      total: items.length,
      page,
      size,
    };

    if (auditSource) {
      this.recordAudit(auditSource, symbols, rates, items);
    }

    return result;
  }

  async summary() {
    const result = await this.scan();
    const best = result.items[0];

    return {
      best_opportunity: best
        ? {
            spread_pct: best.spread_8h_pct,
            symbol: best.symbol_display,
            long_exchange: best.long_exchange,
            short_exchange: best.short_exchange,
          }
        : null,
      total_count: result.total,
      avg_spread_8h: average(result.items.map((item) => item.spread_8h_pct)),
      monitored_symbols: getMonitoredSymbols().length,
      monitored_exchanges: 3,
      next_settlement: best?.settlement_time ?? null,
      next_settlement_countdown: best?.settlement_countdown ?? null,
    };
  }

  async detail(id: string) {
    const result = await this.scan();
    const item = result.items.find((opportunity) => opportunity.id === id);
    if (!item) {
      throw new NotFoundException('Opportunity not found');
    }

    return {
      ...item,
      estimated_pnl_24h: roundMoney(item.estimated_pnl_8h * 3),
      estimated_pnl_7d: roundMoney(item.estimated_pnl_8h * 3 * 7),
      fee_estimate: roundMoney(referencePositionSize * 0.0004),
      slippage_estimate: roundMoney(referencePositionSize * 0.0002),
    };
  }

  async scanAndPublish(options: ListOptions = {}) {
    const result = await this.scan(options, 'manual_scan');
    this.realtimeGateway?.publish('opportunities', 'opportunity:update', {
      items: result.items,
      total: result.total,
    });

    return result;
  }

  private recordAudit(
    source: OpportunityScanAudit['source'],
    requestedSymbols: string[],
    rates: FundingRateSnapshot[],
    opportunities: Opportunity[],
  ): void {
    const symbols = buildAuditSymbols(requestedSymbols, rates);
    const record: OpportunityScanAudit = {
      id: crypto.randomUUID(),
      source,
      scanned_at: new Date().toISOString(),
      requested_symbols: requestedSymbols,
      monitored_symbols: requestedSymbols.length,
      funding_snapshots: rates.length,
      data_sources: [...new Set(rates.map((rate) => rate.exchange))].sort(),
      comparable_symbols: symbols.filter((symbol) => symbol.comparable).length,
      opportunity_count: opportunities.length,
      best_opportunity: opportunities[0]
        ? {
            symbol: opportunities[0].symbol_display,
            long_exchange: opportunities[0].long_exchange,
            short_exchange: opportunities[0].short_exchange,
            spread_8h_pct: opportunities[0].spread_8h_pct,
          }
        : null,
      symbols,
    };

    this.auditRecords.unshift(record);
    this.auditRecords.splice(maxAuditRecords);
  }
}

function buildAuditSymbols(requestedSymbols: string[], rates: FundingRateSnapshot[]): OpportunityScanAuditSymbol[] {
  return requestedSymbols.map((symbol) => {
    const symbolRates = rates.filter((rate) => rate.unifiedSymbol === symbol);
    const exchanges = [...new Set(symbolRates.map((rate) => rate.exchange))].sort();

    return {
      unified_symbol: symbol,
      exchanges,
      rates: symbolRates.length,
      comparable: exchanges.length >= 2,
    };
  });
}

function buildOpportunities(rates: FundingRateSnapshot[]): Opportunity[] {
  const bySymbol = new Map<string, FundingRateSnapshot[]>();
  for (const rate of rates) {
    const current = bySymbol.get(rate.unifiedSymbol) ?? [];
    current.push(rate);
    bySymbol.set(rate.unifiedSymbol, current);
  }

  const opportunities: Opportunity[] = [];
  for (const [symbol, symbolRates] of bySymbol.entries()) {
    if (new Set(symbolRates.map((rate) => rate.exchange)).size < 2) {
      continue;
    }

    const sorted = [...symbolRates].sort((a, b) => a.fundingRate - b.fundingRate);
    const longRate = sorted[0];
    const shortRate = sorted[sorted.length - 1];
    if (!longRate || !shortRate || longRate.exchange === shortRate.exchange) {
      continue;
    }

    const spread = shortRate.fundingRate - longRate.fundingRate;
    const estimatedPnl = referencePositionSize * spread;

    opportunities.push({
      id: `${symbol}:${longRate.exchange}:${shortRate.exchange}`,
      unified_symbol: symbol,
      symbol_display: symbol.split('/')[0] ?? symbol,
      long_exchange: longRate.exchange,
      short_exchange: shortRate.exchange,
      long_funding_rate: longRate.fundingRate,
      short_funding_rate: shortRate.fundingRate,
      rate_spread: roundRate(spread),
      spread_8h_pct: roundPct(spread * 100),
      estimated_pnl_8h: roundMoney(estimatedPnl),
      annualized_return: roundPct(spread * 3 * 365 * 100),
      feasibility_score: scoreOpportunity(spread),
      settlement_time: shortRate.settlementTime,
      settlement_countdown: '02:00:00',
      discovered_at: new Date().toISOString(),
    });
  }

  return opportunities.sort((a, b) => b.rate_spread - a.rate_spread);
}

function scoreOpportunity(spread: number): number {
  return Math.max(0, Math.min(100, Math.round((spread / 0.0002) * 80)));
}

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => normalizeInstrumentSymbol(symbol).unifiedSymbol))];
}

function getMonitoredSymbols(): string[] {
  return normalizeSymbols(getAppConfig().opportunitySymbols);
}

function sortOpportunities(
  items: Opportunity[],
  sortBy: NonNullable<ListOptions['sortBy']>,
  sortDirection: NonNullable<ListOptions['sortDirection']>,
): Opportunity[] {
  const direction = sortDirection === 'asc' ? 1 : -1;
  const valueOf = (item: Opportunity) => {
    if (sortBy === 'score') {
      return item.feasibility_score;
    }
    if (sortBy === 'annualized_return') {
      return item.annualized_return;
    }
    if (sortBy === 'estimated_pnl') {
      return item.estimated_pnl_8h;
    }

    return item.rate_spread;
  };

  return [...items].sort((a, b) => (valueOf(a) - valueOf(b)) * direction);
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.floor(value);
}

function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  return roundPct(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function roundRate(value: number): number {
  return Number(value.toFixed(8));
}

function roundPct(value: number): number {
  return Number(value.toFixed(4));
}

function roundMoney(value: number): number {
  return Number(value.toFixed(8));
}
