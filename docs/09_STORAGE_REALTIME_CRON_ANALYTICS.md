# Phase 09 — Storage, Realtime, Scheduled Jobs, Analytics and Operations

## Goal
Use PostgreSQL and its supported ecosystem to make the platform operationally complete without adding unnecessary infrastructure.

## Storage
Use Supabase Storage (or an S3-compatible equivalent) for:
- logos;
- VIVR hero images;
- customer documents;
- generated invoices;
- optional call artifacts, subject to retention policy.

Store object references in PostgreSQL. Do not store large binary data directly in relational rows.

## Realtime
Use Supabase Realtime only for experiences where server push is genuinely useful:
- call status panel;
- transfer status;
- job status;
- live dashboard activity.

Do not use realtime as the primary persistence mechanism.

## Scheduled jobs
Use PostgreSQL `pg_cron` where available for deterministic schedules such as:
- reservation expiration;
- renewal notifications;
- ownership expiry/reclamation;
- cleanup of temporary events;
- analytics rollups.

For integrations that require secrets or long-running execution, invoke an application worker/Route Handler/Edge-style function rather than doing external API work directly inside a database trigger.

## Analytics model
Separate operational facts from reporting views.

Useful aggregate metrics:
- VIVR page views;
- block clicks;
- call starts;
- answered calls;
- transfer rate;
- transfer success;
- fallback rate;
- average call duration;
- emergency type distribution;
- county distribution;
- top VIVR actions;
- conversion from VIVR interaction to call/form/action.

## Existing OSSK analytics to preserve
Continue supporting revenue, category distribution, conversion rate and sales velocity from the original platform.

## Audit log
Record security-sensitive changes:
- organization settings;
- VIVR publish/unpublish;
- agent configuration changes;
- routing rule changes;
- destination changes;
- number ownership changes;
- invoice/payment actions.

Use append-only semantics where feasible.

## Observability
Add:
- request IDs/correlation IDs;
- structured logs;
- error monitoring;
- external integration failures;
- webhook delivery logs;
- job execution logs.

## Retention
Define configurable retention policies for:
- call metadata;
- call transcripts;
- analytics events;
- webhook payloads;
- audit data.

Do not retain sensitive audio/transcripts forever by default.
