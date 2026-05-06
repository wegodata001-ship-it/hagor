import type { SessionPayload } from "./session";
import { STORE_ID } from "../store";
import type { UserRole } from "@prisma/client";

export function assertStoreScope(session: SessionPayload | null): SessionPayload {
  if (!session) throw new Error("Unauthorized");
  const expected = STORE_ID;
  if (session.role === "SUPER_ADMIN") return session;
  if (session.storeId !== expected) throw new Error("Forbidden");
  return session;
}

export function assertAdmin(session: SessionPayload | null): SessionPayload {
  const s = assertStoreScope(session);
  if (s.role !== "STORE_OWNER" && s.role !== "SUPER_ADMIN") throw new Error("Forbidden");
  return s;
}

export function assertCustomer(session: SessionPayload | null): SessionPayload {
  const s = assertStoreScope(session);
  if (s.role !== "CUSTOMER") throw new Error("Forbidden");
  return s;
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "STORE_OWNER" || role === "SUPER_ADMIN";
}
