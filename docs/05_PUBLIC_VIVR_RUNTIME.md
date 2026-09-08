# Phase 05 — Public VIVR Runtime and Performance

## Goal
Render a fast, mobile-first single-page VIVR that works from a simple public URL and is suitable for callers arriving from SMS, QR codes, ads or other channels.

## Public route
Use a stable route such as:
`/v/[slug]`

Optionally support a custom domain later.

## Rendering model
- Resolve slug → published VIVR version on the server.
- Return cacheable public content where appropriate.
- Use Server Components for initial page rendering.
- Hydrate only interactive blocks.
- Lazy-load maps, media-heavy components and third-party widgets.

## Block runtime contracts
Each block type should have:
- schema;
- preview renderer;
- public renderer;
- validation;
- optional analytics event;
- optional integration handler.

Example:
```ts
interface VivrBlockRenderer<TConfig> {
  type: string;
  validate(config: unknown): TConfig;
  Preview(props: { config: TConfig }): React.ReactNode;
  Public(props: { config: TConfig }): React.ReactNode;
}
```

## Public interactions
- Call button launches phone dialer.
- WhatsApp opens the configured WhatsApp destination.
- SMS launches messaging with optional prefilled text.
- Map opens map/directions.
- Form opens an inline modal or dedicated lightweight experience.
- Emergency report can start a form or connect to AI voice.
- Weather/Flood block retrieves approved data via a server endpoint.

## Analytics
Track minimal events:
- page_view
- block_view
- block_click
- call_click
- whatsapp_click
- sms_click
- form_start
- form_submit
- ai_call_start

Do not record sensitive payloads unnecessarily.

## Safety
- Escape all user-authored text.
- Sanitize rich content if any HTML is ever accepted.
- Do not expose internal IDs that grant authorization.
- Rate-limit public mutation endpoints.

## Acceptance tests
- Lighthouse/performance budget is defined.
- Public VIVR loads quickly on mobile.
- Published VIVR is read-only to anonymous visitors.
- Block clicks generate analytics events.
- Public route remains available independently of dashboard authentication.
