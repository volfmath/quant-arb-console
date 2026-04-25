# REST API 设计（REST API）

本文件定义 admin-console-api（BFF）对前端暴露的 REST 接口。

---

## 1. 通用约定

### 1.1 基础路径

```
Base URL: /api/v1
```

### 1.2 认证

所有接口（除 `/auth/login`）需携带 JWT：

```
Authorization: Bearer <token>
```

### 1.3 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

错误响应：

```json
{
  "code": 40001,
  "message": "Insufficient permissions",
  "data": null
}
```

### 1.4 分页约定

```
GET /api/v1/tasks?page=1&size=20&sort=created_at&order=desc
```

分页响应：

```json
{
  "code": 0,
  "data": {
    "items": [ ... ],
    "total": 156,
    "page": 1,
    "size": 20,
    "pages": 8
  }
}
```

### 1.5 错误码体系

| 区间          | 模块         |
|--------------|-------------|
| 40001–40099  | 认证/权限    |
| 40101–40199  | 参数校验     |
| 40201–40299  | 交易所       |
| 40301–40399  | 套利任务     |
| 40401–40499  | 风控         |
| 50001–50099  | 系统内部错误 |

---

## 2. 认证模块

| 方法   | 路径              | 权限     | 说明             |
|--------|-------------------|----------|------------------|
| POST   | `/auth/login`     | 公开     | 登录，返回 JWT    |
| POST   | `/auth/logout`    | 登录用户 | 登出              |
| GET    | `/auth/me`        | 登录用户 | 获取当前用户信息  |
| PUT    | `/auth/password`  | 登录用户 | 修改密码          |

### POST /auth/login

```json
// Request
{ "username": "admin", "password": "***" }

// Response
{
  "token": "eyJ...",
  "expires_at": "2026-04-26T14:00:00Z",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "super_admin",
    "permissions": ["dashboard:view", "task:create", ...]
  }
}
```

---

## 3. Dashboard 模块

| 方法 | 路径                               | 权限             | 说明                   |
|------|------------------------------------|------------------|------------------------|
| GET  | `/dashboard/asset-summary`         | `dashboard:view` | 资产总览 KPI            |
| GET  | `/dashboard/asset-distribution`    | `dashboard:view` | 资产分布（环形图数据）  |
| GET  | `/dashboard/asset-trend`           | `dashboard:view` | 资产走势（折线图）      |
| GET  | `/dashboard/pnl-analysis`          | `dashboard:view` | 收益分析（多折线图）    |
| GET  | `/dashboard/strategy-summary`      | `dashboard:view` | 策略运行概览 KPI        |
| GET  | `/dashboard/risk-summary`          | `dashboard:view` | 风控概览                |

### GET /dashboard/asset-summary

```json
{
  "total_equity": 1245678.32,
  "total_equity_cny": 8916549.72,
  "today_pnl": 12345.67,
  "today_pnl_pct": 1.00,
  "total_pnl": 245678.32,
  "total_pnl_pct": 24.53,
  "available_balance": 245678.32,
  "available_pct": 19.74
}
```

### GET /dashboard/asset-trend

```
Query: ?range=1d|7d|30d|90d|custom&start=2026-04-01&end=2026-04-25
```

```json
{
  "points": [
    { "time": "2026-04-25T00:00:00Z", "equity": 1200000.00 },
    { "time": "2026-04-25T01:00:00Z", "equity": 1205000.00 },
    ...
  ]
}
```

### GET /dashboard/pnl-analysis

```
Query: ?range=1d|7d|30d|90d
```

```json
{
  "summary": {
    "total_pnl": 12345.67,
    "strategy_pnl": 11234.56,
    "trading_pnl": 9876.54,
    "funding_pnl": 1358.02,
    "other_pnl": 1111.11
  },
  "points": [
    {
      "time": "2026-04-25T00:00:00Z",
      "total": 100, "strategy": 80, "trading": 70, "funding": 15, "other": 5
    },
    ...
  ]
}
```

### GET /dashboard/risk-summary

```json
{
  "risk_level": "low",
  "risk_distribution": { "low": 8, "medium": 3, "high": 1 },
  "risk_exposure": 568942.32,
  "leverage_usage_pct": 38.45,
  "active_alerts": 2
}
```

---

## 4. 套利机会模块

| 方法 | 路径                                    | 权限               | 说明                 |
|------|-----------------------------------------|--------------------|----------------------|
| GET  | `/opportunities`                        | `opportunity:view` | 机会列表（分页+筛选） |
| GET  | `/opportunities/summary`                | `opportunity:view` | 机会页 KPI 汇总       |
| GET  | `/opportunities/:id`                    | `opportunity:view` | 机会详情              |
| GET  | `/opportunities/:id/rate-trend`         | `opportunity:view` | 费率趋势（24h 图表）  |
| GET  | `/opportunities/:id/exchange-rates`     | `opportunity:view` | 各交易所费率排名      |

