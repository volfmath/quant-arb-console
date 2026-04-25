import type { MigrationInterface, QueryRunner } from 'typeorm';

const createEnumSql = [
  "CREATE TYPE task_status AS ENUM ('pending', 'confirming', 'running', 'paused', 'closing', 'completed', 'canceled', 'failed')",
  "CREATE TYPE order_status AS ENUM ('pending', 'submitted', 'partial_filled', 'filled', 'canceled', 'failed', 'expired')",
  "CREATE TYPE order_side AS ENUM ('buy', 'sell')",
  "CREATE TYPE position_side AS ENUM ('long', 'short')",
  "CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical')",
  "CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed')",
  "CREATE TYPE risk_action AS ENUM ('alert', 'block_new_task', 'circuit_break')",
  "CREATE TYPE user_role AS ENUM ('super_admin', 'trader', 'risk_manager', 'viewer')",
  "CREATE TYPE user_status AS ENUM ('active', 'disabled')",
  "CREATE TYPE strategy_status AS ENUM ('draft', 'running', 'paused', 'stopped')",
  "CREATE TYPE exchange_code AS ENUM ('binance', 'bybit', 'okx', 'gate', 'mexc')",
];

const dropEnumSql = [
  'DROP TYPE IF EXISTS exchange_code',
  'DROP TYPE IF EXISTS strategy_status',
  'DROP TYPE IF EXISTS user_status',
  'DROP TYPE IF EXISTS user_role',
  'DROP TYPE IF EXISTS risk_action',
  'DROP TYPE IF EXISTS alert_status',
  'DROP TYPE IF EXISTS alert_severity',
  'DROP TYPE IF EXISTS position_side',
  'DROP TYPE IF EXISTS order_side',
  'DROP TYPE IF EXISTS order_status',
  'DROP TYPE IF EXISTS task_status',
];

export class InitialCoreSchema20260425000100 implements MigrationInterface {
  name = 'InitialCoreSchema20260425000100';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    for (const sql of createEnumSql) {
      await queryRunner.query(sql);
    }

