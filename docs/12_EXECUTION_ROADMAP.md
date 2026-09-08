# Phase 12 — Agentic Execution Roadmap

## Build order
The AI coding agent must execute in this order:

1. Foundation and tooling.
2. Clerk authentication + Organizations.
3. PostgreSQL schema + Drizzle repositories.
4. Existing OSSK star-number core.
5. Customer dashboard.
6. One-page VIVR builder.
7. Public VIVR runtime.
8. LiveKit agent service.
9. SIP/telephony integration.
10. AI smart routing.
11. Analytics, realtime, scheduled jobs and operations.
12. Billing/admin consolidation.
13. Security hardening and production QA.

## Do not do these too early
- Do not build every block type before the core builder works.
- Do not build a generic workflow engine unless a real requirement emerges.
- Do not build your own SIP carrier.
- Do not build your own auth system.
- Do not make VIVR a multi-page CMS.
- Do not put the LiveKit agent loop inside Next.js.
- Do not expose raw model/provider configuration to anonymous users.

## MVP definition
A customer can:
1. Sign up/login with Clerk.
2. Create or join an organization.
3. Have/associate a star number.
4. Create a VIVR.
5. Add logo, description and action blocks.
6. Reorder blocks.
7. Preview it.
8. Publish it.
9. Share the public URL.
10. Configure an AI voice agent.
11. Receive an inbound call through LiveKit/SIP.
12. Have AI classify intent.
13. Route/transfer using deterministic rules.
14. View call history and analytics.

## Phase completion artifact
At the end of each phase the agent must update:
`docs/PROGRESS.md`
with:
- phase completed;
- commit/hash if available;
- files changed;
- migrations;
- environment variables;
- tests;
- manual QA steps;
- known limitations.

## Final architecture acceptance
The system should look conceptually like:
```text
                    OSSK PLATFORM
                         |
        +----------------+----------------+
        |                                 |
   Customer SaaS                     Public VIVR
        |                                 |
  Next.js + Clerk                  /v/[slug]
        |                                 |
  PostgreSQL / Storage                   |
        |                                 |
  +-----+-------------------+             |
  |                         |             |
Commerce                  VIVR -----------+
  |                         |
Star numbers             Voice Agent config
Reservations                 |
Billing                      v
Renewals                  LiveKit
  |                         |
Admin                    SIP/PSTN
                            |
                    AI routing engine
                            |
                  Agencies / offices / teams
```
