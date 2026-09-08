# Phase 04 — Self-Service One-Page VIVR Builder

## Goal
Let every customer create and publish a branded VIVR from their dashboard without developer intervention.

## Important product decision
The VIVR is a **single page**, similar in interaction model to a modern link-in-bio page. Do not create a screen/page hierarchy for normal VIVR content.

## Builder experience
Dashboard → VIVRs → New VIVR

### Step 1: Setup
- Name
- Public slug
- Star number association
- Logo
- Cover/hero image (optional)
- Description
- Brand color

### Step 2: Add blocks
Initial supported block types:
- Link
- Call
- WhatsApp
- SMS
- Website
- Location/map
- Emergency report
- Weather
- Flood map
- Shelter finder
- Safety guide
- File/document
- Form
- Alert/notice
- Social links
- Payment/external checkout
- AI voice agent
- Contact directory

### Step 3: Configure actions
Every block has an action contract. Example:
```ts
{
  type: "call",
  target: "phone_number_id"
}
```

For sensitive or provider-backed actions, store references to internal records rather than raw secrets.

### Step 4: Reorder
Use drag-and-drop ordering. Persist `sort_order` server-side. Provide keyboard-accessible alternatives.

### Step 5: Preview
Desktop builder with a mobile preview rail. Preview the **same public rendering component** used by the published VIVR so there is no design drift.

### Step 6: Publish
- Validate block configs with Zod.
- Validate required integrations.
- Create a new immutable VIVR version.
- Record who published it and when.
- Publish atomically.

## Builder UX requirements
- Autosave draft with debounce.
- Undo/redo for block arrangement where practical.
- Duplicate block.
- Enable/disable block.
- Delete with confirmation.
- Test action before publish.
- Draft/published status indicator.
- Version history with rollback.

## Templates
Seed templates:
1. Emergency Response.
2. Government Services.
3. Hospital/Health.
4. Corporate Contact Center.
5. Utility/Service Outage.

The Emergency Response template should match the El Niño concept already designed in the product work: emergency reporting, live weather/flood intelligence, safe shelters, safety guides, public alerts and contact/agency actions.

## Acceptance tests
- Customer can create VIVR without engineering help.
- Customer can add, edit, reorder and delete blocks.
- Preview equals public rendering.
- Publishing is atomic.
- Rollback restores the prior version.
- Tenant A cannot edit Tenant B's VIVR.
