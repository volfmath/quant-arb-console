import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  service: 'admin-console-api';
  exchangeMode: 'mock' | 'testnet' | 'live';
  liveTradingEnabled: boolean;
};

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'admin-console-api',
      exchangeMode: parseExchangeMode(process.env.EXCHANGE_MODE),
      liveTradingEnabled: process.env.ENABLE_LIVE_TRADING === 'true',
    };
  }
}

function parseExchangeMode(value: string | undefined): HealthResponse['exchangeMode'] {
  if (value === 'testnet' || value === 'live') {
    return value;
  }

  return 'mock';
}

