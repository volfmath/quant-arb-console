export type AppConfig = {
  nodeEnv: string;
  apiPort: number;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  adminUsername: string;
  adminPassword: string;
  exchangeMode: 'mock' | 'testnet' | 'live';
  liveTradingEnabled: boolean;
};

export function getAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    apiPort: parsePort(env.API_PORT, 3000, 'API_PORT'),
    jwtSecret: env.JWT_SECRET ?? 'change-me',
    jwtExpiresInSeconds: parsePort(env.JWT_EXPIRES_IN_SECONDS, 86400, 'JWT_EXPIRES_IN_SECONDS'),
    adminUsername: env.ADMIN_USERNAME ?? 'admin',
    adminPassword: env.ADMIN_PASSWORD ?? 'change-me-admin',
    exchangeMode: parseExchangeMode(env.EXCHANGE_MODE),
    liveTradingEnabled: env.ENABLE_LIVE_TRADING === 'true',
  };
}

function parseExchangeMode(value: string | undefined): AppConfig['exchangeMode'] {
  if (value === 'testnet' || value === 'live') {
    return value;
  }

  return 'mock';
}

function parsePort(value: string | undefined, fallback: number, name: string): number {
  if (!value) {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid ${name}: ${value}`);
  }

  return port;
}
