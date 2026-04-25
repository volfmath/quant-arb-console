import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { EXCHANGE_ADAPTER } from '../src/exchanges/exchange-adapter.interface';
import { ExchangeModule } from '../src/exchanges/exchange.module';
import { MockExchangeAdapter } from '../src/exchanges/mock-exchange.adapter';
import { PublicMarketDataAdapter } from '../src/exchanges/public-market-data.adapter';

afterEach(() => {
  delete process.env.EXCHANGE_MODE;
});

describe('ExchangeModule', () => {
  it('uses the mock adapter by default', async () => {
    delete process.env.EXCHANGE_MODE;

    const moduleRef = await Test.createTestingModule({ imports: [ExchangeModule] }).compile();
    const adapter = moduleRef.get(EXCHANGE_ADAPTER);

    expect(adapter).toBeInstanceOf(MockExchangeAdapter);
  });

  it('uses public market data adapter outside mock mode', async () => {
    process.env.EXCHANGE_MODE = 'testnet';

    const moduleRef = await Test.createTestingModule({ imports: [ExchangeModule] }).compile();
    const adapter = moduleRef.get(EXCHANGE_ADAPTER);

    expect(adapter).toBeInstanceOf(PublicMarketDataAdapter);
  });
});
