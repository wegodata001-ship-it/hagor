import { PrismaClient } from "@prisma/client";
import { seedHagourPreset } from "./hagourPreset";

export type StoreBusinessType = "hagour";

export async function seedStorePreset(
  prisma: PrismaClient,
  storeId: string,
  _businessType: StoreBusinessType = "hagour",
): Promise<void> {
  await seedHagourPreset(prisma, storeId);
}
