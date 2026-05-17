import { PrismaClient } from "@prisma/client";
import { seedTacticalPreset } from "./tacticalPreset";

export type StoreBusinessType = "tactical";

export async function seedStorePreset(
  prisma: PrismaClient,
  storeId: string,
  _businessType: StoreBusinessType = "tactical",
): Promise<void> {
  await seedTacticalPreset(prisma, storeId);
}
