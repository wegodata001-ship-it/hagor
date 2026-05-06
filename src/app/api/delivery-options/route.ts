import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStoreId } from "@/lib/store-config";

export async function GET() {
  const storeId = getStoreId();
  const [settings, options] = await Promise.all([
    prisma.storeSettings.findUnique({ where: { storeId } }),
    prisma.deliveryOption.findMany({
      where: { storeId, active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const filtered =
    settings?.pickupEnabled === false
      ? options.filter((o) => o.type !== "PICKUP")
      : options;
  return NextResponse.json({ options: filtered });
}
