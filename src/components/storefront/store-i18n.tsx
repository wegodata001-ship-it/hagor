"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/localized";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  he: {
    freeShipping: "משלוח חינם מעל ₪299",
    customerService: "שירות לקוחות",
    orderTracking: "מעקב הזמנה",
    branches: "סניפים ומיקום",
    loginRegister: "התחברות / הרשמה",
    myAccount: "החשבון שלי",
    myOrders: "ההזמנות שלי",
    myPoints: "נקודות מועדון",
    logout: "התנתקות",
    categories: "קטגוריות",
    searchPlaceholder: "חיפוש מוצרים, מותגים ודגמים...",
    hotDeals: "מבצעים חמים",
    topCategories: "קטגוריות מובילות",
    addToCart: "הוסף לעגלה",
    outOfStock: "אזל מהמלאי",
    addedToCart: "המוצר נוסף לעגלה",
    cart: "עגלה",
    subtotal: "סכום ביניים",
    checkout: "מעבר לתשלום",
    emptyCart: "העגלה ריקה כרגע",
    allProducts: "כל המוצרים",
    heroTitle: "NEW TECH COLLECTION",
    heroSubtitle: "הדור החדש של המכשירים כבר כאן",
    heroCta: "Shop Now",
    featuredCategoriesKicker: "DESIGMA",
    featuredCategoriesTitle: "קטגוריות מובילות",
    tapExploreSubcats: "הקש לתת־קטגוריות",
    tapCloseSubcats: "סגירת תת־קטגוריות",
    subcategoriesLabel: "בחרו קטגוריה",
    benefit1: "משלוחים חינם מעל ₪299",
    benefit2: "אחריות יבואן רשמי",
    benefit3: "תשלום מאובטח",
    benefit4: "שירות לקוחות זמין",
    stock: "מלאי",
    lowStock: "נותרו פריטים אחרונים",
    inStock: "במלאי",
  },
  ar: {
    freeShipping: "شحن مجاني فوق ₪299",
    customerService: "خدمة العملاء",
    orderTracking: "تتبع الطلب",
    branches: "الفروع والموقع",
    loginRegister: "تسجيل الدخول / تسجيل",
    myAccount: "حسابي",
    myOrders: "طلباتي",
    myPoints: "نقاط الولاء",
    logout: "تسجيل الخروج",
    categories: "التصنيفات",
    searchPlaceholder: "ابحث عن المنتجات والعلامات التجارية...",
    hotDeals: "عروض ساخنة",
    topCategories: "تصنيفات مميزة",
    addToCart: "أضف إلى السلة",
    outOfStock: "نفد المخزون",
    addedToCart: "تمت إضافة المنتج إلى السلة",
    cart: "السلة",
    subtotal: "المجموع الفرعي",
    checkout: "الانتقال للدفع",
    emptyCart: "السلة فارغة الآن",
    allProducts: "كل المنتجات",
    heroTitle: "NEW TECH COLLECTION",
    heroSubtitle: "الجيل الجديد من الأجهزة هنا.",
    heroCta: "Shop Now",
    featuredCategoriesKicker: "DESIGMA",
    featuredCategoriesTitle: "تصنيفات مميزة",
    tapExploreSubcats: "اضغط للتصنيفات الفرعية",
    tapCloseSubcats: "إغلاق",
    subcategoriesLabel: "اختر التصنيف",
    benefit1: "شحن مجاني فوق ₪299",
    benefit2: "ضمان رسمي",
    benefit3: "دفع آمن",
    benefit4: "خدمة عملاء متاحة",
    stock: "المخزون",
    lowStock: "تبقّى عدد محدود",
    inStock: "متوفر",
  },
  en: {
    freeShipping: "Free shipping over ₪299",
    customerService: "Customer service",
    orderTracking: "Order tracking",
    branches: "Branches & location",
    loginRegister: "Login / Register",
    myAccount: "My account",
    myOrders: "My orders",
    myPoints: "Loyalty points",
    logout: "Logout",
    categories: "Categories",
    searchPlaceholder: "Search products, brands and models...",
    hotDeals: "Hot deals",
    topCategories: "Top categories",
    addToCart: "Add to cart",
    outOfStock: "Out of stock",
    addedToCart: "Product added to cart",
    cart: "Cart",
    subtotal: "Subtotal",
    checkout: "Proceed to checkout",
    emptyCart: "Your cart is empty",
    allProducts: "All products",
    heroTitle: "NEW TECH COLLECTION",
    heroSubtitle: "The next generation of devices is here.",
    heroCta: "Shop Now",
    featuredCategoriesKicker: "DESIGMA",
    featuredCategoriesTitle: "Featured categories",
    tapExploreSubcats: "Tap for subcategories",
    tapCloseSubcats: "Close",
    subcategoriesLabel: "Choose a category",
    benefit1: "Free shipping over ₪299",
    benefit2: "Official importer warranty",
    benefit3: "Secure payments",
    benefit4: "Available customer service",
    stock: "Stock",
    lowStock: "Only a few left",
    inStock: "In stock",
  },
};

type StoreI18nContextValue = {
  lang: Locale;
  dir: "rtl" | "ltr";
  setLang: (lang: Locale) => void;
  t: (key: string) => string;
};

const StoreI18nContext = createContext<StoreI18nContextValue | null>(null);

const KEY = "store_lang";

export function StoreI18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Locale>("he");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "he" || raw === "ar" || raw === "en") setLang(raw);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const value = useMemo<StoreI18nContextValue>(
    () => ({
      lang,
      dir: lang === "en" ? "ltr" : "rtl",
      setLang,
      t: (key: string) => dictionaries[lang][key] ?? dictionaries.he[key] ?? key,
    }),
    [lang],
  );

  return <StoreI18nContext.Provider value={value}>{children}</StoreI18nContext.Provider>;
}

export function useStoreI18n() {
  const ctx = useContext(StoreI18nContext);
  if (!ctx) throw new Error("useStoreI18n must be used within StoreI18nProvider");
  return ctx;
}
