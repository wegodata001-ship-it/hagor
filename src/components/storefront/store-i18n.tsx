"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/localized";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  he: {
    freeShipping: "משלוח חינם מעל ₪499",
    customerService: "שירות לקוחות",
    orderTracking: "מעקב הזמנה",
    branches: "סניפים ומיקום",
    loginRegister: "התחברות / הרשמה",
    myAccount: "החשבון שלי",
    myOrders: "ההזמנות שלי",
    myPoints: "נקודות מועדון",
    logout: "התנתקות",
    categories: "קטגוריות",
    searchPlaceholder: "חיפוש ציוד טקטי, ביגוד, נעליים...",
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
    heroTitle: "ציוד טקטי מקצועי",
    heroSubtitle: "ביגוד, נעליים, אופטיקה והגנה — לשטח ולמשימה",
    heroCta: "לקטלוג המלא",
    sectionClothing: "ביגוד טקטי",
    sectionBoots: "נעלי טקטי",
    sectionProtection: "ציוד הגנה",
    sectionOptics: "אופטיקה",
    bestSellers: "הנמכרים ביותר",
    newArrivals: "חדשים",
    footerTagline: "ציוד צבאי וטקטי מקצועי — HAGOR BY WAEL",
    footerLinks: "קישורים",
    terms: "תנאי שימוש",
    privacy: "פרטיות",
    checkoutStep_cart: "עגלה",
    checkoutStep_details: "פרטים",
    checkoutStep_shipping: "משלוח",
    checkoutStep_payment: "תשלום",
    filterOpen: "סינון מוצרים",
    filterPrice: "טווח מחיר",
    filterSort: "מיון",
    sortNew: "חדשים",
    sortPriceAsc: "מחיר: נמוך לגבוה",
    sortPriceDesc: "מחיר: גבוה לנמוך",
    combatCollection: "Combat Collection",
    reviewsTitle: "ביקורות לקוחות",
    socialTitle: "עקבו אחרינו",
    featuredCategoriesKicker: "HAGOR BY WAEL",
    featuredCategoriesTitle: "קטגוריות מובילות",
    tapExploreSubcats: "הקש לתת־קטגוריות",
    tapCloseSubcats: "סגירת תת־קטגוריות",
    subcategoriesLabel: "בחרו קטגוריה",
    benefit1: "משלוחים חינם מעל ₪499",
    benefit2: "אחריות מלאה על ציוד טקטי",
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
    heroTitle: "معدات تكتيكية احترافية",
    heroSubtitle: "ملابس وأحذية وبصريات وحماية للميدان",
    heroCta: "تسوق الآن",
    sectionClothing: "ملابس تكتيكية",
    sectionBoots: "أحذية تكتيكية",
    sectionProtection: "معدات حماية",
    sectionOptics: "بصريات",
    bestSellers: "الأكثر مبيعاً",
    newArrivals: "وصل حديثاً",
    footerTagline: "معدات عسكرية وتكتيكية احترافية",
    footerLinks: "روابط",
    terms: "الشروط",
    privacy: "الخصوصية",
    checkoutStep_cart: "السلة",
    checkoutStep_details: "التفاصيل",
    checkoutStep_shipping: "الشحن",
    checkoutStep_payment: "الدفع",
    featuredCategoriesKicker: "HAGOR BY WAEL",
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
    heroTitle: "Professional Tactical Gear",
    heroSubtitle: "Clothing, boots, optics and protection for the field",
    heroCta: "Shop catalog",
    sectionClothing: "Tactical Clothing",
    sectionBoots: "Tactical Boots",
    sectionProtection: "Protection Gear",
    sectionOptics: "Optics",
    bestSellers: "Best sellers",
    newArrivals: "New arrivals",
    footerTagline: "Professional military & tactical equipment",
    footerLinks: "Links",
    terms: "Terms",
    privacy: "Privacy",
    checkoutStep_cart: "Cart",
    checkoutStep_details: "Details",
    checkoutStep_shipping: "Shipping",
    checkoutStep_payment: "Payment",
    featuredCategoriesKicker: "HAGOR BY WAEL",
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
