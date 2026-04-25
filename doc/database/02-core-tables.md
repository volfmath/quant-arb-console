# 核心表详细字段（Core Tables）

本文件定义每张核心表的完整字段、类型、约束和索引。SQL 示例基于 PostgreSQL 15+。

---

## 1. 基础配置层

### 1.1 exchanges（交易所）

```sql
CREATE TABLE exchanges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            exchange_code NOT NULL UNIQUE,       -- binance, bybit, okx, gate, mexc
  name            VARCHAR(50) NOT NULL,                -- 显示名称
  api_base_url    VARCHAR(255) NOT NULL,               -- REST API 基础 URL
  ws_base_url     VARCHAR(255) NOT NULL,               -- WebSocket 基础 URL
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active / maintenance / disabled
  maker_fee_rate  DECIMAL(10,6) NOT NULL DEFAULT 0,    -- 默认 Maker 手续费率
  taker_fee_rate  DECIMAL(10,6) NOT NULL DEFAULT 0,    -- 默认 Taker 手续费率
  config          JSONB DEFAULT '{}',                   -- 交易所特有配置
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1.2 exchange_accounts（交易所账户）

```sql
CREATE TABLE exchange_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id     UUID NOT NULL REFERENCES exchanges(id),
  account_name    VARCHAR(100) NOT NULL,               -- 自定义账户名称
  api_key         VARCHAR(255) NOT NULL,                -- API Key（加密存储）
  api_secret      TEXT NOT NULL,                        -- API Secret（加密存储）
  passphrase      TEXT,                                 -- 部分交易所需要（如 OKX）
  is_testnet      BOOLEAN NOT NULL DEFAULT FALSE,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active / disabled / error
  last_health_check TIMESTAMPTZ,                        -- 最后 API 健康检查时间
  permissions     JSONB DEFAULT '["read","trade"]',     -- API 权限标记
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  UNIQUE (exchange_id, account_name)
);

CREATE INDEX idx_exchange_accounts_exchange ON exchange_accounts(exchange_id) WHERE deleted_at IS NULL;
```

### 1.3 instruments（合约/交易对）

```sql
CREATE TABLE instruments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id     UUID NOT NULL REFERENCES exchanges(id),
  exchange_symbol VARCHAR(100) NOT NULL,                -- 交易所原始 symbol（如 BTCUSDT）
  unified_symbol  VARCHAR(100) NOT NULL,                -- 统一标识（如 BTC/USDT:USDT）
  base_currency   VARCHAR(20) NOT NULL,                 -- 基础币种（如 BTC）
  quote_currency  VARCHAR(20) NOT NULL,                 -- 计价币种（如 USDT）
  contract_type   VARCHAR(20) NOT NULL DEFAULT 'perpetual', -- perpetual / quarterly / monthly
  contract_size   DECIMAL(20,8) DEFAULT 1,              -- 合约面值
  price_precision INT NOT NULL,                         -- 价格精度（小数位数）
  qty_precision   INT NOT NULL,                         -- 数量精度
  min_qty         DECIMAL(20,8) NOT NULL,               -- 最小下单量
  max_leverage    INT DEFAULT 125,                      -- 最大杠杆
  status          VARCHAR(20) NOT NULL DEFAULT 'trading', -- trading / suspended / delisted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (exchange_id, exchange_symbol)
);

CREATE INDEX idx_instruments_unified ON instruments(unified_symbol);
CREATE INDEX idx_instruments_base ON instruments(base_currency);
```

---

## 2. 行情数据层

### 2.1 funding_rates（资金费率）

```sql
CREATE TABLE funding_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id     UUID NOT NULL REFERENCES exchanges(id),
  instrument_id   UUID NOT NULL REFERENCES instruments(id),
  unified_symbol  VARCHAR(100) NOT NULL,
  funding_rate    DECIMAL(16,8) NOT NULL,               -- 资金费率（如 0.0001 = 0.01%）
  mark_price      DECIMAL(20,8),                        -- 标记价格
  settlement_time TIMESTAMPTZ NOT NULL,                 -- 结算时间
  next_settlement TIMESTAMPTZ,                          -- 下次结算时间
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (settlement_time);

