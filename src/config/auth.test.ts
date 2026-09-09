import { describe, expect, it } from "vitest";

import {
  isOrganizationRole,
  ORGANIZATION_ADMIN_ROLES,
  ORGANIZATION_ANALYST_ROLES,
  ORGANIZATION_EDITOR_ROLES,
  ORGANIZATION_OPERATOR_ROLES,
  ORGANIZATION_ROLES,
} from "./auth";

describe("organization roles configuration", () => {
  it("defines the complete application role set from the phase specification", () => {
    expect(ORGANIZATION_ROLES).toEqual([
      "org:admin",
      "org:editor",
      "org:operator",
      "org:analyst",
      "org:member",
    ]);
  });

  it("always includes org:admin in every capability role list", () => {
    for (const roles of [
      ORGANIZATION_ADMIN_ROLES,
      ORGANIZATION_EDITOR_ROLES,
      ORGANIZATION_OPERATOR_ROLES,
      ORGANIZATION_ANALYST_ROLES,
    ]) {
      expect(roles).toContain("org:admin");
    }
  });

  it("recognizes configured roles and rejects unknown values", () => {
    expect(isOrganizationRole("org:member")).toBe(true);
    expect(isOrganizationRole("org:admin")).toBe(true);
    expect(isOrganizationRole("org:unknown")).toBe(false);
    expect(isOrganizationRole(null)).toBe(false);
    expect(isOrganizationRole(42)).toBe(false);
  });
});
