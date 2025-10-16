Netia Bot Runbook

Start / Stop
- Local dev: `npm run safe:dev` (root) → runs `netia-bot-safe`.
- Health: `npm run safe:check:health`
- Webhook: `npm run safe:check:webhook`

Environment
- `.env` in `Ai-Chatbot-v1/netia-bot-safe/`: see `docs/env.example.md`.
- Flags: `DRY_RUN=true` (disable external calls), `KILL_SWITCH=false`.

Endpoints
- `/health`: returns `ok` when server is healthy.
- `/metrics`: Prometheus metrics (counters, histograms).
- `/crisp/webhook`: Accepts Crisp-style payloads `{ conversation_id, message }`.

Operational checks
- Ensure `DRY_RUN=true` in non-prod.
- When toggling `KILL_SWITCH=true`, webhook responds with `{ ok: true, skipped: true }`.
- Check `/metrics` for request volume and latency trends.

Database & cache
- Postgres: set `DATABASE_URL`; schema initialized automatically on boot.
- Redis (optional): set `REDIS_URL` to enable shared rate limiting across instances.

Security
- Crisp signature: set `CRISP_WEBHOOK_SECRET` to enforce webhook HMAC verification.
- CORS: set `CORS_ORIGIN` to your web app domain(s).

Incidents
- Invalid payloads: return 400 with Ajv errors; verify payload shape.
- Rate limits: returns 429 with standard headers; back off clients.
- High error rate: enable `KILL_SWITCH` while investigating.


