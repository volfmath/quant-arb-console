# 执行引擎设计（Execution Engine）

本文件定义 execution-engine 的核心职责、下单策略、状态机和异常处理。

---

## 1. 职责边界

| 负责                                | 不负责                            |
|-------------------------------------|-----------------------------------|
| 接收任务消息，执行下单              | 发现套利机会（opportunity-engine） |
| 管理订单状态机                      | 风控规则判定（risk-engine）        |
| 监控成交回报                        | 收益计算与归因（pnl-service）      |
| 维护 orders / fills / positions 表  | 前端 API 聚合（admin-console-api） |
| 平仓执行                            | 告警推送（alert-service）          |
| 异常补偿（腿失败回滚）              |                                   |

---

## 2. 消息接口

### 2.1 输入消息（从消息队列消费）

```json
// 任务创建
{
  "type": "task:execute",
  "task_id": "uuid",
  "action": "open",
  "params": {
    "unified_symbol": "BTC/USDT:USDT",
    "long_exchange": "okx",
    "short_exchange": "bybit",
    "long_account_id": "uuid",
    "short_account_id": "uuid",
    "long_instrument_id": "uuid",
    "short_instrument_id": "uuid",
    "leverage": 3,
    "target_position_size": 200.0,
    "order_type": "limit"
  }
}

// 平仓
{
  "type": "task:execute",
  "task_id": "uuid",
  "action": "close",
  "reason": "user_stop"
}
```

### 2.2 输出事件（发布到消息队列）

| 事件                    | 消费者           | 说明                |
|------------------------|-----------------|---------------------|
| `task:status_changed`  | admin-console-api| 状态变更通知        |
| `order:executed`       | pnl-service     | 订单成交通知        |
| `position:updated`     | risk-engine     | 持仓变更通知        |
| `task:anomaly`         | alert-service   | 执行异常告警        |

---

## 3. 下单策略

### 3.1 策略选择

MVP 默认使用**顺序下单策略（Sequential）**：

| 策略       | 流程                                   | 优点             | 缺点              |
|-----------|----------------------------------------|------------------|--------------------|
| Sequential| 先主腿 → 等成交 → 再对冲腿             | 简单，风险可控    | 延迟较大，可能滑点  |
| Parallel  | 两腿同时下单 → 失败补偿                | 速度快           | 单腿失败处理复杂    |

### 3.2 顺序下单流程（Sequential）

```text
Step 1: 预检
  ├── 查询两个交易所账户余额
  ├── 查询两个合约最新盘口
  ├── 计算实际下单数量（根据合约精度和最小下单量取整）
  ├── 预估滑点
  └── 任一预检失败 → 任务 failed

Step 2: 设置杠杆
  ├── 调用交易所 API 设置两个账户的杠杆倍数
  └── 失败 → 重试 1 次 → 仍失败 → 任务 failed

Step 3: 主腿下单（做多方）
  ├── 构建限价单（价格 = best_ask * (1 + slippage_tolerance)）
  ├── 提交订单 → 更新 orders 表（status: submitted）
  ├── 等待成交（超时 30 秒）
  ├── 成交 → 更新 orders / fills / positions
  └── 未成交 → 取消订单 → 重试 1 次（市价单）→ 仍失败 → 任务 failed

Step 4: 对冲腿下单（做空方）
  ├── 构建限价单（价格 = best_bid * (1 - slippage_tolerance)）
  ├── 提交订单 → 更新 orders 表
  ├── 等待成交（超时 30 秒）
  ├── 成交 → 更新 orders / fills / positions
  └── 未成交 → 取消 → 重试 1 次（市价单）→ 仍失败 → 回滚主腿 → 任务 failed

Step 5: 确认双腿持仓
  ├── 查询两个交易所的实际持仓
  ├── 校验数量是否匹配
  ├── 匹配 → 更新 arbitrage_tasks（status: running）
  └── 不匹配 → 触发差额补单或告警
```

### 3.3 下单参数计算

```text
// 下单数量计算
raw_qty = target_position_size * leverage / mark_price
adjusted_qty = floor(raw_qty / min_qty) * min_qty    -- 按最小下单量取整

// 限价单价格计算
long_price  = best_ask * (1 + slippage_tolerance)    -- 做多方：略高于卖一
short_price = best_bid * (1 - slippage_tolerance)    -- 做空方：略低于买一
slippage_tolerance = 0.001  -- 默认 0.1%

// 合约张数计算（部分交易所按张）
contract_count = floor(adjusted_qty / contract_size)
```

---

## 4. 订单状态机

