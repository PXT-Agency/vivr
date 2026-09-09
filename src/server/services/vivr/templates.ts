import { z } from "zod";

import { VIVR_DEFAULT_BRAND_COLOR } from "@/config/vivr";

/**
 * Seed templates for new VIVRs (docs/04 "Templates").
 *
 * Every template only uses supported block types so the generated draft
 * validates with the same Zod schemas as a hand-built page. Placeholder
 * values are intentionally obvious (example.com, +254…) — the customer edits
 * them in the builder before publishing.
 */

export interface VivrTemplateBlock {
  type: string;
  title: string;
  config: Record<string, unknown>;
}

export interface VivrTemplate {
  key: string;
  label: string;
  description: string;
  descriptionText: string;
  brandColor: string;
  blocks: VivrTemplateBlock[];
}

export const vivrTemplateSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || value in vivrTemplates, {
    message: "Unknown template.",
  });

export const vivrTemplates: Record<string, VivrTemplate> = {
  emergency_response: {
    key: "emergency_response",
    label: "Emergency Response",
    description: "El Niño-style emergency page: alerts, reporting, hotlines, shelters.",
    descriptionText: "Official emergency information and actions.",
    brandColor: "#b91c1c",
    blocks: [
      {
        type: "alert",
        title: "Emergency alert",
        config: {
          content: "Flooding reported in low-lying areas. Follow official updates only.",
          severity: "warning",
        },
      },
      {
        type: "call",
        title: "Call the emergency hotline",
        config: { phone: "+254700000000" },
      },
      {
        type: "whatsapp",
        title: "Report an incident on WhatsApp",
        config: { phone: "+254700000000", message: "I want to report an incident." },
      },
      {
        type: "map",
        title: "Evacuation assembly points",
        config: { latitude: -1.2833, longitude: 36.8167, query: "Nairobi, Kenya" },
      },
      {
        type: "file",
        title: "Download the safety guide",
        config: { url: "https://example.com/safety-guide.pdf", fileName: "Safety guide" },
      },
    ],
  },
  government_services: {
    key: "government_services",
    label: "Government Services",
    description: "County office contacts, service portals and office locations.",
    descriptionText: "Official county services and contacts.",
    brandColor: "#0f4c81",
    blocks: [
      {
        type: "call",
        title: "Call the county office",
        config: { phone: "+254700000000" },
      },
      {
        type: "website",
        title: "eCitizen services portal",
        config: { url: "https://example.com/services" },
      },
      {
        type: "form",
        title: "Request a service",
        config: {
          fields: [
            { id: "name", label: "Your name", type: "text", required: true },
            { id: "phone", label: "Phone number", type: "tel", required: true },
            { id: "details", label: "What do you need?", type: "textarea", required: false },
          ],
          submitAction: { kind: "mailto", email: "services@example.com" },
        },
      },
      {
        type: "map",
        title: "Visit our offices",
        config: { latitude: -1.2833, longitude: 36.8167, query: "County headquarters" },
      },
    ],
  },
  hospital_health: {
    key: "hospital_health",
    label: "Hospital / Health",
    description: "Appointment booking, department lines and visiting info.",
    descriptionText: "Patient information and contacts.",
    brandColor: "#065f46",
    blocks: [
      {
        type: "alert",
        title: "Visiting hours",
        config: {
          content: "Ward visiting hours: 10:00–12:00 and 16:00–18:00 daily.",
          severity: "info",
        },
      },
      {
        type: "call",
        title: "Appointments desk",
        config: { phone: "+254700000000" },
      },
      {
        type: "form",
        title: "Book an appointment",
        config: {
          fields: [
            { id: "name", label: "Patient name", type: "text", required: true },
            { id: "phone", label: "Phone number", type: "tel", required: true },
            { id: "notes", label: "Reason for visit", type: "textarea", required: false },
          ],
          submitAction: { kind: "mailto", email: "appointments@example.com" },
        },
      },
      {
        type: "map",
        title: "How to find us",
        config: { latitude: -1.2833, longitude: 36.8167, query: "Hospital location" },
      },
    ],
  },
  corporate_contact_center: {
    key: "corporate_contact_center",
    label: "Corporate Contact Center",
    description: "Company switchboard, sales, support and social channels.",
    descriptionText: "Reach the right team, fast.",
    brandColor: VIVR_DEFAULT_BRAND_COLOR,
    blocks: [
      {
        type: "call",
        title: "Switchboard",
        config: { phone: "+254700000000" },
      },
      {
        type: "call",
        title: "Sales enquiries",
        config: { phone: "+254710000000" },
      },
      {
        type: "whatsapp",
        title: "Chat with support",
        config: { phone: "+254700000000", message: "Hello, I need help with…" },
      },
      {
        type: "website",
        title: "Company website",
        config: { url: "https://example.com" },
      },
      {
        type: "social",
        title: "Follow us",
        config: {
          links: [
            { platform: "x", url: "https://x.com/example" },
            { platform: "linkedin", url: "https://linkedin.com/company/example" },
          ],
        },
      },
    ],
  },
  utility_service_outage: {
    key: "utility_service_outage",
    label: "Utility / Service Outage",
    description: "Outage notices, fault reporting and account self-service.",
    descriptionText: "Service status and fault reporting.",
    brandColor: "#92400e",
    blocks: [
      {
        type: "alert",
        title: "Current outages",
        config: {
          content: "Scheduled maintenance on the main line this Saturday, 06:00–10:00.",
          severity: "warning",
        },
      },
      {
        type: "call",
        title: "Report a fault",
        config: { phone: "+254700000000" },
      },
      {
        type: "sms",
        title: "Text us a fault reference",
        config: { phone: "+254700000000", message: "FAULT " },
      },
      {
        type: "form",
        title: "Report an outage online",
        config: {
          fields: [
            { id: "account", label: "Account number", type: "text", required: true },
            { id: "area", label: "Area / estate", type: "text", required: true },
            { id: "details", label: "What happened?", type: "textarea", required: false },
          ],
          submitAction: { kind: "mailto", email: "faults@example.com" },
        },
      },
    ],
  },
};

export const VIVR_TEMPLATE_KEYS = Object.keys(vivrTemplates) as string[];

export function isVivrTemplateKey(value: unknown): value is string {
  return typeof value === "string" && value in vivrTemplates;
}

export function getVivrTemplate(key: string): VivrTemplate | null {
  return vivrTemplates[key] ?? null;
}
