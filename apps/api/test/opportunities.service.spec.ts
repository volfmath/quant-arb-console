import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockExchangeAdapter } from '../src/exchanges/mock-exchange.adapter';
import type { ExchangeAdapter, FundingRateSnapshot } from '../src/exchanges/exchange-adapter.interface';
import type { RealtimeGateway } from '../src/realtime/realtime.gateway';
import { OpportunitiesService } from '../src/opportunities/opportunities.service';

afterEach(() => {
  delete process.env.OPPORTUNITY_SYMBOLS;
});

describe('OpportunitiesService', () => {
  it('builds funding-rate arbitrage opportunities from exchange snapshots', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const result = await service.list();

    expect(result.total).toBe(24);
    expect(result.items[0]).toMatchObject({
      unified_symbol: 'BTC/USDT:USDT',
      long_exchange: 'binance',
      short_exchange: 'gate',
      feasibility_score: 64,
    });
  });

  it('filters by score and returns summary data', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const filtered = await service.list({ minScore: 65 });
    const summary = await service.summary();

    expect(filtered.items).toHaveLength(0);
    expect(summary.total_count).toBe(24);
    expect(summary.monitored_symbols).toBe(24);
    expect(summary.best_opportunity).toMatchObject({ long_exchange: 'binance', short_exchange: 'gate' });
  });

  it('uses OPPORTUNITY_SYMBOLS as the default monitored universe', async () => {
    process.env.OPPORTUNITY_SYMBOLS = 'BTC,ETHUSDT,XRP-USDT-SWAP';
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const result = await service.list();
    const summary = await service.summary();

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.unified_symbol)).toEqual([
      'BTC/USDT:USDT',
      'ETH/USDT:USDT',
      'XRP/USDT:USDT',
    ]);
    expect(summary.monitored_symbols).toBe(3);
  });

  it('normalizes symbols, filters by spread, sorts, and paginates', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());

    const result = await service.list({
      symbols: ['btc', 'ETHUSDT', 'SOL-USDT-SWAP', 'BTC/USDT:USDT'],
      minSpread: 0.00016,
      sortBy: 'score',
      sortDirection: 'desc',
      page: 2,
      size: 1,
    });

    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.size).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.unified_symbol).toBe('ETH/USDT:USDT');
  });

  it('publishes scan results to the realtime opportunities channel', async () => {
    const realtimeGateway = { publish: vi.fn() } as unknown as RealtimeGateway;
    const service = new OpportunitiesService(new MockExchangeAdapter(), realtimeGateway);

    const result = await service.scanAndPublish({ symbols: ['BTC'], page: 1, size: 1 });

    expect(result.items).toHaveLength(1);
    expect(realtimeGateway.publish).toHaveBeenCalledWith(
      'opportunities',
      'opportunity:update',
      expect.objectContaining({ total: 1 }),
    );
  });

  it('does not build opportunities when only one exchange has a symbol snapshot', async () => {
    const adapter: ExchangeAdapter = {
      getFundingRates: async (): Promise<FundingRateSnapshot[]> => [
        {
          exchange: 'binance',
          unifiedSymbol: 'BTC/USDT:USDT',
          fundingRate: 0.0001,
          markPrice: 60000,
          settlementTime: new Date().toISOString(),
          nextSettlement: new Date().toISOString(),
        },
      ],
      getTicker: vi.fn(),
      placeOrder: vi.fn(),
    };
    const service = new OpportunitiesService(adapter);

    const result = await service.list({ symbols: ['BTC'] });

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('returns detail metrics for a known opportunity', async () => {
    const service = new OpportunitiesService(new MockExchangeAdapter());
    const result = await service.list();

    const detail = await service.detail(result.items[0]!.id);

    expect(detail.estimated_pnl_24h).toBeGreaterThan(detail.estimated_pnl_8h);
    expect(detail.fee_estimate).toBeGreaterThan(0);
  });
});