### GET /opportunities

```
Query: ?page=1&size=10&symbol=BTC&exchange=gate&min_spread=0.0001
       &positive_only=true&sort=rate_spread&order=desc&type=funding_rate
```

```json
{
  "items": [
    {
      "id": "uuid",
      "rank": 1,
      "unified_symbol": "BTC/USDT:USDT",
      "symbol_display": "BTC",
      "long_exchange": "gate",
      "short_exchange": "bybit",
      "long_funding_rate": -0.000131,
      "short_funding_rate": 0.000301,
      "rate_spread": 0.000432,
      "spread_8h_pct": 0.0432,
      "annualized_return": 15.78,
      "feasibility_score": 85,
      "settlement_time": "2026-04-25T16:00:00Z",
      "settlement_countdown": "02:12:34",
      "persistence_24h": [0.03, 0.035, 0.04, 0.038, ...],
      "discovered_at": "2026-04-25T13:47:00Z"
    },
    ...
  ],
  "total": 28,
  "page": 1,
  "size": 10
}
```

### GET /opportunities/summary

```json
{
  "best_opportunity": {
    "spread_pct": 0.0432,
    "symbol": "BTC",
    "long_exchange": "gate",
    "short_exchange": "bybit"
  },
  "total_count": 28,
  "avg_spread_8h": 0.0187,
  "max_spread_8h": {
    "value": 0.0432,
    "symbol": "BTC",
    "long_exchange": "gate",
    "short_exchange": "bybit"
  },
  "monitored_symbols": 120,
  "monitored_exchanges": 12,
  "next_settlement": "2026-04-25T16:00:00Z",
  "next_settlement_countdown": "02:12:34"
}
```

### GET /opportunities/:id/exchange-rates

```json
{
  "symbol": "BTC/USDT:USDT",
  "period": "8h",
  "rates": [
    { "exchange": "gate", "funding_rate": 0.000301, "rank": 1 },
    { "exchange": "binance", "funding_rate": 0.000085, "rank": 2 },
    { "exchange": "okx", "funding_rate": 0.000032, "rank": 3 },
    { "exchange": "bybit", "funding_rate": -0.000131, "rank": 4 },
    { "exchange": "mexc", "funding_rate": -0.000158, "rank": 5 }
  ]
}
```

---

## 5. 套利任务模块

| 方法   | 路径                        | 权限            | 说明               |
|--------|-----------------------------|-----------------|--------------------|
| GET    | `/tasks`                    | `task:view`     | 任务列表（卡片数据）|
| GET    | `/tasks/summary`            | `task:view`     | 任务页 KPI 汇总     |
| GET    | `/tasks/:id`                | `task:view`     | 任务详情            |
| POST   | `/tasks`                    | `task:create`   | 创建套利任务        |
| PUT    | `/tasks/:id/pause`          | `task:pause`    | 暂停任务            |
| PUT    | `/tasks/:id/resume`         | `task:pause`    | 恢复任务            |
| PUT    | `/tasks/:id/stop`           | `task:stop`     | 停止任务（触发平仓）|
| GET    | `/tasks/:id/orders`         | `task:view`     | 任务关联订单        |
| GET    | `/tasks/:id/positions`      | `task:view`     | 任务关联持仓        |
| GET    | `/tasks/:id/pnl`            | `task:view`     | 任务收益明细        |

### GET /tasks/summary

```json
{
  "running_count": 1,
  "total_count": 3,
  "today_completed": 2,
  "total_pnl": 2.7335,
  "total_margin": 398.7666,
  "estimated_daily_pnl": 1.1891
}
```

### GET /tasks (单条任务数据结构，供卡片渲染)

```json
{
  "items": [
    {
      "id": "uuid",
      "task_number": 11,
      "status": "running",
      "unified_symbol": "BTC/USDT:USDT",
      "long_exchange": "okx",
      "short_exchange": "bybit",
      "long_contract": "OKX",
      "short_contract": "BYBIT_FUTURE_RAVE_USDT",
      "leverage": 3,
      "funding_rate": 0.005966,
      "annualized_return": 21.78,
      "position_size": 200.0000,
      "margin_used": 199.1133,
      "long_qty": 207,
      "short_qty": 207,
      "buy_exchange": "okx",
      "sell_exchange": "bybit",
      "estimated_daily_pnl": 0.5766,
      "realized_pnl": 0.5766,
      "unrealized_pnl": 0,
      "net_pnl": 0.5766,
      "return_rate": 0.0029,
      "updated_at": "2026-04-23T11:00:00Z",
      "created_at": "2026-04-23T10:00:00Z"
    }
  ]
}
```

