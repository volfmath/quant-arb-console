import { Module } from '@nestjs/common';
import { getAppConfig } from '../config/app.config';
import { EXCHANGE_ADAPTER } from './exchange-adapter.interface';
import { MockExchangeAdapter } from './mock-exchange.adapter';
import { PublicMarketDataAdapter } from './public-market-data.adapter';

@Module({
  providers: [
    MockExchangeAdapter,
    PublicMarketDataAdapter,
    {
      provide: EXCHANGE_ADAPTER,
      useFactory: (mockAdapter: MockExchangeAdapter, publicMarketDataAdapter: PublicMarketDataAdapter) => {
        const config = getAppConfig();
        return config.exchangeMode === 'mock' ? mockAdapter : publicMarketDataAdapter;
      },
      inject: [MockExchangeAdapter, PublicMarketDataAdapter],
    },
  ],
  exports: [EXCHANGE_ADAPTER, MockExchangeAdapter, PublicMarketDataAdapter],
})
export class ExchangeModule {}
