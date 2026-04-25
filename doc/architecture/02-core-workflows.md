# 核心业务流程（Core Workflows）

本文件定义从"发现机会"到"收益结算"的完整业务流程和各服务间的协作关系。

---

## 1. 全局业务流程总览

```text
[交易所 API]
     │
     ▼
┌──────────────────┐    ┌──────────────────┐
│ market-data-     │───▶│ funding-rate-    │
│ service          │    │ service          │
│ (行情采集)       │    │ (费率采集归档)   │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │ opportunity-engine   │
                    │ (机会发现 & 评分)    │
                    └────────┬─────────────┘
                             │ 写入 arbitrage_opportunities
                             │ WebSocket 推送前端
                             ▼
                    ┌──────────────────────┐
                    │ 用户决策             │
                    │ (前端确认创建任务)   │
                    └────────┬─────────────┘
                             │ POST /api/v1/tasks
                             ▼
                    ┌──────────────────────┐
                    │ risk-engine          │
                    │ (开仓前风控校验)     │◀── 不通过 → 返回错误，任务不创建
                    └────────┬─────────────┘
                             │ 通过
                             ▼
                    ┌──────────────────────┐
                    │ execution-engine     │
                    │ (下单 & 对冲执行)    │
                    └────────┬─────────────┘
                             │
                    ┌────────┴─────────────┐
                    │                      │
                    ▼                      ▼
            ┌──────────────┐     ┌──────────────┐
            │ 交易所 A     │     │ 交易所 B     │
            │ (做多方下单)  │     │ (做空方下单)  │
            └──────┬───────┘     └──────┬───────┘
                   │                    │
                   ▼                    ▼
            ┌──────────────────────────────────┐
            │ 成交回报 → orders / fills /      │
            │ positions 更新                   │
            └────────┬─────────────────────────┘
                     │
                     ▼
            ┌──────────────────┐    ┌──────────────────┐
            │ pnl-service      │    │ risk-engine       │
            │ (收益计算 & 快照) │    │ (持仓中风控监控)  │
            └──────────────────┘    └──────────────────┘
                     │                       │
                     ▼                       ▼
            ┌──────────────────┐    ┌──────────────────┐
            │ 前端 Dashboard   │    │ alert-service     │
            │ (收益展示)       │    │ (告警推送)        │
            └──────────────────┘    └──────────────────┘
```

---

## 2. 流程一：机会发现

### 2.1 流程步骤

```text
1. funding-rate-service 定时（每 5-10 秒）拉取各交易所资金费率
2. 写入 funding_rates 表（历史归档）
3. 写入 Redis 缓存（最新费率快照）
4. opportunity-engine 定时（每 5-10 秒）触发扫描：
   a. 从 Redis 获取所有交易所的最新资金费率
   b. 按 unified_symbol 聚合同一币种在不同交易所的费率
   c. 对每个 symbol，找出费率最高和最低的交易所对
   d. 计算 rate_spread = short_rate - long_rate
   e. 过滤 spread > 最小阈值的机会
   f. 计算预估收益（8h / 24h / 年化）
   g. 综合盘口深度、手续费、滑点评估 feasibility_score
   h. 写入 arbitrage_opportunities 表
   i. 通过 WebSocket 推送 opportunity:update 事件
```

### 2.2 机会评分公式

```text
feasibility_score = w1 * spread_score
                  + w2 * depth_score
                  + w3 * fee_score
                  + w4 * volatility_score
                  + w5 * api_health_score

其中：
  spread_score    = normalize(rate_spread, 0, 0.001)     -- 费率差越大越好
  depth_score     = normalize(min(bid_depth, ask_depth), 0, target_size) -- 盘口深度
  fee_score       = normalize(1 - total_fee_rate, 0.99, 1.0) -- 手续费越低越好
  volatility_score = normalize(1 - price_volatility, 0, 1) -- 波动率越低越好
  api_health_score = 1 if both healthy, 0.5 if one degraded, 0 if any down

  权重建议: w1=35, w2=25, w3=15, w4=15, w5=10
```

### 2.3 预估收益计算

```text
estimated_pnl_8h = position_size * rate_spread * leverage
                 - position_size * (maker_fee_long + maker_fee_short) * 2  -- 开仓+平仓手续费
                 - estimated_slippage

annualized_return = (estimated_pnl_8h / position_size) * 3 * 365 * 100  -- 每天3次结算
```

---

## 3. 流程二：任务创建

### 3.1 流程步骤

```text
1. 用户在前端点击"添加套利" → 填写参数 → POST /api/v1/tasks
2. admin-console-api 参数校验：
   a. opportunity_id 有效且未过期
   b. 账户存在且 API 健康
   c. target_position_size 在合理范围
   d. leverage ≤ 策略/系统最大杠杆
3. 调用 risk-engine 风控校验（详见流程三）
4. 风控通过 → 写入 arbitrage_tasks 表（status = pending）
5. 写入 audit_logs（action = task:create）
6. 发送消息到 execution-engine 队列
7. 推送 task:status_change（pending）给前端
```

### 3.2 参数校验规则

