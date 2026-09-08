export const siteConfig = {
  name: "VIVR",
  description: "OSSK star-number inventory and VIVR marketplace.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
