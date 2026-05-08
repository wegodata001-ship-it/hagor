import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const storeId = STORE_ID;
  const s = await prisma.storeSettings.findUnique({ where: { storeId } });
  return NextResponse.json({
    registrationEnabled: s?.registrationEnabled ?? true,
    requireEmailVerificationForCheckout: s?.requireEmailVerificationForCheckout ?? true,
  });
}
