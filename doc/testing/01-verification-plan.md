# 测试与验证计划（Verification Plan）

本文件定义 Quant Arb Console MVP 开发过程中的验证规则。原则是：**每个任务完成都必须有可执行验证，每个 Phase 结束都必须通过阶段验收**。

---

## 1. 验证原则

1. **先定义验收，再开始实现**：每个开发任务在动手前明确对应的测试、命令或人工检查项。
2. **代码必须可重复验证**：优先使用自动化测试、lint、typecheck、migration check、API test、E2E test。
3. **交易相关逻辑必须隔离实盘**：MVP 默认使用 mock exchange / testnet，任何真实下单能力必须显式开关保护。
4. **前后端契约必须可检查**：REST、WebSocket、数据库字段名与文档保持一致。
5. **每个 Phase 有出口标准**：未通过阶段验收，不进入下一 Phase。

---

## 2. 全局验证命令约定

实际命令以项目脚手架落地后为准，建议统一保留以下脚本名：

```bash
# 后端
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run migration:run
npm run migration:revert

# 前端
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

如果采用 monorepo，建议在根目录提供聚合命令：

```bash
npm run verify
npm run verify:backend
npm run verify:frontend
npm run verify:e2e
```

---

## 3. 分层验证范围

| 层级 | 验证内容 | 最低要求 |
|------|----------|----------|
| 数据库 | migration、枚举、索引、外键、软删除字段 | migration 可正向执行和回滚 |
| 后端单元测试 | service、risk rule、PnL 计算、状态机 | 关键业务分支覆盖 |
| 后端集成测试 | REST API、RBAC、数据库读写、队列消费 | 成功、失败、无权限场景都覆盖 |
| WebSocket 测试 | 认证、心跳、订阅、取消订阅、事件格式 | 断线重连和无权限连接覆盖 |
| 交易所适配器 | mock/testnet 下的行情、费率、下单、撤单 | 禁止默认实盘下单 |
| 前端组件测试 | 格式化、权限守卫、关键表格/表单 | 关键交互可测试 |
| 前端 E2E | 登录、看机会、创建任务、处理告警 | 核心用户路径可跑通 |
| 性能与稳定性 | 大表查询、WS 节流、任务并发锁 | 关键路径有基准结果 |

---

## 4. Phase 验证标准

### Phase 1：基础设施

必须通过：
- 后端 lint / typecheck / unit test
- 前端 lint / typecheck / build
- PostgreSQL migration 正向执行成功
- PostgreSQL migration 至少一次回滚成功
- JWT 登录、RBAC 拒绝、审计日志写入通过集成测试
- WebSocket 连接认证、ping/pong、断线重连通过测试

人工检查：
- `.env.example` 覆盖数据库、Redis、RabbitMQ、JWT、交易所 testnet 开关
- 默认配置不会触发实盘交易

### Phase 2：行情与机会

必须通过：
- mock exchange 返回资金费率、盘口、合约元数据
- `instrument-normalizer` 对 Binance / Bybit / OKX 示例 symbol 映射一致
- `opportunity-engine` 对固定输入产生稳定机会排序和评分
- `GET /api/v1/opportunities` 分页、筛选、排序测试通过
- `opportunity:update` WebSocket 事件格式与文档一致
- 前端机会页筛选、表格、详情面板基本 E2E 通过

人工检查：
- 机会列表中的费率差、年化收益、评分展示与后端返回一致
- 空状态、加载态、错误态可见且不破坏布局

### Phase 3：任务与执行

必须通过：
- 前置风控 6 项校验有单元测试和失败用例
- 任务创建 API 覆盖成功、参数错误、风控拒绝、权限拒绝
- execution-engine 顺序下单状态机测试通过
- 单腿成交、对冲腿失败的补偿流程测试通过
- 暂停、恢复、停止、平仓状态转换测试通过
- 订单、成交、持仓写库一致性测试通过
- 前端从机会创建任务的 E2E 通过

人工检查：
- 所有执行测试默认使用 mock exchange / testnet
- 任务详情中的订单、持仓、收益字段能追溯到数据库记录

### Phase 4：收益与风控

必须通过：
- PnL 计算覆盖资金费收入、手续费、未实现收益、净收益
- 风控运行时扫描能生成 alert，并通过 WebSocket 推送
- Dashboard 聚合 API 返回字段与页面规格一致
- 收益分析 API 的时间范围、维度筛选、导出接口测试通过
- 告警确认、忽略、解决状态转换测试通过
- Dashboard / 收益分析 / 告警中心 E2E 通过

人工检查：
- 收益口径区分预估、已实现、未实现、扣费后净收益
- 风险等级颜色和告警状态符合设计系统

### Phase 5：系统完善

必须通过：
- 策略 CRUD、启停、参数校验测试通过
- 交易所、账户、用户、审计日志 API 测试通过
- 关键操作全部写入 `audit_logs`
- Docker Compose 一键启动后健康检查通过
- 全流程 E2E：登录 → 配置账户 → 查看机会 → 创建任务 → 执行 mock 下单 → 查看收益 → 停止任务
- 性能基准：机会列表、任务列表、Dashboard 聚合接口达到目标响应时间

人工检查：
- 权限菜单、按钮级权限、403 页面表现正确
- 桌面 1440px 和 1024px 视口下无明显布局错位

---

## 5. 每个任务的完成定义

每个任务完成前必须满足：

1. 对应代码或文档已更新。
2. 对应测试已新增或更新。
3. 本地验证命令通过。
4. API / DB / WS 字段变更已同步到文档。
5. 涉及交易行为时，已确认默认只走 mock/testnet。
6. 关键路径已留下最小可复现验证步骤。

---

## 6. 阻塞发布的问题

出现以下任一情况，不允许进入下一 Phase 或发布：

- migration 无法回滚
- RBAC 后端权限可被绕过
- 任务创建绕过前置风控
- 默认配置可能触发真实下单
- 单腿成交失败补偿无测试
- PnL 口径无法解释或字段混用
- WebSocket 断线后页面状态不可恢复
- 核心 E2E 路径无法跑通
