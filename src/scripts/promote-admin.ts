import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";

import { grantsPlatformAdmin, isPlatformRole, PLATFORM_ADMIN_ROLE, type PlatformRole } from "@/config/auth";
import { createDatabase } from "@/server/db";
import { user as userTable } from "@/server/db/schema";

function loadLocalEnvFile() {
  if (typeof process.loadEnvFile !== "function") return;
  if (!existsSync(".env.local")) return;
  process.loadEnvFile(".env.local");
}

function usage(): never {
  process.stdout.write(
    [
      "Usage: pnpm auth:promote-admin --email user@example.com [--role platform_admin|user] [--list]",
      "",
      "Development-only tool that sets user.platform_role in the database.",
      "Never promotes every user; requires an explicit --email.",
      "Does not run when NODE_ENV=production.",
    ].join("\n"),
  );
  process.exit(1);
}

/**
 * Development-only platform-admin promotion.
 *
 * Sets `user.platform_role` for one explicitly named user. Requires a valid
 * email; refuses to run in production; prints only non-secret information
 * (email, role, timestamps). In production, promotion must go through a
 * protected server-side admin process — never this script.
 */
async function main() {
  loadLocalEnvFile();

  if (process.env.NODE_ENV === "production") {
    process.stderr.write("This tool is development-only. Use a protected admin process in production.\n");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const emailIndex = args.indexOf("--email");
  const roleIndex = args.indexOf("--role");
  const list = args.includes("--list");

  if (list) {
    const { client, db } = createDatabase();
    try {
      const admins = await db
        .select({ id: userTable.id, email: userTable.email, platformRole: userTable.platformRole })
        .from(userTable)
        .where(eq(userTable.platformRole, PLATFORM_ADMIN_ROLE));
      process.stdout.write(
        admins.length === 0
          ? "No platform admins yet.\n"
          : admins.map((admin) => `${admin.email} (${admin.platformRole})`).join("\n") + "\n",
      );
    } finally {
      await client.end();
    }
    process.exit(0);
  }

  const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    process.stderr.write("A valid --email is required.\n");
    usage();
  }

  const roleValue = roleIndex >= 0 ? args[roleIndex + 1] : PLATFORM_ADMIN_ROLE;
  if (!isPlatformRole(roleValue)) {
    process.stderr.write(`Invalid role. Allowed: user, platform_admin\n`);
    usage();
  }
  const role: PlatformRole = roleValue;

  const { client, db } = createDatabase();
  try {
    const [updated] = await db
      .update(userTable)
      .set({ platformRole: role, updatedAt: new Date() })
      .where(eq(userTable.email, email))
      .returning({ id: userTable.id, email: userTable.email, platformRole: userTable.platformRole });

    if (!updated) {
      process.stderr.write(`No user found with email ${email}. Sign-up must happen first.\n`);
      process.exit(1);
    }

    if (role === PLATFORM_ADMIN_ROLE && !grantsPlatformAdmin(updated.platformRole)) {
      process.stderr.write("Promotion failed unexpectedly.\n");
      process.exit(1);
    }

    process.stdout.write(`Updated ${updated.email}: platform_role = ${updated.platformRole}\n`);
  } finally {
    await client.end();
  }
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`Failed: ${String(error)}\n`);
  process.exit(1);
});
