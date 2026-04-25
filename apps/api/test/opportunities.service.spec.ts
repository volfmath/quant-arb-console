import { describe, expect, it } from 'vitest';
import { MockExchangeAdapter } from '../src/exchanges/mock-exchange.adapter';
import { OpportunitiesService } from '../src/opportunities/opportunities.service';

describe('OpportunitiesService', () => {
  it('builds funding-rate arbitrage opportunities from exchange snapshots', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const result = await service.list();

    expect(result.total).toBe(3);
    expect(result.items[0]).toMatchObject({
      unified_symbol: 'BTC/USDT:USDT',
      long_exchange: 'binance',
      short_exchange: 'okx',
      feasibility_score: 64,
    });
  });

  it('filters by score and returns summary data', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const filtered = await service.list({ minScore: 65 });
    const summary = await service.summary();

    expect(filtered.items).toHaveLength(0);
    expect(summary.total_count).toBe(3);
    expect(summary.best_opportunity?.long_exchange).toBe('binance');
  });

  it('returns detail metrics for a known opportunity', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());
    const result = await service.list();

    const detail = await service.detail(result.items[0]!.id);

    expect(detail.estimated_pnl_24h).toBeGreaterThan(detail.estimated_pnl_8h);
    expect(detail.fee_estimate).toBeGreaterThan(0);
  });
});