CREATE INDEX idx_funding_rates_lookup
  ON funding_rates(unified_symbol, exchange_id, settlement_time DESC);
CREATE INDEX idx_funding_rates_settlement
  ON funding_rates(settlement_time DESC);
```

### 2.2 ticker_snapshots（行情快照）

```sql
CREATE TABLE ticker_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id     UUID NOT NULL REFERENCES exchanges(id),
  instrument_id   UUID NOT NULL REFERENCES instruments(id),
  unified_symbol  VARCHAR(100) NOT NULL,
  mark_price      DECIMAL(20,8) NOT NULL,
  index_price     DECIMAL(20,8),
  best_bid        DECIMAL(20,8),
  best_ask        DECIMAL(20,8),
  bid_size        DECIMAL(20,8),
  ask_size        DECIMAL(20,8),
  volume_24h      DECIMAL(30,8),
  open_interest   DECIMAL(30,8),
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (captured_at);

CREATE INDEX idx_ticker_lookup
  ON ticker_snapshots(unified_symbol, exchange_id, captured_at DESC);
```

---

## 3. 套利业务层

### 3.1 arbitrage_opportunities（套利机会）

```sql
CREATE TABLE arbitrage_opportunities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_symbol      VARCHAR(100) NOT NULL,             -- 币种（如 BTC/USDT:USDT）
  long_exchange_id    UUID NOT NULL REFERENCES exchanges(id),  -- 做多方交易所
  short_exchange_id   UUID NOT NULL REFERENCES exchanges(id),  -- 做空方交易所
  long_instrument_id  UUID NOT NULL REFERENCES instruments(id),
  short_instrument_id UUID NOT NULL REFERENCES instruments(id),
  long_funding_rate   DECIMAL(16,8) NOT NULL,            -- 做多方资金费率
  short_funding_rate  DECIMAL(16,8) NOT NULL,            -- 做空方资金费率
  rate_spread         DECIMAL(16,8) NOT NULL,            -- 费率差 = short - long
  estimated_pnl_8h    DECIMAL(20,8),                     -- 预估 8h 收益 (USDT)
  annualized_return   DECIMAL(10,4),                     -- 年化收益率
  feasibility_score   INT CHECK (feasibility_score BETWEEN 0 AND 100), -- 可执行性评分
  long_depth_score    INT,                               -- 做多方盘口深度评分
  short_depth_score   INT,                               -- 做空方盘口深度评分
  settlement_time     TIMESTAMPTZ NOT NULL,              -- 下次结算时间
  is_positive         BOOLEAN NOT NULL DEFAULT TRUE,     -- 是否正套利
  discovered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at          TIMESTAMPTZ,                       -- 过期时间（下次结算后）
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (discovered_at);

CREATE INDEX idx_opp_symbol_spread
  ON arbitrage_opportunities(unified_symbol, rate_spread DESC, discovered_at DESC);
CREATE INDEX idx_opp_active
  ON arbitrage_opportunities(discovered_at DESC) WHERE expired_at IS NULL;
