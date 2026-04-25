# Quant Arb Console

> 一套面向"多交易所资金费率套利 + 策略监控 + 风控 + 资产分析"的专业量化交易后台文档仓库。  
> 本仓库主要给：① 自己的开发团队；② Claude / 其他大模型，用来生成架构方案和代码。

---

## 仓库目的

- 统一系统的产品定位、范围、角色与边界
- 统一页面信息架构与导航结构（左侧菜单 + Dashboard + 各业务页）
- 统一技术架构与服务拆分（机会引擎、执行引擎、风控引擎等）
- 统一数据库表设计与 REST / WebSocket 接口
- 提供可直接复制给 Claude 的 Prompt 套装
- 支持后续前后端代码生成、联调与迭代

---

## 目录结构

实际目录为 `doc/`，✅ 表示已完成。

### 产品定义

- ✅ `doc/product/01-product-overview.md` — 产品定位、MVP 范围、角色
- ✅ `doc/product/02-information-architecture.md` — 页面与菜单信息架构
- ✅ `doc/product/03-user-roles-permissions.md` — 角色权限矩阵

### 系统架构

- ✅ `doc/architecture/01-system-architecture.md` — 系统分层与服务拆分
- ✅ `doc/architecture/02-core-workflows.md` — 核心业务流程（机会发现→任务创建→风控→执行→收益→平仓）

### 前端设计

- ✅ `doc/frontend/01-design-system.md` — 设计系统（颜色、字体、间距、组件规范）
- ✅ `doc/frontend/02-layout-structure.md` — Layout 与路由结构
- ✅ `doc/frontend/03-page-specs.md` — 核心页面组件规格（Dashboard / 套利机会 / 套利任务 / 风控 / 策略 / 收益分析）

### 后端服务

- ✅ `doc/backend/02-execution-engine.md` — 执行引擎设计（下单策略、状态机、异常补偿）
- `doc/backend/01-services-overview.md` — 后端服务职责与拆分
- `doc/backend/03-risk-engine.md` — 风控引擎设计

### 数据库设计

- ✅ `doc/database/01-schema-overview.md` — 表设计总览（分类、关系、枚举、索引、分区策略）
- ✅ `doc/database/02-core-tables.md` — 核心表详细字段（17 张表完整 SQL）

### API 设计

- ✅ `doc/api/01-rest-api.md` — REST API 清单与示例（10 个模块，完整请求/响应）
- ✅ `doc/api/02-websocket-events.md` — WebSocket 实时事件（事件清单、数据结构、订阅机制）

### 开发计划

- ✅ `doc/planning/01-mvp-roadmap.md` — MVP / V1 / V2 路线图（5 Phase, 8-10 周）
- ✅ `doc/planning/02-task-breakdown.md` — 任务拆解与排期（71.5 人天，含前后端分工）

### Claude Prompts

- ✅ `doc/prompt/01-master-prompt.md` — Claude 总控 Prompt

---

## 推荐阅读顺序

1. `doc/product/01-product-overview.md` — 理解产品定位与 MVP 范围
2. `doc/architecture/01-system-architecture.md` — 理解系统架构与服务拆分
3. `doc/architecture/02-core-workflows.md` — 理解核心业务流程
4. `doc/database/01-schema-overview.md` + `02-core-tables.md` — 理解数据模型
5. `doc/api/01-rest-api.md` + `02-websocket-events.md` — 理解前后端接口契约
6. `doc/frontend/01-design-system.md` → `02-layout-structure.md` → `03-page-specs.md` — 理解前端设计
7. `doc/planning/01-mvp-roadmap.md` + `02-task-breakdown.md` — 理解开发计划

---

## 给 Claude 的推荐用法

```text
请先完整阅读这个仓库的所有文档，阅读顺序见 README。
在开始写代码之前，先用你自己的话输出你对系统的理解。
在我回复"确认无误，可以进入实现阶段"之前，不要生成代码。
```
