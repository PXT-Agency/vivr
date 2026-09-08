# Phase 11 — Testing, Security, Deployment and Production Readiness

## Goal
Make the platform deployable and safe for real B2B/public-sector pilots.

## Test layers
### Unit
Test:
- memorability scoring;
- VIVR schema validation;
- routing rules;
- phone normalization;
- permission helpers;
- billing calculations.

### Integration
Test:
- Clerk organization context + DB queries;
- publish workflow;
- VIVR public resolver;
- telephony provider adapters;
- LiveKit API integration with mocks;
- scheduled jobs.

### E2E
Test:
1. Sign up.
2. Create organization.
3. Create VIVR.
4. Add/reorder blocks.
5. Publish.
6. Open public VIVR.
7. Trigger call action.
8. Start AI call flow in test environment.
9. Simulate routing decision.
10. Verify analytics and audit logs.

## Security checklist
- Clerk server-side authorization on every protected mutation.
- Organization scoping on every tenant query.
- Secret management through environment/secret manager.
- Zod validation on all external input.
- Rate limiting on public APIs.
- Webhook signature verification.
- SSRF protection for customer-configured URLs where server fetches are allowed.
- Upload type/size validation.
- No arbitrary HTML/JS injection in VIVR blocks.
- No raw AI/provider secrets in database.
- No arbitrary phone-number transfer based solely on model output.
- PII minimization in logs.

## Production deployment
Recommended initial deployment:
- Next.js app on Vercel or equivalent.
- Managed PostgreSQL (Supabase Postgres is appropriate).
- Supabase Storage if selected.
- LiveKit Cloud for realtime/SIP during early stages.
- Separate LiveKit agent deployment.
- Clerk production instance.

Avoid Kubernetes/microservices until actual traffic or organizational complexity justifies them.

## Environments
Maintain:
- development;
- staging;
- production.

Never point development traffic at production telecom numbers by default.

## Release process
Every production release must have:
- migration status;
- automated test results;
- rollback notes;
- integration health check;
- updated `PROGRESS.md`.

## Performance targets
Set initial budgets rather than optimizing blindly:
- fast public VIVR first render on mobile;
- low server response latency for public VIVR resolution;
- bounded dashboard data payloads;
- pagination for logs/calls/events.

Measure before optimizing.
