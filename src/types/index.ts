/**
 * Shared application types. Feature-specific domain types are added by later
 * phases (star numbers, VIVR, telecom, billing).
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ActorId = string;
export type OrganizationId = string;
