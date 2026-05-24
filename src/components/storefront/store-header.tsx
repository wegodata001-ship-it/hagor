"use client";

import type { UserRole } from "@prisma/client";
import { TopInfoBar } from "@/components/storefront/top-info-bar";
import { MainNavbar } from "@/components/storefront/main-navbar";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function StoreHeader({
  title: _title,
  isLoggedIn,
  role,
  categories,
  storePhone,
  telHref,
  whatsappHref,
}: {
  title: string;
  isLoggedIn: boolean;
  role: UserRole | null;
  categories: Category[];
  storePhone: string;
  telHref: string;
  whatsappHref: string;
}) {
  return (
    <header>
      <TopInfoBar isLoggedIn={isLoggedIn} storePhone={storePhone} telHref={telHref} whatsappHref={whatsappHref} />
      <MainNavbar categories={categories} isLoggedIn={isLoggedIn} role={role} />
    </header>
  );
}