```

### 3.2 arbitrage_tasks（套利任务）

```sql
CREATE TABLE arbitrage_tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number         SERIAL,                            -- 自增编号（如 #11）
  opportunity_id      UUID REFERENCES arbitrage_opportunities(id), -- 来源机会（可选）
  strategy_id         UUID REFERENCES strategies(id),     -- 关联策略
  unified_symbol      VARCHAR(100) NOT NULL,
  long_exchange_id    UUID NOT NULL REFERENCES exchanges(id),
  short_exchange_id   UUID NOT NULL REFERENCES exchanges(id),
  long_account_id     UUID NOT NULL REFERENCES exchange_accounts(id),
  short_account_id    UUID NOT NULL REFERENCES exchange_accounts(id),
  long_instrument_id  UUID NOT NULL REFERENCES instruments(id),
  short_instrument_id UUID NOT NULL REFERENCES instruments(id),

  -- 任务参数
  leverage            INT NOT NULL DEFAULT 3,            -- 杠杆倍数
  target_position_size DECIMAL(20,8) NOT NULL,           -- 目标仓位 (USDT)
  actual_position_size DECIMAL(20,8) DEFAULT 0,          -- 实际持仓 (USDT)
  margin_used         DECIMAL(20,8) DEFAULT 0,           -- 已用保证金 (USDT)

  -- 状态
  status              task_status NOT NULL DEFAULT 'pending',
  status_reason       TEXT,                              -- 状态变更原因

  -- 费率快照（创建时刻）
  entry_funding_rate  DECIMAL(16,8),                     -- 入场时费率差
  entry_annualized    DECIMAL(10,4),                     -- 入场时年化

  -- 交易数量
  long_qty            DECIMAL(20,8) DEFAULT 0,           -- 多方持仓张数/数量
  short_qty           DECIMAL(20,8) DEFAULT 0,           -- 空方持仓张数/数量

  -- 收益
  estimated_daily_pnl DECIMAL(20,8) DEFAULT 0,           -- 预估日收益
  realized_pnl        DECIMAL(20,8) DEFAULT 0,           -- 已实现收益
  unrealized_pnl      DECIMAL(20,8) DEFAULT 0,           -- 未实现收益
  funding_income      DECIMAL(20,8) DEFAULT 0,           -- 累计资金费收入
  trading_fee         DECIMAL(20,8) DEFAULT 0,           -- 累计交易手续费
  net_pnl             DECIMAL(20,8) DEFAULT 0,           -- 净收益 = realized + unrealized - fee
  return_rate         DECIMAL(10,6) DEFAULT 0,           -- 收益率

  -- 时间
  confirmed_at        TIMESTAMPTZ,                       -- 确认执行时间
  started_at          TIMESTAMPTZ,                       -- 开始执行时间
  closed_at           TIMESTAMPTZ,                       -- 关闭时间
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_tasks_status ON arbitrage_tasks(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_strategy ON arbitrage_tasks(strategy_id, status);
CREATE INDEX idx_tasks_symbol ON arbitrage_tasks(unified_symbol, status);
```

### 3.3 orders（委托订单）

```sql
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL REFERENCES arbitrage_tasks(id),
  exchange_id         UUID NOT NULL REFERENCES exchanges(id),
  account_id          UUID NOT NULL REFERENCES exchange_accounts(id),
  instrument_id       UUID NOT NULL REFERENCES instruments(id),
  exchange_order_id   VARCHAR(100),                      -- 交易所侧订单 ID
  unified_symbol      VARCHAR(100) NOT NULL,

  side                order_side NOT NULL,                -- buy / sell
  position_side       position_side NOT NULL,             -- long / short
  order_type          VARCHAR(20) NOT NULL DEFAULT 'limit', -- limit / market
  price               DECIMAL(20,8),                     -- 委托价格
  qty                 DECIMAL(20,8) NOT NULL,            -- 委托数量
  filled_qty          DECIMAL(20,8) DEFAULT 0,           -- 已成交数量
  avg_fill_price      DECIMAL(20,8),                     -- 均成交价
  status              order_status NOT NULL DEFAULT 'pending',
  fee                 DECIMAL(20,8) DEFAULT 0,           -- 手续费
  fee_currency        VARCHAR(20),                       -- 手续费币种
  leg                 VARCHAR(10) NOT NULL,               -- 'long' or 'short'（标记是任务的哪条腿）
  is_close            BOOLEAN NOT NULL DEFAULT FALSE,    -- 是否平仓单
  error_message       TEXT,

  submitted_at        TIMESTAMPTZ,
  filled_at           TIMESTAMPTZ,
  canceled_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_task ON orders(task_id, created_at DESC);
CREATE INDEX idx_orders_exchange ON orders(exchange_id, exchange_order_id);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
```

### 3.4 fills（成交回报）

```sql
CREATE TABLE fills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),
  task_id             UUID NOT NULL REFERENCES arbitrage_tasks(id),
  exchange_id         UUID NOT NULL REFERENCES exchanges(id),
  exchange_trade_id   VARCHAR(100),                      -- 交易所侧成交 ID
  price               DECIMAL(20,8) NOT NULL,            -- 成交价
  qty                 DECIMAL(20,8) NOT NULL,            -- 成交量
  fee                 DECIMAL(20,8) DEFAULT 0,           -- 手续费
  fee_currency        VARCHAR(20),
  side                order_side NOT NULL,
  filled_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (filled_at);

