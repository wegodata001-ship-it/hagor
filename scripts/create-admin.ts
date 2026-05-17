import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = (process.argv[2] ?? "").trim().toLowerCase();
    const password = (process.argv[3] ?? "").trim();
    const roleRaw = (process.argv[4] ?? "SUPER_ADMIN").trim().toUpperCase();
    const storeId = (process.argv[5] ?? "hagor").trim();

    if (!email) throw new Error("Missing email arg");
    if (!password) throw new Error("Missing password arg");
    const role = roleRaw === "STORE_OWNER" ? UserRole.STORE_OWNER : UserRole.SUPER_ADMIN;

    const hash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findFirst({ where: { storeId, email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name || "Admin",
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
        name: "Admin",
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
  console.error(String(e instanceof Error ? e.message : e));
  process.exit(1);
});
