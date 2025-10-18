Netia AI Chatbot — As-Built vs Plan

Repository layout assessed
- Root service: `src/server.js` (Express + Socket.IO, REST `/api/health`, conversations in-memory).
- Nested service: `Ai-Chatbot-v1/src/server.js` (duplicate of the root service).
- Safe bot service: `Ai-Chatbot-v1/netia-bot-safe/src/server.js` (Express webhook server with `/health`, flags `DRY_RUN`, `KILL_SWITCH`, and `/crisp/webhook`).
- Tests present: `Ai-Chatbot-v1/netia-bot-safe/tests/check.mjs` with `health` and `webhook` checks.
- Missing artifacts: `.env(.example)`, `config/system_prompt.txt`, `kb/faq.yaml`, `nlp/intents.json`, `/metrics`, ESLint/Prettier/Husky configs, `render.yaml`.

Phase-by-phase status

Phase 0 — Safe base setup
- Implemented:
  - `/health` endpoint in `netia-bot-safe` returns `ok`.
  - `DRY_RUN` and `KILL_SWITCH` flags wired in `netia-bot-safe`.
  - Health and webhook check script located at `Ai-Chatbot-v1/netia-bot-safe/tests/check.mjs`.
- Gaps:
  - No `.env.example` present; repo root doesn’t expose `check:*` scripts.
  - Duplicate servers exist (root and `Ai-Chatbot-v1`), leading to drift risk.

Phase 1 — Conversational brain
- Implemented (partial):
  - File structure placeholders for `intents`, `llm`, `flows` under `netia-bot-safe/src/`.
- Gaps:
  - `NetiaLLM` and `IntentDetector` are referenced but missing.
  - No `config/system_prompt.txt`, `kb/faq.yaml`, or `nlp/intents.json`.
  - No conversation tests (`tests/run.ts`) aside from the basic `check.mjs`.

Phase 2 — Core hardening
- Implemented: basic error try/catch around webhook.
- Gaps: no global error middleware, timeouts, input schema validation, rate limiting, or structured logging.

Phase 3 — Integrations
- Implemented (scaffold): Crisp webhook endpoint exists and respects `KILL_SWITCH` and `DRY_RUN` logs.
- Gaps: calendar mock flow, Sheets/Twilio integrations, append lead logs.

Phase 4 — Observability & runbooks
- Implemented: `/health` only.
- Gaps: `/metrics` endpoint; `docs/runbooks.md` not present; `/health` does not include uptime/version.

Phase 5 — Security hygiene
- Implemented: none of the specified items.
- Gaps: security headers, body size limits, PII redaction, `.env.example` without secrets.

Phase 6 — Performance & load
- Implemented: none.
- Gaps: LRU cache/memoization; load tests.

Phase 7 — Quality gates
- Implemented: none.
- Gaps: ESLint, Prettier, Husky; no CI; not typed.

Phase 8 — Deployment (Render)
- Implemented: none.
- Gaps: `render.yaml`, deployment docs, env var setup guidance.

Phase 9 — Rollout & SLOs
- Implemented: none.
- Gaps: `docs/rollout.md`, SLOs.

Phase 10 — Sales-ready polish
- Implemented: DEMO_MODE responses, demo templates, post-booking messaging scaffold.
- Gaps: optional full demo script library.

Key recommendations
1) Consolidate on `netia-bot-safe` and archive/remove duplicate servers.
2) Add `.env.example` and root scripts to run health/webhook checks.
3) Provide stub implementations for `IntentDetector` and `NetiaLLM`; add minimal KB files.
4) Add `/metrics`, validation, rate limiting, and security headers.
5) Introduce ESLint/Prettier/Husky, then migrate core to TypeScript.
6) Prepare `render.yaml` and a lightweight `docs/runbooks.md`.


