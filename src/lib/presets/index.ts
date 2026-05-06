import { PrismaClient } from "@prisma/client";
import { seedElectronicsPreset } from "./electronicsPreset";
import { seedFashionPreset } from "./fashionPreset";
import { seedRestaurantPreset } from "./restaurantPreset";

export type StoreBusinessType = "electronics" | "fashion" | "restaurant";

export async function seedStorePreset(
  prisma: PrismaClient,
  storeId: string,
  businessType: StoreBusinessType,
): Promise<void> {
  if (businessType === "electronics") {
    await seedElectronicsPreset(prisma, storeId);
    return;
  }
  if (businessType === "fashion") {
    await seedFashionPreset(prisma, storeId);
    return;
  }
  await seedRestaurantPreset(prisma, storeId);
}