```text
                          ┌──────────┐
                          │ pending  │  ← 订单创建，未提交
                          └────┬─────┘
                               │ 提交到交易所
                          ┌────▼─────┐
                          │submitted │  ← 已提交，等待撮合
                          └────┬─────┘
                   ┌───────────┼───────────┐
                   │           │           │
            ┌──────▼────┐ ┌───▼──────┐ ┌──▼──────┐
            │partial_   │ │ filled   │ │canceled │
            │filled     │ │          │ │         │
            └─────┬─────┘ └──────────┘ └─────────┘
                  │
            ┌─────▼─────┐
            │  filled    │  ← 最终全部成交
            └────────────┘

            submitted → expired  （超时未成交）
            submitted → failed   （交易所返回错误）
```

### 4.1 状态转换规则

| 当前状态        | 目标状态       | 触发条件                         |
|----------------|---------------|----------------------------------|
| pending        | submitted     | 成功提交到交易所                  |
| pending        | failed        | 提交失败（网络/参数错误）         |
| submitted      | partial_filled| 部分成交回报                      |
| submitted      | filled        | 全部成交                         |
| submitted      | canceled      | 用户取消 or 超时取消              |
| submitted      | expired       | 超过有效期                       |
| submitted      | failed        | 交易所返回错误                    |
| partial_filled | filled        | 剩余部分成交                      |
| partial_filled | canceled      | 用户取消剩余部分                  |

---

## 5. 平仓执行

### 5.1 平仓触发源

| 来源           | 消息                                       |
|---------------|-------------------------------------------|
| 用户手动停止   | `{ action: "close", reason: "user_stop" }`|
| 策略自动平仓   | `{ action: "close", reason: "strategy" }` |
| 风控熔断       | `{ action: "close", reason: "risk_break" }`|

### 5.2 平仓流程

```text
1. 任务状态 running → closing
2. 并发对两条腿发送平仓市价单
   ├── 做多方：market sell（平多）
   └── 做空方：market buy（平空）
3. 等待两边成交（超时 60 秒）
4. 全部成交：
   ├── 更新 positions（is_open = false, closed_at）
   ├── 更新 orders / fills
   ├── 计算最终收益
   ├── 任务状态 closing → completed
   └── 发布 task:status_changed
5. 部分失败：
   ├── 重试 2 次
   ├── 仍失败 → 告警 + 人工介入
   └── 任务保持 closing 状态
```

---

## 6. 异常补偿

### 6.1 主腿成交、对冲腿失败

这是最危险的场景——只有一条腿有仓位，形成单边敞口。

```text
处理流程：
1. 立即取消对冲腿未成交订单
2. 等待 5 秒后重试对冲腿（市价单）
3. 重试成功 → 正常继续
4. 重试失败 →
   a. 立即反向平仓主腿（市价单）
   b. 计算损失，记录到 realized_pnl
   c. 任务状态 → failed
   d. 发布 task:anomaly 告警
   e. 写入 audit_logs
```

### 6.2 成交数量不匹配

```text
两腿成交数量差异 > 1%：
1. 计算差额
2. 对少的一方补单（限价 → 市价）
3. 补单成功 → 继续
4. 补单失败 → 告警 + 记录偏差
```

### 6.3 交易所 API 中断

```text
执行中检测到 API 不可用：
1. 暂停当前任务
2. 每 30 秒检查 API 恢复
3. 恢复后：
   a. 查询实际持仓与本地记录对账
   b. 一致 → 恢复任务
   c. 不一致 → 告警 + 人工确认后恢复
4. 超过 10 分钟未恢复 → 告警升级
```

---

## 7. 成交回报处理

```text
交易所成交回调 / 轮询：
1. 收到 fill 数据
2. 写入 fills 表
3. 更新 orders 表（filled_qty, avg_fill_price, status）
4. 更新 positions 表（qty, avg_entry_price, margin）
5. 更新 arbitrage_tasks 表（long_qty, short_qty, trading_fee）
6. 发布 order:executed 事件 → pnl-service 处理
7. 发布 position:updated 事件 → risk-engine 处理
```

---

## 8. 并发控制

| 约束                          | 措施                                |
|------------------------------|-------------------------------------|
| 同一任务不可并发执行           | 分布式锁（Redis SETNX，key=task_id）|
| 同一账户同时最多 N 个活跃任务  | 数据库计数校验                      |
| 订单操作幂等                   | exchange_order_id 唯一约束          |
| 成交回报去重                   | exchange_trade_id 唯一约束          |

---

## 9. 监控指标

| 指标                     | 说明                         | 告警阈值      |
|-------------------------|------------------------------|--------------|
| order_submit_latency    | 订单提交延迟                  | > 5s         |
| order_fill_rate         | 订单成交率                   | < 90%        |
| leg_mismatch_count      | 双腿不匹配次数               | > 0          |
| compensation_count      | 异常补偿执行次数             | > 0          |
| position_reconcile_diff | 持仓对账差异                 | > 0          |
| api_error_rate          | 交易所 API 错误率            | > 5%         |
