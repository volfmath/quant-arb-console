# Server Quickstart

This guide is for deploying the current MVP to a single server with Docker Compose.

Current safety boundary:

- Market data can be real public data from Binance, OKX, and Gate when `EXCHANGE_MODE=testnet`.
- Task execution and order placement are still mock or blocked. Authenticated real order placement is not implemented.
- Keep `ENABLE_LIVE_TRADING=false`.

## 1. Server prerequisites

Use a Linux server with:

- Docker Engine
- Docker Compose plugin
- Git
- Open ports only for what you need, usually `5173` for the web UI and optionally `3000` for direct API debugging.

Check:

```bash
docker --version
docker compose version
git --version
```

## 2. Clone the repo

```bash
git clone https://github.com/volfmath/quant-arb-console.git
cd quant-arb-console
```

## 3. Create server env

```bash
cp .env.example .env
```

Edit `.env` before starting:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
JWT_SECRET=replace-with-a-long-random-secret
CREDENTIAL_ENCRYPTION_KEY=replace-with-another-long-random-secret

POSTGRES_PASSWORD=replace-with-a-strong-db-password

EXCHANGE_MODE=testnet
ENABLE_LIVE_TRADING=false
VITE_API_BASE_URL=http://YOUR_SERVER_IP:3000/api/v1

OPPORTUNITY_SYMBOLS=BTC,ETH,SOL,BNB,XRP,DOGE,ADA,AVAX,LINK,DOT,TRX,TON,LTC,BCH,UNI,APT,ARB,OP,NEAR,FIL,ETC,ATOM,INJ,SUI
```

If the server cannot reach Binance or OKX directly, add a proxy that is reachable from the server:

```env
HTTP_PROXY=http://YOUR_PROXY_HOST:PORT
HTTPS_PROXY=http://YOUR_PROXY_HOST:PORT
```

Do not put real exchange API keys into `.env`. Account credentials are entered from the Settings page, but they are not used for real order placement yet.

## 4. Start

```bash
docker compose up -d --build
```

First start can take several minutes because the containers run `npm ci`.

Check containers:

```bash
docker compose ps
docker compose logs -f api
```

## 5. Verify

API health:

```bash
curl http://localhost:3000/api/v1/health
```

Expected shape:

```json
{"status":"ok","exchangeMode":"testnet","liveTradingEnabled":false}
```

Open the web UI:

```text
http://YOUR_SERVER_IP:5173
```

Log in with:

```text
username: ADMIN_USERNAME from .env
password: ADMIN_PASSWORD from .env
```

Then verify this flow:

1. Open Dashboard and confirm API status is normal.
2. Open Arbitrage Opportunities.
3. Click refresh or scan.
4. Confirm opportunities show Binance, OKX, or Gate pairs.
5. Open the Scan Audit tab.
6. Confirm `data_sources` includes at least two of Binance, OKX, and Gate.
7. Confirm `comparable_symbols` is greater than zero.
8. Open Settings and confirm exchange mode is `testnet`.

If opportunities are empty, first check network access:

```bash
docker compose exec api wget -qO- "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT" | head
docker compose exec api wget -qO- "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP" | head
docker compose exec api wget -qO- "https://api.gateio.ws/api/v4/futures/usdt/contracts/BTC_USDT" | head
```

If only Gate works, configure `HTTP_PROXY` and `HTTPS_PROXY`, then restart:

```bash
docker compose up -d --force-recreate api
```

## 6. Normal usage

Recommended first run:

1. Keep `EXCHANGE_MODE=testnet`.
2. Keep `ENABLE_LIVE_TRADING=false`.
3. Use the Opportunities page to observe real funding-rate differences.
4. Use the Scan Audit tab to verify every scan has enough exchange coverage.
5. Use Create Task only as a mock execution demo.
6. Do not treat estimated PnL as realized profit; it is based on funding-rate spread and a reference position size.

Before any small-capital manual test, collect at least one day of scan audit history:

```text
minimum scans: 100
minimum data sources per useful scan: 2
comparable_symbols: greater than 0
opportunity_count: greater than 0 for candidate scans
single-exchange opportunities: 0
live trading flag: false
```

Only move to manual small-capital validation when the audit records show stable market-data coverage and correct long/short direction.

Account API keys:

1. Open Settings.
2. Open Accounts.
3. Add `binance`, `okx`, or `gate` accounts.
4. For OKX, fill `Passphrase`.
5. The system stores masked/encrypted credentials for the session, but current trading adapters do not use them to place real orders.

## 7. Update

```bash
git pull
docker compose up -d --build
```

If dependencies changed and the app behaves strangely:

```bash
docker compose down
docker compose up -d --build
```

To remove all local data, including Postgres data:

```bash
docker compose down -v
```

Use `down -v` only when you intentionally want a clean reset.

## 8. Security checklist

- Change `ADMIN_PASSWORD`, `JWT_SECRET`, `CREDENTIAL_ENCRYPTION_KEY`, and `POSTGRES_PASSWORD`.
- Do not expose RabbitMQ `15672`, Postgres `5432`, or Redis `6379` to the public internet.
- Prefer a firewall or reverse proxy in front of `5173` and `3000`.
- Keep `ENABLE_LIVE_TRADING=false`.
- Keep server `.env` out of Git.

## 9. Current limitations

- Real public market data is supported for Binance, OKX, and Gate.
- Real authenticated order placement is not implemented.
- Account records are MVP in-memory service state, not full production account persistence yet.
- The compose file runs development servers for fast MVP iteration, not a hardened production image.
