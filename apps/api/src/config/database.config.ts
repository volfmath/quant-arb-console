import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
};

export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    host: env.POSTGRES_HOST ?? 'localhost',
    port: parsePort(env.POSTGRES_PORT),
    database: env.POSTGRES_DB ?? 'quant_arb_console',
    username: env.POSTGRES_USER ?? 'quant_arb',
    password: env.POSTGRES_PASSWORD ?? 'quant_arb',
    ssl: env.POSTGRES_SSL === 'true',
  };
}

export function getTypeOrmOptions(env: NodeJS.ProcessEnv = process.env): PostgresConnectionOptions {
  const config = getDatabaseConfig(env);

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: env.TYPEORM_LOGGING === 'true',
    entities: [],
    migrations: ['src/database/migrations/*.ts'],
  };
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 5432;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid POSTGRES_PORT: ${value}`);
  }

  return port;
}
