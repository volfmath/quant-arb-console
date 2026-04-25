# 系统架构（System Architecture）

本文件定义 Quant Arb Console 的整体技术架构和服务拆分，保证前后端和 Claude 在同一认知下协同工作。

---

## 1. 分层架构概览

```text
┌─────────────────────────────────────────────┐
│         展示与运营层（Frontend）            │
│  React Dashboard：Dashboard / 机会 / 任务等 │
└─────────────────────────────────────────────┘
                    │  REST / WebSocket
┌─────────────────────────────────────────────┐
│       API Gateway / BFF（admin-console-api）│
└─────────────────────────────────────────────┘
                    │  内部 RPC / 消息队列
┌─────────────────────────────────────────────┐
│             业务服务层（Services）          │
│ opportunity-engine / execution-engine /     │
│ risk-engine / strategy-service / pnl-service│
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│         数据与行情层（Data Layer）          │
│ market-data-service / funding-rate-service  │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│          交易所接入层（Exchanges）          │
│ Binance / Bybit / OKX REST & WebSocket     │
└─────────────────────────────────────────────┘
```

---

## 2. 服务拆分与职责

### 2.1 admin-console-api（API 网关 / BFF）

- 对前端暴露 REST 和 WebSocket 接口
- 负责认证鉴权（JWT）、权限校验（角色 → 权限）
- 聚合各后端服务数据，提供页面友好的接口
- 做基础的参数校验和错误处理

### 2.2 market-data-service（行情服务）

- 接入各交易所的市场数据：资金费率、标记价格、盘口深度、合约元数据
- 统一推送频率，做简单去抖动和去重
- 将最新行情写入缓存（Redis）并按间隔持久化到数据库

### 2.3 funding-rate-service（资金费率服务）

- 专门负责资金费率的拉取、归档与查询
- 提供“按统一合约 / 交易所 / 时间段”的查询接口
- 被 `opportunity-engine` 和报表模块使用

### 2.4 instrument-normalizer（合约标准化）

- 将不同交易所的 symbol 映射到统一的 `unified_symbol`（如 `BTC/USDT:USDT`）
- 定义统一的精度、最小下单量、合约大小字段
- 保证机会计算和风控引擎基于同一套标识

### 2.5 opportunity-engine（机会引擎）

- 核心任务：**发现资金费率套利机会**
- 从 `funding-rate-service` 拉取各交易所资金费率，按 `unified_symbol` 聚合
- 计算资金费率差、预估收益（8h / 24h）、年化收益率
- 考虑手续费、滑点、保证金占用，给出“可执行性评分”
- 将结果写入 `arbitrage_opportunities` 表，并通过 WebSocket 推送前端

> 注意：**只负责“发现机会”，不负责下单。**

### 2.6 execution-engine（执行引擎）

- 核心任务：**负责真实世界的下单与对冲**
- 订阅“任务创建”事件，按策略配置执行：
  - 先主腿后对冲腿，或者并发下单 + 失败补偿
- 管理订单状态机（pending → submitted → filled / canceled / failed）
- 监控成交回报，维护 `orders`、`fills`、`positions`
- 与 `risk-engine` 联动：异常时触发风控升级和熔断

### 2.7 risk-engine（风控引擎）

- 开仓前校验：账户资金、杠杆、净敞口、单所集中度、API 健康
- 持仓中监控：按账户 / 合约维度监控 PnL、杠杆、集中度
- 定期扫描生成风险告警，写入 `alerts` 表
- 提供熔断能力：当风险过高时阻断新任务创建

### 2.8 strategy-service（策略服务）

- 管理策略模板与策略实例（参数、状态、运行统计）
- 对资金费率套利策略而言，控制：
  - 最小收益阈值
  - 最大杠杆
  - 单任务最大资金占用
- 与 `execution-engine` 协作，推动任务的创建和结束

### 2.9 pnl-service（收益服务）

- 按任务 / 策略 / 账户三个维度做收益归因
- 统计预估收益 vs 实际收益偏差
- 存储 `pnl_snapshots`，提供 Dashboard 和报表的数据源

### 2.10 alert-service（告警服务）

- 管理告警规则（风控告警、系统告警）
- 接收来自 risk-engine / execution-engine / 系统的告警事件
- 将告警持久化到 `alerts` 表，并通过：
  - WebSocket 推送前端
  - 第三方通知渠道（如 Telegram / 邮件）的适配器

---

## 3. 技术栈建议

### 3.1 前端

- 框架：React 18
- 语言：TypeScript
- 构建：Vite
- UI：Ant Design（或 Ant Design Pro）+ 深色主题
- 状态管理：React Query（服务端）+ Zustand（本地）
- 图表：ECharts（适合高密度深色图表）
- 路由：React Router v6

### 3.2 后端（两套推荐，二选一）

**方案 A：Node.js 技术栈**

- 框架：NestJS
- ORM：TypeORM / Prisma
- 消息队列：RabbitMQ
- 实时：Socket.io / 原生 WebSocket

**方案 B：Java 技术栈**

- 框架：Spring Boot
- ORM：JPA / MyBatis-Plus
- 消息队列：RabbitMQ / Kafka
- 实时：Spring WebSocket

### 3.3 数据与基础设施

- 数据库：PostgreSQL 15+
- 缓存：Redis 7+
- 消息队列：RabbitMQ 或 Kafka
- 监控：Prometheus + Grafana
- 日志：ELK (Elasticsearch + Logstash + Kibana) 或 OpenSearch

---

## 4. 关键架构原则

1. **机会计算与执行引擎分离**  
   - opportunity-engine 只负责计算机会和生成快照；  
   - execution-engine 只关注如何“安全地把任务变成真实订单和持仓”。

2. **风控前置 + 多层风控**  
   - 创建设备任务前必须先经过 risk-engine 校验；  
   - 运行中 risk-engine 定时扫描，触发告警与熔断。

3. **订单 / 仓位 / 收益解耦**  
   - 订单层关心指令和成交；  
   - 仓位层按账户+合约维度聚合；  
   - 收益层基于仓位与成交生成快照和报表。

4. **一切重要操作可审计**  
   - 策略参数修改、风控规则变更、任务创建/停止都写入 `audit_logs`；  
   - 方便之后排查问题和对接合规审计。

5. **前端只做“展示 + 控制”，不做业务计算**  
   - 所有业务计算和风控判断都在后端服务执行；  
   - 前端通过 REST + WebSocket 获取结果和状态。

---

## 5. 与 UI 截图的对应关系

- 你提供的“套利机会发现”界面 → 对应 `Opportunities` 页面 + opportunity-engine 输出。[file:1]
- 你提供的“大盘 Dashboard”界面 → 对应 `Dashboard` 页面 + pnl-service / risk-engine 聚合。[file:2]
- 你提供的“资金费率套利任务列表”界面 → 对应 `Arbitrage Tasks` 页面 + execution-engine / arbitrage_tasks 表。[file:3]

架构正是围绕这三个核心界面各自的后端需求拆出来的。