| 参数                  | 校验规则                                    |
|----------------------|---------------------------------------------|
| target_position_size | > 0, ≤ 策略 max_position_size, ≤ 账户可用余额 |
| leverage             | ≥ 1, ≤ min(合约最大杠杆, 策略最大杠杆)       |
| long_account_id      | 账户 status=active, API 健康                 |
| short_account_id     | 同上，且不能与 long 相同交易所+相同账户       |

---

## 4. 流程三：风控校验

### 4.1 开仓前校验（前置风控）

```text
风控校验触发点：任务创建请求到达时

校验项（全部通过才允许创建）：
├── 1. 账户资金检查
│     └── 可用余额 ≥ target_position_size / leverage * 1.1（留 10% 缓冲）
├── 2. 杠杆检查
│     └── 新任务加入后，账户总杠杆 ≤ 风控规则阈值
├── 3. 净敞口检查
│     └── 新任务加入后，同一 symbol 的净敞口 ≤ 阈值
├── 4. 单所集中度检查
│     └── 单一交易所的仓位占总仓位比例 ≤ 阈值（如 60%）
├── 5. API 健康检查
│     └── 两个交易所的 API 最近 5 分钟无连续失败
└── 6. 熔断状态检查
      └── 当前无全局熔断生效
```

### 4.2 持仓中监控（运行时风控）

```text
risk-engine 定时扫描（每 30 秒）：

├── 扫描所有 running 状态任务
├── 检查每个账户的实时杠杆 / 敞口 / 集中度
├── 检查未实现亏损是否超过止损线
├── 检查交易所 API 健康状态
│
├── 触发规则：
│   ├── alert → 写入 alerts 表 + WebSocket 推送
│   ├── block_new_task → 阻断新任务创建
│   └── circuit_break → 暂停所有 running 任务 + 禁止新任务
│
└── 风控降级后，需人工确认才能恢复
```

---

## 5. 流程四：下单执行

详见 `backend/02-execution-engine.md`，此处为简要概述：

```text
1. execution-engine 收到任务消息（status: pending → confirming）
2. 预检：再次校验账户余额、API 连接
3. 下单策略：
   a. 先主腿（做多方）→ 等成交 → 再对冲腿（做空方）
   b. 或并发下单 + 失败补偿
4. 监控成交回报，更新 orders / fills
5. 全部成交 → 更新 positions → 任务状态 → running
6. 部分失败 → 尝试重试 → 仍失败 → 取消已成交腿 → 任务 → failed
```

---

## 6. 流程五：持仓期间

```text
任务 status = running 期间：

每 8 小时（资金费率结算时）：
├── funding-rate-service 拉取结算后实际费率
├── pnl-service 计算本期资金费收入：
│     funding_income += position_size * actual_rate * leverage
├── 更新 arbitrage_tasks 的收益字段
├── 写入 pnl_snapshots
└── WebSocket 推送 task:pnl_update

持续监控：
├── 标记价格变化 → 更新 unrealized_pnl
├── risk-engine 扫描 → 检查风险指标
└── 异常 → 触发告警或自动平仓
```

---

## 7. 流程六：平仓与结算

### 7.1 触发条件

| 触发方式     | 说明                                     |
|-------------|------------------------------------------|
| 手动停止     | 用户点击"停止" → PUT /tasks/:id/stop     |
| 策略平仓     | 收益达到目标 or 费率差反转 → 自动触发     |
| 风控平仓     | 风控熔断 → 强制平仓                       |

### 7.2 平仓流程

```text
1. 任务状态 running → closing
2. execution-engine 对两条腿同时发送平仓单
3. 监控平仓成交
4. 全部平仓完成：
   a. 更新 positions（is_open = false）
   b. 计算最终收益：
        realized_pnl = funding_income + trading_pnl - total_fees
        net_pnl = realized_pnl
        return_rate = net_pnl / target_position_size
   c. 更新 arbitrage_tasks（status → completed, closed_at）
   d. 写入 pnl_snapshots（最终快照）
   e. 写入 audit_logs
   f. WebSocket 推送 task:status_change（completed）
```

---

## 8. 流程七：异常处理

| 异常场景                | 处理方式                                           |
|------------------------|---------------------------------------------------|
| 下单超时               | 重试 2 次 → 仍失败 → 取消 → 任务 failed            |
| 主腿成交、对冲腿失败    | 立即反向平仓主腿 → 任务 failed + 告警              |
| 交易所 API 断连         | 暂停任务 → 等待恢复 → 自动恢复或人工干预            |
| 标记价格剧烈波动         | risk-engine 告警 → 超阈值则自动平仓                 |
| 强平风险               | 检测到 liquidation_price 逼近 → 告警 → 提前平仓     |
| 资金费率方向反转         | pnl-service 检测到连续亏损 → 告警 → 建议平仓        |

---

## 9. 数据流向汇总

```text
交易所 → market-data-service → Redis → opportunity-engine → DB (opportunities)
                             → funding-rate-service → DB (funding_rates)

用户 → admin-console-api → risk-engine → execution-engine → 交易所
                                                          → DB (tasks/orders/fills/positions)

execution-engine → pnl-service → DB (pnl_snapshots) → WebSocket → 前端
risk-engine → alert-service → DB (alerts) → WebSocket → 前端
所有变更操作 → audit_logs
```
