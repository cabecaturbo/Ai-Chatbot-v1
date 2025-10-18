Rollout Plan and SLOs

Environments
- Local (DRY_RUN=true), Staging (DRY_RUN=true), Production (DRY_RUN=false)

Steps
1) Merge to main with green tests and lint.
2) Deploy to staging; verify `/health`, `/metrics`, and webhook checks.
3) Enable Crisp webhook to staging; keep DRY_RUN=true.
4) Run load checks (200 msgs / 20 convos) and review metrics.
5) Flip DRY_RUN=false for production after approval.

SLOs
- Uptime: 99.5%
- Latency: p95 < 1.5s
- Error rate: < 1%

Runbooks
- See `docs/runbooks.md` for operational details.


