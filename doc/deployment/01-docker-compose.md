# Docker Compose

This compose file starts the MVP stack for local integration:

- API: `http://localhost:3000/api/v1`
- Web: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- RabbitMQ UI: `http://localhost:15672`

Start:

```bash
docker compose up --build
```

Health check:

```bash
curl http://localhost:3000/api/v1/health
```

Default safety settings are mock-only:

```env
EXCHANGE_MODE=mock
ENABLE_LIVE_TRADING=false
```

Do not change these defaults for MVP local development.

Exchange mode notes:

- `mock`: deterministic local exchange adapter. This is the default and supports the full demo flow.
- `testnet`: uses public Binance / OKX / Gate market-data endpoints for funding rates and tickers. Authenticated order placement is not implemented.
- `live`: also uses public market data. Live trading remains blocked unless `ENABLE_LIVE_TRADING=true`, and authenticated order placement is still not implemented.

The current stack is safe for market-data testing and mock execution. It is not ready for real-money trading.

If Node cannot reach exchange public APIs directly while PowerShell or the browser can, pass the local proxy explicitly:

```env
HTTP_PROXY=http://127.0.0.1:15236
HTTPS_PROXY=http://127.0.0.1:15236
```
