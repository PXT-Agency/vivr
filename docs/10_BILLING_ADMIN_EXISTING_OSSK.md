# Phase 10 — OSSK Commerce, Billing and Administration

## Goal
Carry the original OSSK star-number marketplace requirements into the new architecture and connect them to the VIVR platform.

## Public storefront
Preserve:
- exact `*XXXX` search;
- availability detection;
- alternative suggestions;
- pattern tags;
- memorability scoring;
- reservation cart;
- institutional pages.

## Reservation and ownership lifecycle
Preserve the lifecycle:
`available -> reserved -> sold -> released`

Reservation holds and ownership expiry must be enforced server-side.

## Billing
Preserve:
- reservation fee if applicable;
- purchase orders;
- quarterly/semi-annual/annual plans;
- VAT configuration;
- bank transfer/M-Pesa reference capture;
- manual reconciliation;
- proforma/tax/credit note invoices;
- PDF generation.

## Customer portal
Customer dashboard should show:
- active star numbers;
- reservation status;
- invoices;
- renewals;
- VIVRs;
- voice agents;
- call activity;
- routing configuration;
- organization members.

## VIVR relationship to star numbers
A customer may own multiple numbers. Each number can:
- point to one active VIVR;
- point to one inbound voice agent;
- have one default routing policy;
- optionally have time-based routing.

Avoid assuming one customer = one VIVR.

## Admin features
Internal admin users need:
- number inventory;
- categories/pricing;
- reservations/orders;
- ownerships;
- customers/organizations;
- VIVR/customer 360;
- telephony providers;
- routing destinations;
- system health;
- audit logs;
- billing configuration.

## Security
Keep internal administrative permissions separate from customer organization permissions. A customer `org:admin` is never a platform super-admin.
