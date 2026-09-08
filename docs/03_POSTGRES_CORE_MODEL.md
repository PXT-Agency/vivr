# Phase 03 — PostgreSQL Core Domain Model

## Goal
Create the durable data model for OSSK, VIVR and voice operations. Keep the schema modular and ready for self-service customers.

## Core tables
### Tenant and configuration
- `organizations` — local mirror of tenant metadata keyed by Clerk org ID.
- `organization_settings`
- `organization_membership_profiles`

### Star-number commerce
- `star_numbers`
- `star_number_categories`
- `reservations`
- `orders`
- `order_items`
- `ownerships`
- `renewal_plans`
- `invoices`
- `invoice_line_items`
- `leads`
- `lead_stages`
- `lead_proposals`

### VIVR
- `vivrs`
- `vivr_versions`
- `vivr_blocks`
- `vivr_block_types` (optional registry)
- `vivr_themes`
- `vivr_domains_or_slugs`
- `vivr_assets`
- `vivr_public_events`

### Voice and telecom
- `voice_agents`
- `voice_agent_versions`
- `voice_tools`
- `voice_sessions`
- `voice_call_events`
- `phone_numbers`
- `sip_trunks`
- `routing_rules`
- `routing_destinations`
- `call_transfers`

### Messaging
- `sms_messages`
- `whatsapp_messages` (provider-agnostic structure)

### Platform operations
- `audit_logs`
- `integration_connections`
- `webhook_events`
- `job_runs`
- `api_keys` (only if customer API access is added later)

## VIVR data model
A VIVR is one page with ordered blocks.

Example conceptual JSON:
```json
{
  "schemaVersion": 1,
  "profile": {
    "name": "Nakuru County Emergency Response",
    "description": "Official public emergency information"
  },
  "theme": {
    "primary": "#4154a3",
    "mode": "light"
  },
  "blocks": [
    {
      "id": "b1",
      "type": "emergency",
      "title": "Report an Emergency",
      "action": {
        "type": "voice_agent"
      }
    },
    {
      "id": "b2",
      "type": "weather",
      "title": "Live Weather & Flood Intel",
      "action": {
        "type": "weather"
      }
    }
  ]
}
```

Store normalized searchable fields in columns and flexible block configuration in JSONB. Do not put the entire application domain into one JSON document.

## Publish model
Editing changes a draft. Publishing creates a version:
- `draft`
- `published`
- `archived`

Only one version may be published for a VIVR at a time. Public traffic resolves the current published version.

## Indexing
At minimum index:
- `organization_id`
- tenant + status combinations
- public VIVR slug
- active phone number
- routing destination type/status
- voice session timestamps

Use Postgres constraints and unique indexes wherever a business invariant exists.

## Existing OSSK requirements to carry forward
Preserve star-number search, availability states, pattern tags, memorability score, reservation lifecycle, purchase/ownership lifecycle, invoices, renewals, sales proposals and auditability from the original specification.