### POST /tasks

```json
// Request
{
  "opportunity_id": "uuid",
  "strategy_id": "uuid",
  "long_account_id": "uuid",
  "short_account_id": "uuid",
  "leverage": 3,
  "target_position_size": 200.0000
}

// Response
{
  "id": "uuid",
  "task_number": 12,
  "status": "pending"
}
```

---

## 6. 策略模块

| 方法   | 路径                          | 权限              | 说明           |
|--------|-------------------------------|--------------------|----------------|
| GET    | `/strategies`                 | `strategy:view`    | 策略列表（分页）|
| GET    | `/strategies/:id`             | `strategy:view`    | 策略详情        |
| POST   | `/strategies`                 | `strategy:edit`    | 创建策略        |
| PUT    | `/strategies/:id`             | `strategy:edit`    | 更新策略参数    |
| PUT    | `/strategies/:id/toggle`      | `strategy:toggle`  | 启停策略        |

### GET /strategies（含 Dashboard 策略表格所需字段）

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "资金费套利_BTC",
      "type": "funding_rate_arb",
      "status": "running",
      "running_duration": "12天 07:32:16",
      "today_pnl": 1234.56,
      "total_pnl": 45678.32,
      "return_rate": 15.23,
      "win_rate": 72.34,
      "max_drawdown": 3.21,
      "active_tasks": 3,
      "total_tasks": 15
    }
  ]
}
```

---

## 7. 风控模块

| 方法   | 路径                         | 权限                | 说明             |
|--------|------------------------------|---------------------|------------------|
| GET    | `/risk/overview`             | `risk:view`         | 风控概览          |
| GET    | `/risk/rules`                | `risk:view`         | 风控规则列表      |
| POST   | `/risk/rules`                | `risk:edit_rule`    | 创建风控规则      |
| PUT    | `/risk/rules/:id`            | `risk:edit_rule`    | 更新风控规则      |
| PUT    | `/risk/rules/:id/toggle`     | `risk:edit_rule`    | 启停风控规则      |
| GET    | `/risk/accounts`             | `risk:view`         | 按账户风险明细    |
| POST   | `/risk/circuit-break`        | `risk:circuit_break`| 手动触发熔断      |

---

## 8. 告警模块

| 方法   | 路径                         | 权限                 | 说明           |
|--------|------------------------------|----------------------|----------------|
| GET    | `/alerts`                    | `alert:view`         | 告警列表（分页）|
| GET    | `/alerts/unread-count`       | `alert:view`         | 未读告警数      |
| PUT    | `/alerts/:id/acknowledge`    | `alert:acknowledge`  | 确认告警        |
| PUT    | `/alerts/:id/dismiss`        | `alert:dismiss`      | 忽略告警        |

---

## 9. 分析模块

| 方法 | 路径                              | 权限             | 说明                |
|------|-----------------------------------|------------------|---------------------|
| GET  | `/analytics/pnl/summary`          | `analytics:view` | 收益汇总 KPI         |
| GET  | `/analytics/pnl/trend`            | `analytics:view` | 收益趋势（折线图）   |
| GET  | `/analytics/pnl/by-strategy`      | `analytics:view` | 按策略收益（柱状图） |
| GET  | `/analytics/pnl/by-exchange`      | `analytics:view` | 按交易所收益（饼图） |
| GET  | `/analytics/pnl/details`          | `analytics:view` | 收益明细表格         |
| GET  | `/analytics/pnl/export`           | `analytics:export`| 导出 CSV            |

---

## 10. 系统设置模块

| 方法   | 路径                           | 权限               | 说明               |
|--------|--------------------------------|--------------------|--------------------|
| GET    | `/exchanges`                   | `exchange:manage`  | 交易所列表          |
| POST   | `/exchanges`                   | `exchange:manage`  | 添加交易所          |
| GET    | `/accounts`                    | `account:manage`   | 账户列表            |
| POST   | `/accounts`                    | `account:manage`   | 添加账户            |
| DELETE | `/accounts/:id`                | `account:manage`   | 删除账户（软删除）  |
| GET    | `/users`                       | `user:manage`      | 用户列表            |
| POST   | `/users`                       | `user:manage`      | 创建用户            |
| PUT    | `/users/:id`                   | `user:manage`      | 更新用户            |
| PUT    | `/users/:id/role`              | `user:assign_role` | 分配角色            |
| GET    | `/audit-logs`                  | `audit:view`       | 审计日志（分页）    |
| GET    | `/system/status`               | `dashboard:view`   | 系统状态            |

### GET /system/status

```json
{
  "api_connection": "normal",
  "trading_service": "normal",
  "strategy_service": "normal",
  "version": "v2.3.1",
  "updated_at": "2026-04-25T15:47:26Z"
}
```
