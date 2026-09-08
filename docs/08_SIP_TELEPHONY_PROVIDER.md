# Phase 08 — SIP / Telephony Integration Layer

## Goal
Create a provider-agnostic telephony layer so Kenyan SIP/voice providers can be swapped without rewriting the VIVR or AI logic.

## Conceptual architecture
```text
Kenyan phone number / Star number
          |
      Telecom / SIP provider
          |
        LiveKit
          |
     Voice agent
          |
     Routing engine
```

## Provider abstraction
Create interfaces such as:
```ts
interface TelephonyProvider {
  validateDestination(input: string): Promise<void>;
  normalizeNumber(input: string): string;
  provisionOrRegisterNumber(input: ProvisionNumberInput): Promise<PhoneNumberRef>;
  getCapabilities(): Promise<ProviderCapabilities>;
}
```

LiveKit-specific trunk operations should stay inside a `telephony/livekit` integration module.

## Data to store
For each SIP trunk:
- provider name
- hostname
- region
- auth username reference
- secret reference (never plaintext in UI/database)
- inbound enabled
- outbound enabled
- default caller ID
- status
- organization ID

## Inbound
Configure LiveKit SIP inbound trunk and dispatch rules so a called number resolves to the proper VIVR/voice agent context.

Recommended mapping:
`phone_number -> organization -> VIVR -> voice_agent`

## Outbound
Use a stored LiveKit outbound trunk for reusable configuration. For multi-tenant variability, support inline trunk configuration only where necessary and approved.

## Kenya-specific provisioning
The platform must distinguish:
- normal Kenyan DID/MSISDN numbers;
- toll-free numbers;
- regulated short/star numbers.

Do not assume the app can self-provision regulated `*XXXX` numbers. Numbering and operator provisioning remain external/regulatory dependencies.

## Failover
A destination may have:
- primary number/SIP target;
- secondary number;
- fallback agency.

Do not automatically retry a live call multiple times in a way that can ring multiple destinations unexpectedly. Call-transfer retry policy must be explicit.

## Acceptance tests
- Mock provider can be used without real telecom charges.
- Test inbound trunk mapping.
- Test outbound trunk mapping.
- Caller ID handling is explicit.
- Credentials never appear in browser/network logs.
- Provider implementation can be replaced without changing routing or VIVR blocks.
