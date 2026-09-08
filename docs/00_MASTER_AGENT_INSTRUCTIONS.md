# OSSK + VIVR Platform — Master Instructions for the AI Agentic Developer

## Mission
Build OSSK as a fast, modern, multi-tenant B2B platform for Kenyan star numbers and self-service Visual IVR. The platform combines:

1. Star-number inventory, reservation, purchase, renewal, invoicing and administration.
2. A one-page, mobile-first VIVR builder inspired by link-in-bio products.
3. A public VIVR runtime for callers/visitors.
4. AI voice agents powered by LiveKit Agents.
5. SIP/PSTN integration for inbound/outbound phone calls.
6. AI-assisted call classification and deterministic routing to configured agencies/offices.
7. Customer self-service, analytics, audit logs and operational administration.

## Non-negotiable product model
A VIVR is **one persistent page**, not a collection of screens. The page contains ordered content/action blocks. Blocks can open modals, forms, maps, dialogs, external URLs, calls, WhatsApp, SMS, downloads, or other experiences. Do not implement a multi-screen VIVR navigation model unless a future phase explicitly requires it.

## Required stack
- Next.js App Router + TypeScript.
- React with server-first rendering; use Client Components only where interactivity requires them.
- Tailwind CSS + shadcn/ui + Lucide icons.
- Clerk for authentication, Organizations, memberships, roles and permissions.
- PostgreSQL as the system of record. Prefer Supabase Postgres for managed Postgres features where practical.
- Drizzle ORM for application-level type-safe database access.
- Supabase Storage for customer/VIVR assets where useful; do not use Supabase Auth.
- Supabase Realtime only where realtime UI updates materially improve the product.
- pg_cron for scheduled database jobs if available in the chosen Postgres environment.
- LiveKit Cloud/Server for realtime voice, SIP and AI agents.
- LiveKit Agents in a dedicated agent service (Python or Node.js), separate from the Next.js web process.
- OpenRouter as an LLM gateway initially, with model/provider configuration stored per agent.
- Pluggable STT/TTS providers; do not hard-wire a single vendor into domain code.
- Zod for input/config validation.
- Vitest + React Testing Library for unit/component tests; Playwright for end-to-end tests.
- Sentry or equivalent for production error monitoring.

## Architectural principles
1. Multi-tenant by design from day one.
2. Organization is the tenant boundary; every tenant-owned row must carry `organization_id`.
3. Clerk identity is the source of truth for authentication. PostgreSQL is the source of truth for application data.
4. Never trust organization/user IDs submitted by the browser. Resolve them server-side from Clerk session context.
5. AI may classify and recommend; deterministic server-side rules decide what destinations are allowed.
6. Never let an LLM invent a telephone destination.
7. Store provider credentials in server-side secrets; never expose them to the browser.
8. Public VIVR rendering must be fast and cacheable.
9. Keep VIVR configuration JSON-schema driven and versionable.
10. Publish should create an immutable/identified version that can be rolled back.
11. Make external integrations asynchronous where possible and idempotent.
12. Avoid premature microservices. Only split the LiveKit agent runtime from the Next.js app initially.

## Existing specification to preserve
The existing OSSK requirements include star number inventory, memorability scoring, reservations, orders, ownership, renewal, invoicing, proposals, RBAC, audit logs, communications and a smartphone VIVR preview. Preserve those business requirements while replacing the prior React/Vite + Supabase Auth direction with the requested Next.js + Clerk architecture.

## Definition of done for every phase
- Code compiles and typechecks.
- Lint passes.
- Tests for new critical logic exist.
- Database migrations are reversible or safely forward-only with documented rollback strategy.
- No secrets committed.
- Tenant isolation is tested.
- No unrelated refactors.
- Update `docs/PROGRESS.md` and the phase checklist.
- Provide a concise implementation summary and known limitations.

## Agent execution rule
Work phase-by-phase. Do not jump ahead. At the end of a phase, stop and report:
- what was implemented;
- files changed;
- migrations added;
- environment variables added;
- tests run and results;
- anything blocked or intentionally deferred.

## Source alignment
The original PRD defines OSSK as a B2B star-number marketplace and VIVR-ready platform, including star-number lifecycle, customer portal, VIVR preview, invoices, renewals, sales pipeline, RBAC and auditing. Keep these domain concepts unless this architecture explicitly supersedes an implementation detail.
