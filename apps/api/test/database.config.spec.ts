import { describe, expect, it } from 'vitest';
import { getDatabaseConfig, getTypeOrmOptions } from '../src/config/database.config';

describe('database config', () => {
  it('uses safe local defaults', () => {
    expect(getDatabaseConfig({})).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'quant_arb_console',
      username: 'quant_arb',
      password: 'quant_arb',
      ssl: false,
    });
  });

  it('parses postgres environment variables', () => {
    const options = getTypeOrmOptions({
      POSTGRES_HOST: 'db.internal',
      POSTGRES_PORT: '6543',
      POSTGRES_DB: 'arb',
      POSTGRES_USER: 'app',
      POSTGRES_PASSWORD: 'secret',
      POSTGRES_SSL: 'true',
      TYPEORM_LOGGING: 'true',
    });

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.internal',
      port: 6543,
      database: 'arb',
      username: 'app',
      password: 'secret',
      logging: true,
      synchronize: false,
    });
    expect(options.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('rejects invalid postgres ports', () => {
    expect(() => getDatabaseConfig({ POSTGRES_PORT: 'abc' })).toThrow('Invalid POSTGRES_PORT');
    expect(() => getDatabaseConfig({ POSTGRES_PORT: '70000' })).toThrow('Invalid POSTGRES_PORT');
  });
});

