export type CacheConfig = {
  redisUrl: string;
  keyPrefix: string;
};

export function getCacheConfig(env: NodeJS.ProcessEnv = process.env): CacheConfig {
  return {
    redisUrl: env.REDIS_URL ?? 'redis://localhost:6379',
    keyPrefix: env.REDIS_KEY_PREFIX ?? 'quant-arb-console',
  };
}