    await queryRunner.query(`
      CREATE TABLE exchanges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code exchange_code NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        api_base_url VARCHAR(255) NOT NULL,
        ws_base_url VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        maker_fee_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
        taker_fee_rate DECIMAL(10,6) NOT NULL DEFAULT 0,
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'viewer',
        status user_status NOT NULL DEFAULT 'active',
        display_name VARCHAR(100),
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        module VARCHAR(50) NOT NULL,
        description TEXT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role user_role NOT NULL,
        permission_code VARCHAR(100) NOT NULL REFERENCES permissions(code),
        PRIMARY KEY (role, permission_code)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE instruments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        exchange_symbol VARCHAR(100) NOT NULL,
        unified_symbol VARCHAR(100) NOT NULL,
        base_currency VARCHAR(20) NOT NULL,
        quote_currency VARCHAR(20) NOT NULL,
        contract_type VARCHAR(20) NOT NULL DEFAULT 'perpetual',
        contract_size DECIMAL(20,8) DEFAULT 1,
        price_precision INT NOT NULL,
        qty_precision INT NOT NULL,
        min_qty DECIMAL(20,8) NOT NULL,
        max_leverage INT DEFAULT 125,
        status VARCHAR(20) NOT NULL DEFAULT 'trading',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (exchange_id, exchange_symbol)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE exchange_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        account_name VARCHAR(100) NOT NULL,
        api_key VARCHAR(255) NOT NULL,
        api_secret TEXT NOT NULL,
        passphrase TEXT,
        is_testnet BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        last_health_check TIMESTAMPTZ,
        permissions JSONB DEFAULT '["read","trade"]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ,
        UNIQUE (exchange_id, account_name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE strategies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'funding_rate_arb',
        status strategy_status NOT NULL DEFAULT 'draft',
        min_spread_threshold DECIMAL(16,8),
        max_leverage INT DEFAULT 3,
        max_position_size DECIMAL(20,8),
        allowed_exchanges JSONB DEFAULT '[]',
        allowed_symbols JSONB DEFAULT '[]',
        params JSONB DEFAULT '{}',
        total_tasks INT DEFAULT 0,
        active_tasks INT DEFAULT 0,
        win_count INT DEFAULT 0,
        loss_count INT DEFAULT 0,
        total_pnl DECIMAL(20,8) DEFAULT 0,
        max_drawdown DECIMAL(10,6) DEFAULT 0,
        started_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE risk_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        scope VARCHAR(20) NOT NULL DEFAULT 'global',
        scope_id UUID,
        threshold DECIMAL(20,8) NOT NULL,
        threshold_unit VARCHAR(20),
        action risk_action NOT NULL DEFAULT 'alert',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE funding_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        instrument_id UUID NOT NULL REFERENCES instruments(id),
        unified_symbol VARCHAR(100) NOT NULL,
        funding_rate DECIMAL(16,8) NOT NULL,
        mark_price DECIMAL(20,8),
        settlement_time TIMESTAMPTZ NOT NULL,
        next_settlement TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ticker_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        instrument_id UUID NOT NULL REFERENCES instruments(id),
        unified_symbol VARCHAR(100) NOT NULL,
        mark_price DECIMAL(20,8) NOT NULL,
        index_price DECIMAL(20,8),
        best_bid DECIMAL(20,8),
        best_ask DECIMAL(20,8),
        bid_size DECIMAL(20,8),
        ask_size DECIMAL(20,8),
        volume_24h DECIMAL(30,8),
        open_interest DECIMAL(30,8),
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE arbitrage_opportunities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unified_symbol VARCHAR(100) NOT NULL,
        long_exchange_id UUID NOT NULL REFERENCES exchanges(id),
        short_exchange_id UUID NOT NULL REFERENCES exchanges(id),
        long_instrument_id UUID NOT NULL REFERENCES instruments(id),
        short_instrument_id UUID NOT NULL REFERENCES instruments(id),
        long_funding_rate DECIMAL(16,8) NOT NULL,
        short_funding_rate DECIMAL(16,8) NOT NULL,
        rate_spread DECIMAL(16,8) NOT NULL,
        estimated_pnl_8h DECIMAL(20,8),
        annualized_return DECIMAL(10,4),
        feasibility_score INT CHECK (feasibility_score BETWEEN 0 AND 100),
        long_depth_score INT,
        short_depth_score INT,
        settlement_time TIMESTAMPTZ NOT NULL,
        is_positive BOOLEAN NOT NULL DEFAULT TRUE,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expired_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE arbitrage_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_number SERIAL,
        opportunity_id UUID REFERENCES arbitrage_opportunities(id),
        strategy_id UUID REFERENCES strategies(id),
        unified_symbol VARCHAR(100) NOT NULL,
        long_exchange_id UUID NOT NULL REFERENCES exchanges(id),
        short_exchange_id UUID NOT NULL REFERENCES exchanges(id),
        long_account_id UUID NOT NULL REFERENCES exchange_accounts(id),
        short_account_id UUID NOT NULL REFERENCES exchange_accounts(id),
        long_instrument_id UUID NOT NULL REFERENCES instruments(id),
        short_instrument_id UUID NOT NULL REFERENCES instruments(id),
        leverage INT NOT NULL DEFAULT 3,
        target_position_size DECIMAL(20,8) NOT NULL,
        actual_position_size DECIMAL(20,8) DEFAULT 0,
        margin_used DECIMAL(20,8) DEFAULT 0,
        status task_status NOT NULL DEFAULT 'pending',
        status_reason TEXT,
        entry_funding_rate DECIMAL(16,8),
        entry_annualized DECIMAL(10,4),
        long_qty DECIMAL(20,8) DEFAULT 0,
        short_qty DECIMAL(20,8) DEFAULT 0,
        estimated_daily_pnl DECIMAL(20,8) DEFAULT 0,
        realized_pnl DECIMAL(20,8) DEFAULT 0,
        unrealized_pnl DECIMAL(20,8) DEFAULT 0,
        funding_income DECIMAL(20,8) DEFAULT 0,
        trading_fee DECIMAL(20,8) DEFAULT 0,
        net_pnl DECIMAL(20,8) DEFAULT 0,
        return_rate DECIMAL(10,6) DEFAULT 0,
        confirmed_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES arbitrage_tasks(id),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        account_id UUID NOT NULL REFERENCES exchange_accounts(id),
        instrument_id UUID NOT NULL REFERENCES instruments(id),
        exchange_order_id VARCHAR(100),
        unified_symbol VARCHAR(100) NOT NULL,
        side order_side NOT NULL,
        position_side position_side NOT NULL,
        order_type VARCHAR(20) NOT NULL DEFAULT 'limit',
        price DECIMAL(20,8),
        qty DECIMAL(20,8) NOT NULL,
        filled_qty DECIMAL(20,8) DEFAULT 0,
        avg_fill_price DECIMAL(20,8),
        status order_status NOT NULL DEFAULT 'pending',
        fee DECIMAL(20,8) DEFAULT 0,
        fee_currency VARCHAR(20),
        leg VARCHAR(10) NOT NULL,
        is_close BOOLEAN NOT NULL DEFAULT FALSE,
        error_message TEXT,
        submitted_at TIMESTAMPTZ,
        filled_at TIMESTAMPTZ,
        canceled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE fills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id),
        task_id UUID NOT NULL REFERENCES arbitrage_tasks(id),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        exchange_trade_id VARCHAR(100),
        price DECIMAL(20,8) NOT NULL,
        qty DECIMAL(20,8) NOT NULL,
        fee DECIMAL(20,8) DEFAULT 0,
        fee_currency VARCHAR(20),
        side order_side NOT NULL,
        filled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES arbitrage_tasks(id),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        account_id UUID NOT NULL REFERENCES exchange_accounts(id),
        instrument_id UUID NOT NULL REFERENCES instruments(id),
        unified_symbol VARCHAR(100) NOT NULL,
        side position_side NOT NULL,
        qty DECIMAL(20,8) NOT NULL DEFAULT 0,
        avg_entry_price DECIMAL(20,8),
        mark_price DECIMAL(20,8),
        leverage INT NOT NULL DEFAULT 1,
        margin DECIMAL(20,8) DEFAULT 0,
        unrealized_pnl DECIMAL(20,8) DEFAULT 0,
        liquidation_price DECIMAL(20,8),
        is_open BOOLEAN NOT NULL DEFAULT TRUE,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE account_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID NOT NULL REFERENCES exchange_accounts(id),
        exchange_id UUID NOT NULL REFERENCES exchanges(id),
        currency VARCHAR(20) NOT NULL,
        total_balance DECIMAL(30,8) NOT NULL,
        available_balance DECIMAL(30,8) NOT NULL,
        frozen_balance DECIMAL(30,8) DEFAULT 0,
        equity DECIMAL(30,8),
        usdt_value DECIMAL(30,8),
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE pnl_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dimension VARCHAR(20) NOT NULL,
        dimension_id UUID,
        realized_pnl DECIMAL(20,8) DEFAULT 0,
        unrealized_pnl DECIMAL(20,8) DEFAULT 0,
        funding_income DECIMAL(20,8) DEFAULT 0,
        trading_pnl DECIMAL(20,8) DEFAULT 0,
        fee_cost DECIMAL(20,8) DEFAULT 0,
        net_pnl DECIMAL(20,8) DEFAULT 0,
        total_equity DECIMAL(30,8) DEFAULT 0,
        total_equity_cny DECIMAL(30,8) DEFAULT 0,
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_id UUID REFERENCES risk_rules(id),
        source VARCHAR(50) NOT NULL,
        severity alert_severity NOT NULL,
        status alert_status NOT NULL DEFAULT 'active',
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        acknowledged_by UUID REFERENCES users(id),
        acknowledged_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        before_state JSONB,
        after_state JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.createIndexes(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS alerts');
    await queryRunner.query('DROP TABLE IF EXISTS pnl_snapshots');
    await queryRunner.query('DROP TABLE IF EXISTS account_balances');
    await queryRunner.query('DROP TABLE IF EXISTS positions');
    await queryRunner.query('DROP TABLE IF EXISTS fills');
    await queryRunner.query('DROP TABLE IF EXISTS orders');
    await queryRunner.query('DROP TABLE IF EXISTS arbitrage_tasks');
    await queryRunner.query('DROP TABLE IF EXISTS arbitrage_opportunities');
    await queryRunner.query('DROP TABLE IF EXISTS ticker_snapshots');
    await queryRunner.query('DROP TABLE IF EXISTS funding_rates');
    await queryRunner.query('DROP TABLE IF EXISTS risk_rules');
    await queryRunner.query('DROP TABLE IF EXISTS strategies');
    await queryRunner.query('DROP TABLE IF EXISTS exchange_accounts');
    await queryRunner.query('DROP TABLE IF EXISTS instruments');
    await queryRunner.query('DROP TABLE IF EXISTS role_permissions');
    await queryRunner.query('DROP TABLE IF EXISTS permissions');
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS exchanges');

    for (const sql of dropEnumSql) {
      await queryRunner.query(sql);
    }
  }

  private async createIndexes(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'CREATE INDEX idx_exchange_accounts_exchange ON exchange_accounts(exchange_id) WHERE deleted_at IS NULL',
      'CREATE INDEX idx_instruments_unified ON instruments(unified_symbol)',
      'CREATE INDEX idx_instruments_base ON instruments(base_currency)',
      'CREATE INDEX idx_funding_rates_lookup ON funding_rates(unified_symbol, exchange_id, settlement_time DESC)',
      'CREATE INDEX idx_funding_rates_settlement ON funding_rates(settlement_time DESC)',
      'CREATE INDEX idx_ticker_lookup ON ticker_snapshots(unified_symbol, exchange_id, captured_at DESC)',
      'CREATE INDEX idx_opp_symbol_spread ON arbitrage_opportunities(unified_symbol, rate_spread DESC, discovered_at DESC)',
      'CREATE INDEX idx_opp_active ON arbitrage_opportunities(discovered_at DESC) WHERE expired_at IS NULL',
      'CREATE INDEX idx_tasks_status ON arbitrage_tasks(status, created_at DESC) WHERE deleted_at IS NULL',
      'CREATE INDEX idx_tasks_strategy ON arbitrage_tasks(strategy_id, status)',
      'CREATE INDEX idx_tasks_symbol ON arbitrage_tasks(unified_symbol, status)',
      'CREATE INDEX idx_orders_task ON orders(task_id, created_at DESC)',
      'CREATE INDEX idx_orders_exchange ON orders(exchange_id, exchange_order_id)',
      'CREATE INDEX idx_orders_status ON orders(status, created_at DESC)',
      'CREATE UNIQUE INDEX idx_orders_exchange_order_unique ON orders(exchange_id, exchange_order_id) WHERE exchange_order_id IS NOT NULL',
      'CREATE INDEX idx_fills_order ON fills(order_id)',
      'CREATE INDEX idx_fills_task ON fills(task_id, filled_at DESC)',
      'CREATE UNIQUE INDEX idx_fills_exchange_trade_unique ON fills(exchange_id, exchange_trade_id) WHERE exchange_trade_id IS NOT NULL',
      'CREATE INDEX idx_positions_open ON positions(account_id, unified_symbol) WHERE is_open = TRUE',
      'CREATE INDEX idx_positions_task ON positions(task_id)',
      'CREATE INDEX idx_balances_account ON account_balances(account_id, snapshot_at DESC)',
      'CREATE INDEX idx_pnl_dimension ON pnl_snapshots(dimension, dimension_id, snapshot_at DESC)',
      "CREATE INDEX idx_pnl_total ON pnl_snapshots(snapshot_at DESC) WHERE dimension = 'total'",
      'CREATE INDEX idx_strategies_status ON strategies(status) WHERE deleted_at IS NULL',
      'CREATE INDEX idx_risk_rules_enabled ON risk_rules(type, enabled) WHERE enabled = TRUE',
      "CREATE INDEX idx_alerts_active ON alerts(severity, created_at DESC) WHERE status = 'active'",
      'CREATE INDEX idx_alerts_source ON alerts(source, created_at DESC)',
      'CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC)',
      'CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC)',
      'CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC)',
    ];

    for (const sql of indexes) {
      await queryRunner.query(sql);
    }
  }
}

