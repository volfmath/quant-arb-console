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
