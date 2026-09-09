import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

import {
  organizationAccessControl,
  organizationRoles,
} from "@/config/auth";

/**
 * Browser-side Better Auth client. Contains no secrets — only the public
 * base URL path. The matching `organizationClient` plugin (with the same
 * access-control/role configuration as the server) provides organization
 * list/create/switch, member state, and session hooks.
 */
export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac: organizationAccessControl,
      roles: organizationRoles,
    }),
  ],
});
