# Quant Arb Console

多交易所资金费率套利控制台，用于观察 Binance / OKX / Gate 的资金费率差、筛选套利机会、创建 mock 执行任务，并查看风控、任务和收益分析页面。

当前版本适合做：

- 真实公开行情观察：`testnet` / `live` 模式会读取 Binance、OKX、Gate 的公开资金费率和 ticker。
- 套利机会发现：按统一交易对聚合不同交易所资金费率，展示 long / short 方向和估算收益。
- mock 任务演示：从机会创建任务，走风险检查和模拟执行流程。
- 服务器开箱部署：使用 Docker Compose 启动 API、Web、Postgres、Redis、RabbitMQ。

当前版本还不能做：

- 不能真实下单。
- 不能自动真钱交易。
- 账户 API Key 可以在设置页填写，但真实交易 adapter 尚未实现，凭证不会用于真实下单。

## 快速开始

### 本地运行

```bash
git clone https://github.com/volfmath/quant-arb-console.git
cd quant-arb-console
cp .env.example .env
npm install
npm run verify
```

启动 API 和 Web：

```bash
npm run dev -w @quant-arb/api
npm run dev -w @quant-arb/web
```

默认地址：

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/api/v1/health`

默认登录：

```text
username: admin
password: change-me-admin
```

### Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:3000/api/v1/health
```

服务器部署请直接看：

- [Server Quickstart](doc/deployment/02-server-quickstart.md)
- [Docker Compose Notes](doc/deployment/01-docker-compose.md)

## 关键配置

`.env` 里最常用的配置：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-admin
JWT_SECRET=change-me
CREDENTIAL_ENCRYPTION_KEY=change-me-32-byte-credential-key

EXCHANGE_MODE=mock
ENABLE_LIVE_TRADING=false
OPPORTUNITY_SYMBOLS=BTC,ETH,SOL,BNB,XRP,DOGE,ADA,AVAX,LINK,DOT,TRX,TON,LTC,BCH,UNI,APT,ARB,OP,NEAR,FIL,ETC,ATOM,INJ,SUI
```

模式说明：

- `mock`: 默认安全模式，行情和执行都走本地模拟数据。
- `testnet`: 使用 Binance / OKX / Gate 公开行情数据；下单仍未实现。
- `live`: 仍只使用公开行情；真实下单仍未实现。

如果服务器访问 Binance / OKX 不稳定，可以配置代理：

```env
HTTP_PROXY=http://YOUR_PROXY_HOST:PORT
HTTPS_PROXY=http://YOUR_PROXY_HOST:PORT
```

## 使用路径

1. 登录控制台。
2. 打开 Dashboard，确认 API 状态正常。
3. 打开“套利机会”，点击刷新或扫描。
4. 查看 Binance / OKX / Gate 之间的资金费率差。
5. 需要演示任务流时，从机会创建任务，当前只会进入 mock 执行。
6. 打开“设置中心 -> 账户”，可以添加 Binance / OKX / Gate 账户信息；当前仅保存配置，不会真实下单。

## 验证命令

每次改动后建议跑：

```bash
npm run verify
```

单独验证 API：

```bash
npm run verify -w @quant-arb/api
```

单独验证 Web：

```bash
npm run verify -w @quant-arb/web
```

## 项目结构

```text
apps/
  api/      NestJS API, opportunity engine, risk/task/settings modules
  web/      React + Ant Design control console
doc/
  api/          REST and WebSocket contracts
  architecture/ System design and workflows
  database/     Core table design
  deployment/   Docker and server deployment guides
  frontend/     Page and UI specs
  product/      Product scope and roles
  testing/      Verification plan
```

## 文档入口

- [产品概览](doc/product/01-product-overview.md)
- [系统架构](doc/architecture/01-system-architecture.md)
- [核心流程](doc/architecture/02-core-workflows.md)
- [REST API](doc/api/01-rest-api.md)
- [数据库设计](doc/database/01-schema-overview.md)
- [验证计划](doc/testing/01-verification-plan.md)

## 安全边界

默认配置是安全的 mock 模式：

```env
EXCHANGE_MODE=mock
ENABLE_LIVE_TRADING=false
```

即使切到 `testnet`，当前也只会读取公开行情数据。真实下单、真实仓位、真实资金划转都没有实现。部署到服务器时，请先修改默认后台密码、JWT 密钥、凭证加密密钥和数据库密码。