CREATE INDEX idx_fills_order ON fills(order_id);
CREATE INDEX idx_fills_task ON fills(task_id, filled_at DESC);
```

### 3.5 positions（持仓记录）

```sql
CREATE TABLE positions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID REFERENCES arbitrage_tasks(id),
  exchange_id         UUID NOT NULL REFERENCES exchanges(id),
  account_id          UUID NOT NULL REFERENCES exchange_accounts(id),
  instrument_id       UUID NOT NULL REFERENCES instruments(id),
  unified_symbol      VARCHAR(100) NOT NULL,

  side                position_side NOT NULL,             -- long / short
  qty                 DECIMAL(20,8) NOT NULL DEFAULT 0,  -- 持仓数量
  avg_entry_price     DECIMAL(20,8),                     -- 均入场价
  mark_price          DECIMAL(20,8),                     -- 最新标记价
  leverage            INT NOT NULL DEFAULT 1,
  margin              DECIMAL(20,8) DEFAULT 0,           -- 保证金
  unrealized_pnl      DECIMAL(20,8) DEFAULT 0,
  liquidation_price   DECIMAL(20,8),                     -- 强平价
  is_open             BOOLEAN NOT NULL DEFAULT TRUE,

  opened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_positions_open
  ON positions(account_id, unified_symbol) WHERE is_open = TRUE;
CREATE INDEX idx_positions_task ON positions(task_id);
```

---

## 4. 资产与收益层

### 4.1 account_balances（账户余额快照）

```sql
CREATE TABLE account_balances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES exchange_accounts(id),
  exchange_id         UUID NOT NULL REFERENCES exchanges(id),
  currency            VARCHAR(20) NOT NULL,              -- USDT, BTC, ETH ...
  total_balance       DECIMAL(30,8) NOT NULL,            -- 总余额
  available_balance   DECIMAL(30,8) NOT NULL,            -- 可用余额
  frozen_balance      DECIMAL(30,8) DEFAULT 0,           -- 冻结余额
  equity              DECIMAL(30,8),                     -- 权益（含浮动盈亏）
  usdt_value          DECIMAL(30,8),                     -- USDT 估值
  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_balances_account
  ON account_balances(account_id, snapshot_at DESC);
```

### 4.2 pnl_snapshots（收益快照）

```sql
CREATE TABLE pnl_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension           VARCHAR(20) NOT NULL,              -- 'task' / 'strategy' / 'account' / 'total'
  dimension_id        UUID,                              -- 对应维度的 ID（task_id / strategy_id / account_id）

  -- 收益明细
  realized_pnl        DECIMAL(20,8) DEFAULT 0,           -- 已实现收益
  unrealized_pnl      DECIMAL(20,8) DEFAULT 0,           -- 未实现收益
  funding_income      DECIMAL(20,8) DEFAULT 0,           -- 资金费收入
  trading_pnl         DECIMAL(20,8) DEFAULT 0,           -- 交易收益
  fee_cost            DECIMAL(20,8) DEFAULT 0,           -- 手续费支出
  net_pnl             DECIMAL(20,8) DEFAULT 0,           -- 净收益
  total_equity        DECIMAL(30,8) DEFAULT 0,           -- 总权益
  total_equity_cny    DECIMAL(30,8) DEFAULT 0,           -- 总权益 CNY 估值

  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pnl_dimension
  ON pnl_snapshots(dimension, dimension_id, snapshot_at DESC);
