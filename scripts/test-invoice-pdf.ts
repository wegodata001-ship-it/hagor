/**
 * Realistic smoke test for the redesigned order-confirmation PDF.
 *
 * Emits eight PDF files under `.tmp/pdf-cases/` covering:
 *   A  1 product + pickup
 *   B  3 products + delivery
 *   C  discount applied
 *   D  long customer name / address / notes
 *   E  10+ products
 *   F  Arabic customer/product data
 *   G  English product names + LTR language
 *   H  multi-page (60 items)
 *
 * Run: `npx tsx scripts/test-invoice-pdf.ts`
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildOrderConfirmationPdf, type PdfLang, type PdfOrder } from "../src/lib/pdf/order-confirmation-pdf";

const OUT_DIR = path.resolve(".tmp/pdf-cases");

const business = {
  displayName: "HAGOUR BY WAEL",
  legalName: 'אמין בריזינטים ועבודות טקסטיל בע"מ',
  taxId: "516025954",
  phone: "054-779-3580",
  email: "hagourbywael@gmail.com",
  address: "רחוב הרצל 1, נצרת",
  website: "hagourbywael.com",
};

function baseOrder(overrides: Partial<PdfOrder> = {}): PdfOrder {
  return {
    orderNumber: "1021",
    createdAt: new Date("2026-09-16T10:32:00Z"),
    status: "CONFIRMED",
    paymentStatus: "PAID",
    fulfillmentStatus: "RECEIVED",
    customerName: "ישראל ישראלי",
    customerEmail: "customer@example.com",
    customerPhone: "052-1234567",
    address: "רחוב הרצל 12, דירה 4, תל אביב, 6120401",
    deliveryOptionName: "משלוח עד הבית",
    deliveryOptionType: "DELIVERY",
    deliveryPrice: 30,
    subtotal: 100,
    discountAmount: 0,
    pointsDiscountAmount: 0,
    total: 130,
    notes: null,
    items: [
      {
        productName: "מוצר בדיקה 3",
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        selectedOptions: null,
      },
    ],
    ...overrides,
  };
}

const payment = {
  provider: "hyp",
  amount: 130,
  paidAt: new Date("2026-09-16T10:33:12Z"),
  status: "settled",
  confirmationNumber: "AUTH-8842119",
};

type Case = {
  name: string;
  lang: PdfLang;
  order: PdfOrder;
  payment: typeof payment;
};

const cases: Case[] = [
  {
    name: "A-1product-pickup",
    lang: "he",
    order: baseOrder({
      deliveryOptionType: "PICKUP",
      deliveryOptionName: "איסוף עצמי",
      deliveryPrice: 0,
      total: 100,
      address: null,
    }),
    payment: { ...payment, amount: 100 },
  },
  {
    name: "B-3products-delivery",
    lang: "he",
    order: baseOrder({
      items: [
        { productName: "חגורה טקטית שחורה", quantity: 1, unitPrice: 250, totalPrice: 250, selectedOptions: null },
        { productName: "נרתיק אקדח", quantity: 2, unitPrice: 120, totalPrice: 240, selectedOptions: null },
        { productName: "תיק גב מבצעי", quantity: 1, unitPrice: 350, totalPrice: 350, selectedOptions: null },
      ],
      subtotal: 840,
      total: 870,
    }),
    payment: { ...payment, amount: 870 },
  },
  {
    name: "C-with-discount",
    lang: "he",
    order: baseOrder({
      items: [
        { productName: "חגורה טקטית שחורה", quantity: 1, unitPrice: 250, totalPrice: 200, selectedOptions: null },
      ],
      subtotal: 250,
      discountAmount: 50,
      total: 230,
    }),
    payment: { ...payment, amount: 230 },
  },
  {
    name: "D-long-text",
    lang: "he",
    order: baseOrder({
      customerName: "אברהם יצחק יעקב מרדכי בן דוד גולדשטיין-פרידמן",
      address:
        "רחוב הרב יהודה בן שמואל הלוי אבן תיבון 128, בניין ג, קומה 5, דירה 24, שכונת המושבה הגרמנית, ירושלים, מיקוד 9126548",
      notes:
        "אנא לספק את המשלוח בין השעות 10:00-14:00 בימים ראשון-חמישי בלבד. יש לתאם טלפונית מראש. במידה ולא נמצאתי בבית, יש להשאיר את החבילה עם השכן בדירה 22.",
    }),
    payment,
  },
  {
    name: "E-10-products",
    lang: "he",
    order: baseOrder({
      items: Array.from({ length: 12 }, (_, i) => ({
        productName: `פריט טקטי מקצועי מספר ${i + 1}`,
        quantity: (i % 3) + 1,
        unitPrice: 50 + i * 10,
        totalPrice: (50 + i * 10) * ((i % 3) + 1),
        selectedOptions: null,
      })),
      subtotal: 2340,
      total: 2370,
    }),
    payment: { ...payment, amount: 2370 },
  },
  {
    name: "F-arabic",
    lang: "ar",
    order: baseOrder({
      customerName: "أحمد محمود العلي",
      customerEmail: "ahmed@example.com",
      address: "شارع النصر 15، حيفا، 3300001",
      items: [
        { productName: "حزام تكتيكي أسود", quantity: 1, unitPrice: 250, totalPrice: 250, selectedOptions: null },
        { productName: "حقيبة ظهر ميدانية", quantity: 1, unitPrice: 350, totalPrice: 350, selectedOptions: null },
      ],
      subtotal: 600,
      total: 630,
    }),
    payment: { ...payment, amount: 630 },
  },
  {
    name: "G-english",
    lang: "en",
    order: baseOrder({
      customerName: "John Doe",
      customerEmail: "john@example.com",
      customerPhone: "+972-52-1234567",
      address: "12 Herzl St., Apt. 4, Tel Aviv 6120401, Israel",
      items: [
        { productName: "Tactical Belt (Black)", quantity: 1, unitPrice: 65, totalPrice: 65, selectedOptions: null },
        { productName: "Operator Backpack 40L", quantity: 1, unitPrice: 120, totalPrice: 120, selectedOptions: null },
      ],
      subtotal: 185,
      total: 215,
    }),
    payment: { ...payment, amount: 215 },
  },
  {
    name: "H-multi-page",
    lang: "he",
    order: baseOrder({
      items: Array.from({ length: 60 }, (_, i) => ({
        productName: `מוצר קטלוג HAGOR-${1000 + i}`,
        quantity: 1 + (i % 4),
        unitPrice: 40 + (i % 7) * 5,
        totalPrice: (40 + (i % 7) * 5) * (1 + (i % 4)),
        selectedOptions: null,
      })),
      subtotal: 6000,
      total: 6030,
    }),
    payment: { ...payment, amount: 6030 },
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const c of cases) {
    const bytes = await buildOrderConfirmationPdf({
      order: c.order,
      lang: c.lang,
      business,
      payment: c.payment,
    });
    const out = path.join(OUT_DIR, `${c.name}.pdf`);
    await writeFile(out, bytes);
    console.log(`✔ ${c.name.padEnd(24)}  ${(bytes.byteLength / 1024).toFixed(1).padStart(6)} KB  →  ${out}`);
  }
  console.log("\nAll PDF cases rendered successfully.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
