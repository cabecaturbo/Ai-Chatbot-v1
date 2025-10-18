Netia AI Chatbot — Revised Implementation Plan

Scope and baseline
- Single service target: consolidate on `Ai-Chatbot-v1/netia-bot-safe` as the primary server (it already has `DRY_RUN`, `KILL_SWITCH`, `/health`, and a Crisp webhook entrypoint). Deprecate duplicate servers in the repository root (`src/server.js`) and `Ai-Chatbot-v1/src/server.js` after consolidation.
- Short term: keep JavaScript for velocity; plan a TypeScript migration once quality gates are in place.
- Principle: keep external effects disabled by default via `DRY_RUN=true`; add comprehensive tests and safety layers before enabling live integrations.

Phase 0 — Safe base setup (revised)
Goal: Sandbox runtime; no external effects while `DRY_RUN=true`.
Deliverables:
- Add `.env.example` with: `DRY_RUN=true`, `KILL_SWITCH=false`, `PORT=3000`, `CRISP_IDENTIFIER=`, `CRISP_KEY=`, `CRISP_WEBSITE_ID=`, `OPENAI_API_KEY=`.
- Ensure `/health` returns `200 ok` (already present in `netia-bot-safe`).
- Add npm scripts at the repository root mirroring `netia-bot-safe`: `dev`, `check:health`, `check:webhook`.
- Wire a local logger with request IDs and redactors (stdout only).
Acceptance:
- `npm run dev` starts the server; `npm run check:health` passes; `npm run check:webhook` hits the webhook but performs no external calls when `DRY_RUN=true`.

Phase 1 — Conversational brain
Goal: Foundational intents, context, FAQ, test coverage.
Deliverables:
- `config/system_prompt.txt`, `kb/faq.yaml`, `nlp/intents.json` (minimum viable content for pricing, booking, FAQs).
- Implement minimal `IntentDetector` (pattern/keyword-based) and `NetiaLLM` (OpenAI client mocked when `DRY_RUN=true`).
- Conversation unit tests and conversation harness (`tests/run.ts` or JS equivalent) to validate booking and FAQ paths.
Acceptance:
- Local test runner passes basic scenarios; webhook replies contain pricing/booking/FAQ logic under `DRY_RUN=true`.

Phase 2 — Core hardening
Goal: Robustness and safety.
Deliverables:
- Global error middleware; timeouts for HTTP and outbound calls; JSON schema validation for webhook payloads; rate limiting; structured logs; strict `KILL_SWITCH` enforcement.
- Return shapes: 400 on invalid payload, 408/504 timeouts, 429 with `Retry-After` on bursts, friendly message when paused.
Acceptance:
- Automated tests cover invalid payload, timeout, and rate-limit cases; manual checks confirm `KILL_SWITCH` behavior.

Phase 3 — Integrations
Goal: Wire real-world surfaces with safe defaults.
Deliverables:
- 3A Crisp webhook: receive events, produce replies; wrap live send behind `DRY_RUN` guard.
- 3B Calendar mock + booking flow: expose mock availability, return `eventId` on booking.
- 3C Optional: Sheets append + Twilio SMS (behind `DRY_RUN`).
Acceptance:
- Mock booking returns slots and a fake `eventId`; append-lead logs visible; no network when `DRY_RUN=true`.

Phase 4 — Observability & runbooks
Goal: See and operate the system.
Deliverables:
- `/metrics` endpoint with counters (reqs, errors, latencies, cache hits). `/health` includes uptime and version when `NODE_ENV !== production`.
- `docs/runbooks.md` with start/stop, logs, common incidents, and webhook verification notes.
Acceptance:
- GET `/metrics` shows counters; runbooks reviewed.

Phase 5 — Security hygiene
Goal: Sensible defaults.
Deliverables:
- `.env.example` (sanitized), `helmet`, body size limits, input sanitization, PII redaction in logs, abuse blocks (IP + UA heuristics), CSP guidance for any future UI.
Acceptance:
- Security headers present; oversized body → 413; logs redact phone/email.

Phase 6 — Performance & load
Goal: Keep it fast and predictable.
Deliverables:
- LRU cache for FAQ/system prompt; memoize static answers; a simple load script for 200 msgs / 20 convos.
Acceptance:
- <1% errors, p95 <1.2s on local/load target; cache hit logs visible.

Phase 7 — Quality gates
Goal: Code quality + type safety.
Deliverables:
- ESLint + Prettier + Husky pre-commit; CI job; begin TypeScript migration: convert server and core modules to `.ts` with strict types.
Acceptance:
- No lint errors; tests green; typecheck clean for migrated modules.

Phase 8 — Deployment (Render)
Goal: One-click deploy.
Deliverables:
- `render.yaml`, production `Dockerfile` if needed; docs to set env vars and verify Crisp webhook; run with `DRY_RUN=false` when ready.
Acceptance:
- Public `/health` returns 200; Crisp webhook configured.

Phase 9 — Rollout & SLOs
Goal: Change management.
Deliverables:
- `docs/rollout.md` for staging→prod; SLOs: 99.5% uptime, p95<1.5s, <1% error.
Acceptance:
- Document published and adopted.

Phase 10 — Sales-ready polish
Goal: Demos and messages.
Deliverables:
- `DEMO_MODE=true` toggle; demo KB subset; pricing tiers; post-booking message templates.
Acceptance:
- Demo mode shows tailored prompts; lead flow works end-to-end.

Consolidation tasks (immediate next steps)
1) Choose `netia-bot-safe` as the service; remove duplicate servers. (DONE)
2) Add `.env` template and root scripts. (DONE)
3) Implement `IntentDetector` and `NetiaLLM` stubs. (DONE)
4) Add KB assets: system prompt, FAQ, intents. (DONE)
5) Add `/metrics`, security, rate limiting, validation. (DONE)
6) ESLint/Prettier/Husky (DONE); TypeScript migration (NEXT).

Risks and notes
- Duplicate servers increase confusion and drift: resolve early.
- Missing AI modules cause runtime failures in the current webhook path; provide safe stubs first.
- Keep `DRY_RUN=true` across local and staging until tests and safety layers are in place.


