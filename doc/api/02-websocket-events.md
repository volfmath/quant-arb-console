# WebSocket 实时事件（WebSocket Events）

本文件定义前后端之间的 WebSocket 事件协议。

---

## 1. 连接约定

### 1.1 连接地址

```
ws://{API_HOST}/ws?token={JWT}
```

### 1.2 认证

- 连接时通过 query string 传递 JWT
- Token 无效或过期时服务端发送 `auth:error` 事件后断开
- 连接成功后服务端发送 `connection:established` 事件

### 1.3 心跳

```json
// 客户端每 30 秒发送
{ "type": "ping", "ts": 1714050000000 }

// 服务端回复
{ "type": "pong", "ts": 1714050000100 }
```

- 客户端超过 10 秒未收到 pong 视为断连，触发重连
- 重连策略：1s → 2s → 4s → 8s → 16s → 30s 指数退避

### 1.4 消息格式

所有事件统一格式：

```json
{
  "type": "event_name",
  "data": { ... },
  "ts": 1714050000000
}
```

---

## 2. 事件清单

### 2.1 连接事件

| 事件类型                 | 方向        | 说明                   |
|-------------------------|-------------|------------------------|
| `connection:established`| S → C       | 连接成功               |
| `auth:error`            | S → C       | 认证失败               |
| `ping`                  | C → S       | 心跳请求               |
| `pong`                  | S → C       | 心跳回复               |

### 2.2 套利机会事件

| 事件类型                 | 方向  | 说明                           |
|-------------------------|-------|-------------------------------|
| `opportunity:update`    | S → C | 机会列表数据更新（增量/全量）   |
| `opportunity:new`       | S → C | 新机会发现                     |
| `opportunity:expired`   | S → C | 机会过期（已结算）              |

### 2.3 任务事件

| 事件类型                 | 方向  | 说明                           |
|-------------------------|-------|-------------------------------|
| `task:status_change`    | S → C | 任务状态变更                    |
| `task:pnl_update`       | S → C | 任务收益更新                    |
| `task:position_update`  | S → C | 任务持仓变化                    |

### 2.4 订单事件

| 事件类型                 | 方向  | 说明                           |
|-------------------------|-------|-------------------------------|
| `order:update`          | S → C | 订单状态更新（提交/成交/取消）  |
| `order:fill`            | S → C | 新成交回报                     |

### 2.5 告警事件

| 事件类型                 | 方向  | 说明                           |
|-------------------------|-------|-------------------------------|
| `alert:new`             | S → C | 新告警产生                     |
| `alert:resolved`        | S → C | 告警已解决                     |

### 2.6 行情事件

| 事件类型                 | 方向  | 说明                           |
|-------------------------|-------|-------------------------------|
| `funding_rate:update`   | S → C | 资金费率更新                    |
| `ticker:update`         | S → C | 行情价格更新                    |

### 2.7 系统事件

| 事件类型                    | 方向  | 说明                          |
|---------------------------|-------|-------------------------------|
| `system:exchange_status`  | S → C | 交易所 API 连接状态变化        |
| `system:service_status`   | S → C | 后端服务健康状态变化            |
| `pnl:snapshot`            | S → C | 全局收益快照更新（Dashboard）   |

---

## 3. 事件数据结构

### 3.1 opportunity:update

```json
{
  "type": "opportunity:update",
  "data": {
    "id": "uuid",
    "unified_symbol": "BTC/USDT:USDT",
    "long_exchange": "gate",
    "short_exchange": "bybit",
    "rate_spread": 0.000432,
    "spread_8h_pct": 0.0432,
    "annualized_return": 15.78,
    "feasibility_score": 85,
    "settlement_countdown": "02:10:15"
  },
  "ts": 1714050000000
}
```

### 3.2 task:status_change

```json
{
  "type": "task:status_change",
  "data": {
    "task_id": "uuid",
    "task_number": 11,
    "previous_status": "confirming",
    "new_status": "running",
    "reason": "All legs filled successfully",
    "updated_at": "2026-04-25T14:00:00Z"
  },
  "ts": 1714050000000
}
```

### 3.3 task:pnl_update

```json
{
  "type": "task:pnl_update",
  "data": {
    "task_id": "uuid",
    "task_number": 11,
    "realized_pnl": 0.5766,
    "unrealized_pnl": 0,
    "funding_income": 0.6200,
    "trading_fee": 0.0434,
    "net_pnl": 0.5766,
    "estimated_daily_pnl": 0.5766,
    "return_rate": 0.0029
  },
  "ts": 1714050000000
}
```

### 3.4 order:update

```json
{
  "type": "order:update",
  "data": {
    "order_id": "uuid",
    "task_id": "uuid",
    "exchange_order_id": "1234567890",
    "status": "filled",
    "filled_qty": 207,
    "avg_fill_price": 67500.50,
    "fee": 0.0217,
    "filled_at": "2026-04-25T14:00:01Z"
  },
  "ts": 1714050000000
}
```

### 3.5 alert:new

```json
{
  "type": "alert:new",
  "data": {
    "alert_id": "uuid",
    "severity": "high",
    "title": "杠杆超限告警",
    "message": "OKX 账户杠杆使用率已达 85%，超过阈值 80%",
    "source": "risk_engine",
    "context": {
      "exchange": "okx",
      "account_id": "uuid",
      "current_value": 85,
      "threshold": 80
    },
    "created_at": "2026-04-25T14:00:00Z"
  },
  "ts": 1714050000000
}
```

### 3.6 system:exchange_status

```json
{
  "type": "system:exchange_status",
  "data": {
    "exchange": "okx",
    "status": "degraded",
    "latency_ms": 1500,
    "message": "API response time elevated"
  },
  "ts": 1714050000000
}
```

### 3.7 pnl:snapshot

```json
{
  "type": "pnl:snapshot",
  "data": {
    "total_equity": 1245678.32,
    "today_pnl": 12345.67,
    "today_pnl_pct": 1.00,
    "active_strategies": 12,
    "active_alerts": 2,
    "risk_level": "low"
  },
  "ts": 1714050000000
}
```

---

## 4. 订阅与频道

### 4.1 默认订阅

连接成功后，客户端自动接收以下全局事件：
- `alert:new` / `alert:resolved`
- `system:exchange_status` / `system:service_status`
- `pnl:snapshot`

### 4.2 按页面订阅

客户端进入特定页面时发送订阅请求，离开时取消：

```json
// 订阅
{ "type": "subscribe", "channel": "opportunities", "params": { "symbols": ["BTC", "ETH"] } }

// 取消订阅
{ "type": "unsubscribe", "channel": "opportunities" }
```

| 频道             | 推送的事件                                      | 对应页面      |
|-----------------|------------------------------------------------|--------------|
| `opportunities` | `opportunity:update/new/expired`               | 套利机会页    |
| `tasks`         | `task:status_change/pnl_update/position_update`| 任务页        |
| `orders`        | `order:update/fill`                            | 订单页/任务详情|
| `funding_rates` | `funding_rate:update`                          | 机会详情面板  |
| `tickers`       | `ticker:update`                                | 行情相关页面  |

### 4.3 推送频率控制

| 事件类型              | 最大推送频率      | 节流策略              |
|----------------------|------------------|-----------------------|
| `opportunity:update` | 每 5 秒          | 合并同一 symbol 的更新 |
| `task:pnl_update`    | 每 10 秒         | 合并同一 task 的更新   |
| `ticker:update`      | 每 1 秒          | 只推最新值             |
| `alert:new`          | 无限制（即时）    | —                     |
| `pnl:snapshot`       | 每 30 秒         | 全量替换               |
