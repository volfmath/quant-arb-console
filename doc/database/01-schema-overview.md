# 数据库设计总览（Schema Overview）

本文件定义 Quant Arb Console 的 PostgreSQL 数据库整体设计原则、表分类和关系总览。

---

## 1. 设计原则

1. **机会与任务分离**：`arbitrage_opportunities`（发现层快照）与 `arbitrage_tasks`（执行层实体）严格分表，支持统计"发现→执行→兑现"转化率
2. **订单/仓位/收益三层解耦**：订单层关心指令和成交，仓位层按账户+合约聚合，收益层基于仓位与成交生成快照
3. **收益必须分层**：预估收益、已实现收益、未实现收益、手续费成本、净收益都有独立字段
4. **全操作可审计**：关键业务操作写入 `audit_logs`
5. **统一标识**：所有交易所合约统一到 `unified_symbol`（如 `BTC/USDT:USDT`）
6. **软删除**：业务数据不物理删除，使用 `deleted_at` 字段标记
7. **时区统一**：所有时间字段使用 `TIMESTAMPTZ`（UTC 存储）

---

## 2. 表分类

### 2.1 基础配置层

| 表名                  | 说明                     | 写入频率   |
|-----------------------|--------------------------|-----------|
| `exchanges`           | 交易所定义               | 极低（配置）|
| `exchange_accounts`   | 交易所账户（含 API Key） | 低        |
| `instruments`         | 合约/交易对标准化信息     | 低（定期同步）|

### 2.2 行情数据层

| 表名                  | 说明                     | 写入频率   |
|-----------------------|--------------------------|-----------|
| `funding_rates`       | 资金费率历史归档          | 高（每8h每合约）|
| `ticker_snapshots`    | 标记价格/盘口快照         | 高        |

### 2.3 套利业务层

| 表名                      | 说明                     | 写入频率   |
|---------------------------|--------------------------|-----------|
| `arbitrage_opportunities` | 套利机会快照              | 高（实时扫描）|
| `arbitrage_tasks`         | 套利任务（执行实体）      | 中        |
| `orders`                  | 委托订单                 | 中        |
| `fills`                   | 成交回报                 | 中        |
| `positions`               | 持仓记录                 | 中        |

### 2.4 资产与收益层

| 表名                  | 说明                     | 写入频率   |
|-----------------------|--------------------------|-----------|
| `account_balances`    | 账户余额快照              | 中（定时同步）|
| `pnl_snapshots`       | 收益快照（按任务/策略/账户）| 中（定时计算）|

### 2.5 策略与风控层

| 表名                  | 说明                     | 写入频率   |
|-----------------------|--------------------------|-----------|
| `strategies`          | 策略模板与实例            | 低        |
| `risk_rules`          | 风控规则                 | 低        |
| `alerts`              | 告警记录                 | 中        |

### 2.6 系统层

| 表名                  | 说明                     | 写入频率   |
|-----------------------|--------------------------|-----------|
| `users`               | 用户                     | 极低      |
| `audit_logs`          | 审计日志                 | 中        |

---

## 3. 核心关系图

```text
exchanges ──1:N──→ exchange_accounts ──1:N──→ orders
    │                    │                       │
    │                    │                       ├──→ fills
    │                    │                       │
    │                    └──1:N──→ positions      │
    │                    └──1:N──→ account_balances
    │
    └──1:N──→ instruments ──1:N──→ funding_rates
                  │
                  └──→ arbitrage_opportunities
                           │
                           └──0:1──→ arbitrage_tasks ──1:N──→ orders
                                          │
                                          ├──→ pnl_snapshots
                                          │
                                          └──→ strategies (FK)

risk_rules ──→ alerts
users ──→ audit_logs
strategies ──1:N──→ arbitrage_tasks
```

---

## 4. 通用字段约定

所有表都包含以下公共字段：

```sql
id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

支持软删除的表额外包含：

```sql
deleted_at    TIMESTAMPTZ DEFAULT NULL
```

---

## 5. 枚举类型定义

```sql
-- 任务状态
CREATE TYPE task_status AS ENUM (
  'pending', 'confirming', 'running', 'paused', 'closing', 'completed', 'canceled', 'failed'
);

-- 订单状态
CREATE TYPE order_status AS ENUM (
  'pending', 'submitted', 'partial_filled', 'filled', 'canceled', 'failed', 'expired'
);

-- 订单方向
CREATE TYPE order_side AS ENUM ('buy', 'sell');

-- 持仓方向
CREATE TYPE position_side AS ENUM ('long', 'short');

-- 告警级别
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- 告警状态
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');

-- 风控动作
CREATE TYPE risk_action AS ENUM ('alert', 'block_new_task', 'circuit_break');

-- 用户角色
CREATE TYPE user_role AS ENUM ('super_admin', 'trader', 'risk_manager', 'viewer');

-- 用户状态
CREATE TYPE user_status AS ENUM ('active', 'disabled');

-- 策略状态
CREATE TYPE strategy_status AS ENUM ('draft', 'running', 'paused', 'stopped');

-- 交易所标识
CREATE TYPE exchange_code AS ENUM ('binance', 'bybit', 'okx', 'gate', 'mexc');
```

---

## 6. 索引策略

| 场景                     | 索引类型        | 示例                                          |
|-------------------------|-----------------|-----------------------------------------------|
| 主键查询                 | B-Tree (PK)     | `id`                                          |
| 唯一约束                 | Unique          | `(exchange, symbol)` on instruments           |
| 状态筛选 + 时间排序      | B-Tree 复合     | `(status, created_at DESC)` on tasks          |
| 交易所 + 币种筛选        | B-Tree 复合     | `(exchange, unified_symbol)` on funding_rates |
| 时间范围查询             | B-Tree          | `(created_at)` or `(settlement_time)`         |
| 全文搜索（审计日志）     | GIN             | `(details)` on audit_logs                     |
| 软删除过滤               | Partial         | `WHERE deleted_at IS NULL`                    |

---

## 7. 分区策略（大表）

| 表名                      | 分区方式         | 分区键          | 说明                    |
|---------------------------|-----------------|-----------------|------------------------|
| `funding_rates`           | RANGE by month  | `settlement_time`| 按结算时间月度分区      |
| `arbitrage_opportunities` | RANGE by month  | `discovered_at`  | 按发现时间月度分区      |
| `ticker_snapshots`        | RANGE by month  | `captured_at`    | 按采集时间月度分区      |
| `audit_logs`              | RANGE by month  | `created_at`     | 按创建时间月度分区      |
| `fills`                   | RANGE by month  | `filled_at`      | 按成交时间月度分区      |
