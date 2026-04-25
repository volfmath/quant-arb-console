import { Module } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from './exchange-adapter.interface';
import { MockExchangeAdapter } from './mock-exchange.adapter';

@Module({
  providers: [
    MockExchangeAdapter,
    {
      provide: EXCHANGE_ADAPTER,
      useExisting: MockExchangeAdapter,
    },
  ],
  exports: [EXCHANGE_ADAPTER, MockExchangeAdapter],
})
export class ExchangeModule {}

