# Claude 总控 Prompt（Master Prompt）

本文件定义“如何让 Claude 正确阅读 `quant-arb-console` 仓库，并在此基础上输出方案与代码”。

---

## 1. 使用场景

- 你已经在 GitHub 上准备好了本仓库：  
  `https://github.com/volfmath/quant-arb-console`
- 你希望 Claude：
  - 先理解产品与架构
  - 再帮你设计数据库、API、前后端、执行引擎等
  - 不要一上来就乱写代码

---

## 2. 推荐主提示词

复制下面整段给 Claude（把用户名/仓库名确认一下即可）：

```text
你现在是我的“资深量化交易系统架构师 + 产品工程师 + 全栈技术负责人”。

请先访问并完整阅读这个 GitHub 仓库：
https://github.com/volfmath/quant-arb-console

阅读顺序建议如下：
1. README.md（整体目标、结构）
2. docs/product/01-product-overview.md（产品定义、MVP 范围、角色）
3. docs/architecture/01-system-architecture.md（系统架构与服务拆分）
如果仓库中已经补充了更多文档（database/api/frontend/backend/planning 下的文件），也一并阅读。

在开始写任何代码之前，请先用你自己的话输出：

1. 你理解的系统目标与业务边界
2. 系统的模块划分（前端、admin-console-api、opportunity-engine、execution-engine、risk-engine、market-data-service、pnl-service 等）
3. 当前文档中已经定义好的核心数据结构（只列出关键表 / 核心实体，例如 arbitrage_opportunities、arbitrage_tasks、orders、positions、pnl_snapshots 等）
4. 页面结构（左侧菜单 + 关键页面：Dashboard、套利机会、套利任务、策略管理、风控中心等）
5. 你认为还不清晰、需要我补充或确认的地方（列成问题清单）

在我回复“确认无误，可以进入实现阶段”之前，请不要生成任何前端或后端代码。
```

---

## 3. 固定业务约束（建议每次都附加）

无论后面你让 Claude 生成什么内容（数据库、接口、前端、策略代码），都建议在提示里重复这些**业务硬约束**，避免它偏题：

```text
在后续所有设计与代码中，请始终遵守以下约束：

1. MVP 只聚焦“资金费率套利”这一类策略。
2. 默认只接入 2~3 家主流交易所（例如 Binance / Bybit / OKX），不考虑小众交易所。
3. 默认先做“人工确认后执行”的半自动模式，不做完全无人值守的全自动执行。
4. 默认桌面端优先，深色专业交易后台风格，不需要复杂的移动端页面。
5. 所有收益必须区分：预估收益、已实现收益、未实现收益、扣费后净收益，并在数据库和接口层有明确字段。
6. 套利“机会”和实际执行的“任务”必须分开建模（arbitrage_opportunities vs arbitrage_tasks）。
7. 风控必须前置到任务创建和下单之前：未通过风控的任务不得创建或执行。
8. 所有关键操作（任务创建/停止、策略参数修改、风控规则修改）必须写入审计日志。
```

---

## 4. 后续阶段常用子 Prompt 模板（简要）

### 4.1 生成数据库设计 / Migration

```text
在你已经理解本仓库文档的前提下，请基于目前的产品与架构，设计 PostgreSQL 数据库表结构。

重点关注：
- exchanges, exchange_accounts, instruments
- funding_rates, arbitrage_opportunities, arbitrage_tasks
- orders, fills, positions, account_balances
- pnl_snapshots, risk_rules, alerts, audit_logs

要求：
1. 给出每张表的字段、类型、含义、主键、重要索引。
2. 用文字先说明设计原则，再给出 SQL 草稿。
3. 不要直接跳到 ORM 代码；我们先确认表结构。
```

### 4.2 生成前端页面方案

```text
在你已经理解本仓库文档的前提下，请先为“Dashboard 页面 + 套利机会页面 + 套利任务页面”设计前端结构和组件拆分（React + TypeScript）。

要求：
1. 不要立即写代码，先输出：
   - 路由结构
   - Layout 结构（左侧导航 / 顶部 / 主内容 / 右侧详情抽屉）
   - 每个页面的组件列表、props 设计、数据来源（哪个 API）。
2. 参考仓库里的产品和架构描述，保证字段命名与接口/表设计一致。
```

你可以把这些子 prompt 放在后续的 `docs/prompts/02-backend-prompts.md` 和 `docs/prompts/03-frontend-prompts.md` 里进一步细化。

---

## 5. 使用建议

1. **永远先让 Claude 复述理解**  
   不要一上来就让它写代码，先让它说“它理解了什么”，可以避坑。

2. **每个阶段只做一件事**  
   比如这一轮只讨论数据库，下一轮才写 API，再下一轮才写前端页面。

3. **始终引用仓库文档**  
   在 Prompt 里反复提到“请严格以仓库中的文档为准，不要自行虚构业务逻辑/字段名”。

这样，你这个 `quant-arb-console` 仓库就真正变成了 Claude 的“项目蓝图”，不会每次聊天都从零开始。  