# Phase 06 — LiveKit AI Voice Agent Platform

## Goal
Build a Vapi-like internal voice-agent layer specialized for the OSSK/VIVR product, using LiveKit Agents and a separate agent runtime.

## Separation of concerns
### Next.js application
Owns:
- agent configuration UI;
- prompts/instructions;
- provider settings;
- tools metadata;
- routing rules;
- call history;
- analytics;
- tenant configuration.

### LiveKit agent service
Owns:
- realtime audio session;
- STT;
- LLM;
- TTS;
- agent tool execution;
- SIP participant handling;
- call transfer orchestration.

Do not run the realtime agent loop inside a standard Next.js request/response handler.

## Agent entity
A `voice_agent` should contain:
- name
- description
- language(s)
- system instructions
- greeting
- LLM provider/model
- STT provider/model
- TTS provider/model
- tool allowlist
- transfer policy
- active version

Version prompts/configuration so production calls can be tied to the exact agent version used.

## Initial AI tool set
- `getCallerContext`
- `classifyEmergency`
- `getLocationContext`
- `lookupRoutingDestinations`
- `getWeatherRisk`
- `findNearestShelters`
- `sendSms`
- `sendWhatsApp`
- `transferCall`
- `endCall`

## OpenRouter
Use OpenRouter behind a provider adapter. Store only a model identifier and provider policy in the database; store the API key as a deployment secret.

Allow fallback models. Keep the model swappable without changing business logic.

## Voice pipeline
```text
PSTN/SIP
  -> LiveKit room
  -> STT
  -> Agent reasoning / tool calls
  -> TTS
  -> caller
```

## LiveKit session metadata
Pass only the minimum required context:
- organization ID
- VIVR ID/version
- voice agent ID/version
- inbound phone number ID
- call/session ID

Never pass secret credentials as room metadata.

## Inbound call flow
1. Telecom provider sends call to LiveKit SIP ingress.
2. LiveKit dispatches the call to the correct agent.
3. Agent greets caller.
4. Agent gathers intent/location/context.
5. Agent calls deterministic tools.
6. Agent either answers, sends information, or transfers the call.
7. Call events are persisted asynchronously.

## Outbound call flow
1. Authorized application action requests an outbound call.
2. Server validates tenant and destination.
3. LiveKit creates a SIP participant through a stored/inline outbound trunk.
4. Agent joins/controls the room.
5. Outcome is written to call history.

## Reliability
- Timeouts around tools.
- Retry idempotent provider calls.
- Graceful fallback response when integrations fail.
- Call termination cleanup.
- Correlation ID on every call.

## Acceptance tests
- Test agent joins a LiveKit room.
- Test STT → LLM → TTS loop.
- Test a tool call.
- Test inbound SIP call with a development number.
- Test outbound SIP call where supported.
- Test transfer flow with mocked destination provider.
