# Phase 07 — AI Classification + Deterministic Smart Routing

## Goal
Implement intelligent routing for citizens/customers while keeping final destination selection deterministic, auditable and safe.

## Core rule
**The AI may interpret the caller. The routing engine decides the allowed destination.**

Never allow the model to return or invent arbitrary phone numbers.

## Classification output
Normalize AI output into a strict schema such as:
```ts
{
  emergencyType: "flood" | "landslide" | "fire" | "medical" | "crime" | "missing_person" | "other",
  urgency: "critical" | "high" | "normal",
  county?: string,
  subCounty?: string,
  locationText?: string,
  confidence: number,
  notes?: string
}
```

Validate with Zod. Reject malformed outputs.

## Routing engine inputs
- organization/VIVR
- emergency type
- urgency
- caller location
- county/sub-county
- business hours
- destination status
- destination priority
- fallback destination

## Destination record
A routing destination should include:
- organization ID
- display name
- agency/office
- destination type
- phone number or SIP target reference
- supported incident types
- supported counties
- priority
- active/inactive
- hours/availability
- fallback destination ID

## Example routing policy
```text
Flood + Nakuru
  -> Nakuru County Response Team
  -> fallback NDOC

National disaster / unknown county
  -> NDOC

Red Cross assistance
  -> Kenya Red Cross
```

Use configured destination records; never hard-code emergency numbers into prompts.

## Human escalation
When confidence is low:
1. Ask a clarifying question.
2. If still uncertain, route to the organization's default emergency desk.
3. Log why the fallback was used.

## Safety controls
- Never fabricate a destination.
- Never claim a transfer succeeded until LiveKit/provider confirms it.
- If all destinations fail, provide the configured emergency fallback instructions.
- Do not expose private destination data to callers unless configured as public.

## Audit
For every routing decision store:
- call ID
- classifier result
- routing rule ID
- chosen destination ID
- fallback, if any
- confidence
- timestamps
- transfer result

Store a concise decision trace, not the entire raw model chain-of-thought.

## Acceptance tests
- Same structured input always selects the same destination under identical routing rules.
- Invalid AI output is rejected safely.
- Unknown county uses fallback.
- Disabled destination is never selected.
- Transfer outcome is reflected accurately in call history.
