/**
 * Sync admin password from .env to the User table (bcrypt hash).
 *
 * Usage:
 *   npx tsx scripts/sync-admin-password.ts
 *   npx tsx scripts/sync-admin-password.ts admin@example.com MyPassword123 SUPER_ADMIN
 *
 * Env (optional):
 *   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
 *   STORE_OWNER_EMAIL / STORE_OWNER_PASSWORD
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

function loadEnvFile() {
  const path = join(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadEnvFile();
  const prisma = new PrismaClient();
  try {
    const storeId = (process.env.NEXT_PUBLIC_STORE_ID ?? "hagor").trim();
    const emailArg = process.argv[2]?.trim().toLowerCase();
    const passwordArg = process.argv[3]?.trim();
    const roleArg = (process.argv[4] ?? "STORE_OWNER").trim().toUpperCase();

    const email = (emailArg || process.env.SUPER_ADMIN_EMAIL || process.env.STORE_OWNER_EMAIL || "")
      .trim()
      .toLowerCase();
    const password =
      passwordArg || process.env.SUPER_ADMIN_PASSWORD || process.env.STORE_OWNER_PASSWORD || "";

    if (!email) throw new Error("Missing email (arg or SUPER_ADMIN_EMAIL / STORE_OWNER_EMAIL in .env)");
    if (!password) throw new Error("Missing password (arg or SUPER_ADMIN_PASSWORD / STORE_OWNER_PASSWORD in .env)");

    const role = roleArg === "SUPER_ADMIN" ? UserRole.SUPER_ADMIN : UserRole.STORE_OWNER;
    const hash = await bcrypt.hash(password, 12);

    const existing = await prisma.user.findFirst({ where: { storeId, email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role,
          password: hash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          acceptedTermsAt: existing.acceptedTermsAt ?? new Date(),
        },
      });
      console.log(JSON.stringify({ ok: true, action: "updated", email, role, storeId }));
      return;
    }

    await prisma.user.create({
      data: {
        storeId,
        name: role === UserRole.SUPER_ADMIN ? "Super Admin" : "Store Owner",
        email,
        password: hash,
        role,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
      },
    });
    console.log(JSON.stringify({ ok: true, action: "created", email, role, storeId }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
