import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_ID } from "@/lib/store";

const orderInclude = {
  items: { orderBy: { id: "asc" as const } },
} satisfies Prisma.OrderInclude;

export type CustomerOrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function getOrCreateCustomerProfile(userId: string, storeId: string = STORE_ID) {
  const existing = await prisma.customerProfile.findFirst({
    where: { userId, storeId },
  });
  if (existing) return existing;

  const user = await prisma.user.findFirst({
    where: { id: userId, storeId },
    select: { name: true, email: true },
  });
  if (!user) return null;

  return prisma.customerProfile.create({
    data: {
      storeId,
      userId,
      pointsBalance: 0,
    },
  });
}

/** Link guest orders (same email) to the logged-in customer profile. */
export async function linkGuestOrdersToProfile(profileId: string, email: string, storeId: string = STORE_ID) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  await prisma.order.updateMany({
    where: {
      storeId,
      customerId: null,
      customerEmail: { equals: email.trim(), mode: "insensitive" },
    },
    data: { customerId: profileId },
  });
}

export async function listCustomerOrders(userId: string, storeId: string = STORE_ID): Promise<CustomerOrderWithItems[]> {
  const profile = await getOrCreateCustomerProfile(userId, storeId);
  if (!profile) return [];

  const user = await prisma.user.findFirst({
    where: { id: userId, storeId },
    select: { email: true },
  });
  if (user?.email) {
    await linkGuestOrdersToProfile(profile.id, user.email, storeId);
  }

  return prisma.order.findMany({
    where: {
      storeId,
      OR: [
        { customerId: profile.id },
        ...(user?.email
          ? [{ customerEmail: { equals: user.email.trim(), mode: "insensitive" as const }, customerId: null }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: orderInclude,
  });
}

export async function getCustomerOrderById(
  userId: string,
  orderId: string,
  storeId: string = STORE_ID,
): Promise<CustomerOrderWithItems | null> {
  const profile = await getOrCreateCustomerProfile(userId, storeId);
  if (!profile) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, storeId },
    select: { email: true },
  });
  if (user?.email) {
    await linkGuestOrdersToProfile(profile.id, user.email, storeId);
  }

  return prisma.order.findFirst({
    where: {
      id: orderId,
      storeId,
      OR: [
        { customerId: profile.id },
        ...(user?.email
          ? [{ customerEmail: { equals: user.email.trim(), mode: "insensitive" as const }, customerId: null }]
          : []),
      ],
    },
    include: orderInclude,
  });
}
