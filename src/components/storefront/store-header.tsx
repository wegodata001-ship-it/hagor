"use client";

import type { UserRole } from "@prisma/client";
import { TopInfoBar } from "@/components/storefront/top-info-bar";
import { MainNavbar } from "@/components/storefront/main-navbar";

type Category = { id: string; parentId: string | null; name_he: string; name_ar: string; name_en: string };

export function StoreHeader({
  title,
  isLoggedIn,
  role,
  categories,
}: {
  title: string;
  isLoggedIn: boolean;
  role: UserRole | null;
  categories: Category[];
}) {
  return (
    <header>
      <TopInfoBar isLoggedIn={isLoggedIn} />
      <MainNavbar title={title} categories={categories} isLoggedIn={isLoggedIn} role={role} />
    </header>
  );
}