CREATE INDEX idx_pnl_total
  ON pnl_snapshots(snapshot_at DESC) WHERE dimension = 'total';
```

---

## 5. 策略与风控层

### 5.1 strategies（策略）

```sql
CREATE TABLE strategies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,             -- 策略名称（如 "资金费套利_BTC"）
  type                VARCHAR(50) NOT NULL DEFAULT 'funding_rate_arb', -- 策略类型
  status              strategy_status NOT NULL DEFAULT 'draft',

  -- 参数
  min_spread_threshold DECIMAL(16,8),                    -- 最小费率差阈值
  max_leverage         INT DEFAULT 3,                    -- 最大杠杆
  max_position_size    DECIMAL(20,8),                    -- 单任务最大仓位(USDT)
  allowed_exchanges    JSONB DEFAULT '[]',               -- 允许的交易所列表
  allowed_symbols      JSONB DEFAULT '[]',               -- 允许的币种列表
  params               JSONB DEFAULT '{}',               -- 其他自定义参数

  -- 运行统计
  total_tasks          INT DEFAULT 0,
  active_tasks         INT DEFAULT 0,
  win_count            INT DEFAULT 0,
  loss_count           INT DEFAULT 0,
  total_pnl            DECIMAL(20,8) DEFAULT 0,
  max_drawdown         DECIMAL(10,6) DEFAULT 0,

  started_at           TIMESTAMPTZ,                      -- 首次启动时间
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX idx_strategies_status ON strategies(status) WHERE deleted_at IS NULL;
```

### 5.2 risk_rules（风控规则）

```sql
CREATE TABLE risk_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,             -- 规则名称
  type                VARCHAR(50) NOT NULL,              -- leverage / exposure / concentration / api_health
  scope               VARCHAR(20) NOT NULL DEFAULT 'global', -- global / exchange / account
  scope_id            UUID,                              -- 指定 exchange_id 或 account_id
  threshold           DECIMAL(20,8) NOT NULL,            -- 阈值
  threshold_unit      VARCHAR(20),                       -- 单位（如 'x', '%', 'USDT'）
  action              risk_action NOT NULL DEFAULT 'alert',
  enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_rules_enabled ON risk_rules(type, enabled) WHERE enabled = TRUE;
```

### 5.3 alerts（告警）

```sql
CREATE TABLE alerts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id             UUID REFERENCES risk_rules(id),    -- 触发的风控规则（可选）
  source              VARCHAR(50) NOT NULL,              -- risk_engine / execution_engine / system
  severity            alert_severity NOT NULL,
  status              alert_status NOT NULL DEFAULT 'active',
  title               VARCHAR(200) NOT NULL,
  message             TEXT NOT NULL,
  context             JSONB DEFAULT '{}',                -- 告警上下文（交易所、账户、任务等）
  acknowledged_by     UUID REFERENCES users(id),
  acknowledged_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_active
  ON alerts(severity, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_alerts_source ON alerts(source, created_at DESC);
```

---

## 6. 系统层

### 6.1 users（用户）

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username            VARCHAR(50) NOT NULL UNIQUE,
  email               VARCHAR(100) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  role                user_role NOT NULL DEFAULT 'viewer',
  status              user_status NOT NULL DEFAULT 'active',
  display_name        VARCHAR(100),
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.2 audit_logs（审计日志）

```sql
CREATE TABLE audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  action              VARCHAR(100) NOT NULL,             -- 如 'task:create', 'risk_rule:update'
  resource_type       VARCHAR(50) NOT NULL,              -- 如 'arbitrage_task', 'risk_rule'
  resource_id         UUID,
  before_state        JSONB,                             -- 变更前状态
  after_state         JSONB,                             -- 变更后状态
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
```
