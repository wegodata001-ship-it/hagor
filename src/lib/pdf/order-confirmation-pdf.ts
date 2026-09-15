import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { BRAND_LEGAL_NAME } from "@/lib/brand";
import { STORE_PHONE } from "@/lib/store";
import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";
import { isOrderPaymentSettled } from "@/lib/order-tracking";
import type { OrderFulfillmentStatus, OrderPaymentStatus, OrderStatus } from "@prisma/client";

export type PdfLang = "he" | "ar" | "en";

type PdfOrder = {
  orderNumber: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string | null;
  deliveryOptionName: string;
  deliveryOptionType: string;
  deliveryPrice: { toString(): string } | number;
  subtotal: { toString(): string } | number;
  discountAmount: { toString(): string } | number;
  pointsDiscountAmount: { toString(): string } | number;
  total: { toString(): string } | number;
  items: {
    productName: string;
    quantity: number;
    unitPrice: { toString(): string } | number;
    totalPrice: { toString(): string } | number;
    selectedOptions: unknown;
  }[];
};

const GOLD = rgb(200 / 255, 146 / 255, 17 / 255);
const BLACK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.9, 0.9, 0.9);

function money(n: number): string {
  return `₪${n.toFixed(2)}`;
}

/** Visual RTL for pdf-lib (no BiDi engine): reverse runs of RTL letters. */
function shapeText(text: string, rtl: boolean): string {
  if (!rtl || !text) return text;
  const hasRtl = /[\u0590-\u05FF\u0600-\u06FF]/.test(text);
  if (!hasRtl) return text;
  return [...text].reverse().join("");
}

function t(lang: PdfLang) {
  if (lang === "en") {
    return {
      title: "Order confirmation",
      orderNumber: "Order number",
      date: "Date",
      paymentStatus: "Payment status",
      paid: "Paid",
      unpaid: "Unpaid",
      customer: "Customer details",
      name: "Name",
      phone: "Phone",
      email: "Email",
      items: "Order details",
      product: "Product",
      qty: "Qty",
      price: "Price",
      lineTotal: "Total",
      subtotal: "Subtotal",
      discount: "Discount",
      delivery: "Delivery",
      grandTotal: "Amount paid",
      fulfillment: "Fulfillment",
      pickup: "Store pickup",
      shipping: "Shipping",
      address: "Address",
      tactical: "TACTICAL",
    };
  }
  if (lang === "ar") {
    return {
      title: "تأكيد الطلب",
      orderNumber: "رقم الطلب",
      date: "التاريخ",
      paymentStatus: "حالة الدفع",
      paid: "مدفوع",
      unpaid: "غير مدفوع",
      customer: "بيانات العميل",
      name: "الاسم",
      phone: "الهاتف",
      email: "البريد",
      items: "تفاصيل الطلب",
      product: "المنتج",
      qty: "الكمية",
      price: "السعر",
      lineTotal: "الإجمالي",
      subtotal: "المجموع الفرعي",
      discount: "خصم",
      delivery: "التوصيل",
      grandTotal: "المبلغ المدفوع",
      fulfillment: "طريقة الاستلام",
      pickup: "استلام ذاتي",
      shipping: "توصيل",
      address: "العنوان",
      tactical: "TACTICAL",
    };
  }
  return {
    title: "אישור הזמנה",
    orderNumber: "מספר הזמנה",
    date: "תאריך",
    paymentStatus: "סטטוס תשלום",
    paid: "שולם",
    unpaid: "לא שולם",
    customer: "פרטי לקוח",
    name: "שם",
    phone: "טלפון",
    email: "אימייל",
    items: "פרטי הזמנה",
    product: "מוצר",
    qty: "כמות",
    price: "מחיר",
    lineTotal: "סה״כ",
    subtotal: "סכום ביניים",
    discount: "הנחה",
    delivery: "משלוח",
    grandTotal: "סה״כ ששולם",
    fulfillment: "אופן קבלה",
    pickup: "איסוף עצמי",
    shipping: "משלוח",
    address: "כתובת",
    tactical: "TACTICAL",
  };
}

async function loadFonts(pdf: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  pdf.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  const regularBytes = await readFile(path.join(dir, "Arial.ttf"));
  const boldBytes = await readFile(path.join(dir, "Arial-Bold.ttf")).catch(() => regularBytes);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

function drawText(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color?: ReturnType<typeof rgb>;
    rtl?: boolean;
    align?: "left" | "right";
    maxWidth?: number;
  },
) {
  const rtl = Boolean(opts.rtl);
  const shaped = shapeText(text, rtl);
  const width = opts.font.widthOfTextAtSize(shaped, opts.size);
  let x = opts.x;
  if (opts.align === "right" || (rtl && opts.align !== "left")) {
    x = opts.x - Math.min(width, opts.maxWidth ?? width);
  }
  page.drawText(shaped, {
    x,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color ?? BLACK,
    maxWidth: opts.maxWidth,
  });
  return width;
}

export async function buildOrderConfirmationPdf(input: {
  order: PdfOrder;
  lang?: PdfLang;
  storePhone?: string | null;
}): Promise<Uint8Array> {
  const lang = input.lang ?? "he";
  const rtl = lang !== "en";
  const labels = t(lang);
  const pdf = await PDFDocument.create();
  const { regular, bold } = await loadFonts(pdf);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 48;
  const contentW = width - margin * 2;
  let y = height - margin;

  const startX = rtl ? width - margin : margin;
  const align = rtl ? ("right" as const) : ("left" as const);

  // Header accent
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width,
    height: 8,
    color: GOLD,
  });

  drawText(page, BRAND_LEGAL_NAME, {
    x: startX,
    y: y - 8,
    size: 16,
    font: bold,
    color: BLACK,
    rtl,
    align,
  });
  y -= 28;
  drawText(page, labels.tactical, {
    x: startX,
    y,
    size: 9,
    font: regular,
    color: GOLD,
    rtl: false,
    align,
  });
  y -= 28;

  drawText(page, labels.title, {
    x: startX,
    y,
    size: 20,
    font: bold,
    color: BLACK,
    rtl,
    align,
  });
  y -= 18;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: GOLD,
  });
  y -= 28;

  const paid = isOrderPaymentSettled(
    input.order.paymentStatus as OrderPaymentStatus,
    input.order.status as OrderStatus,
  );
  const dateStr = new Date(input.order.createdAt).toLocaleDateString(
    lang === "en" ? "en-GB" : lang === "ar" ? "ar" : "he-IL",
  );

  const metaRows: [string, string][] = [
    [labels.orderNumber, input.order.orderNumber],
    [labels.date, dateStr],
    [labels.paymentStatus, paid ? labels.paid : labels.unpaid],
  ];

  for (const [k, v] of metaRows) {
    drawText(page, `${k}:`, {
      x: startX,
      y,
      size: 10,
      font: regular,
      color: MUTED,
      rtl,
      align,
    });
    const labelW = bold.widthOfTextAtSize(shapeText(`${k}: `, rtl), 10);
    drawText(page, v, {
      x: rtl ? startX - labelW : startX + labelW,
      y,
      size: 11,
      font: bold,
      color: BLACK,
      rtl: /[\u0590-\u05FF\u0600-\u06FF]/.test(v),
      align,
    });
    y -= 18;
  }

  y -= 10;
  drawText(page, labels.customer, {
    x: startX,
    y,
    size: 12,
    font: bold,
    color: GOLD,
    rtl,
    align,
  });
  y -= 20;

  for (const [k, v] of [
    [labels.name, input.order.customerName],
    [labels.phone, input.order.customerPhone],
    [labels.email, input.order.customerEmail],
  ] as const) {
    if (!v) continue;
    drawText(page, `${k}: ${v}`, {
      x: startX,
      y,
      size: 10,
      font: regular,
      color: BLACK,
      rtl: /[\u0590-\u05FF\u0600-\u06FF]/.test(`${k}${v}`),
      align,
      maxWidth: contentW,
    });
    y -= 16;
  }

  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: LINE,
  });
  y -= 22;

  drawText(page, labels.items, {
    x: startX,
    y,
    size: 12,
    font: bold,
    color: GOLD,
    rtl,
    align,
  });
  y -= 22;

  for (const item of input.order.items) {
    if (y < 120) break;
    const opts = parseSelectedOptions(item.selectedOptions);
    const vars = formatSelectedOptionsLines(opts, lang === "ar" ? "ar" : lang === "en" ? "en" : "he");
    const line = `${item.productName}  ×${item.quantity}  ${money(Number(item.unitPrice))}  ${money(Number(item.totalPrice))}`;
    drawText(page, line, {
      x: startX,
      y,
      size: 10,
      font: regular,
      color: BLACK,
      rtl: true,
      align,
      maxWidth: contentW,
    });
    y -= 14;
    for (const v of vars) {
      drawText(page, v, {
        x: startX,
        y,
        size: 8,
        font: regular,
        color: MUTED,
        rtl: true,
        align,
        maxWidth: contentW,
      });
      y -= 12;
    }
    y -= 4;
  }

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.75,
    color: LINE,
  });
  y -= 20;

  const discount = Number(input.order.discountAmount) + Number(input.order.pointsDiscountAmount);
  const totals: [string, string][] = [
    [labels.subtotal, money(Number(input.order.subtotal))],
    [labels.delivery, money(Number(input.order.deliveryPrice))],
  ];
  if (discount > 0) totals.push([labels.discount, `−${money(discount)}`]);
  totals.push([labels.grandTotal, money(Number(input.order.total))]);

  for (const [k, v] of totals) {
    const isGrand = k === labels.grandTotal;
    drawText(page, k, {
      x: startX,
      y,
      size: isGrand ? 12 : 10,
      font: isGrand ? bold : regular,
      color: isGrand ? BLACK : MUTED,
      rtl,
      align,
    });
    drawText(page, v, {
      x: rtl ? margin + 80 : width - margin,
      y,
      size: isGrand ? 12 : 10,
      font: bold,
      color: isGrand ? GOLD : BLACK,
      rtl: false,
      align: rtl ? "left" : "right",
    });
    y -= isGrand ? 20 : 16;
  }

  y -= 12;
  const fulfillment =
    input.order.deliveryOptionType === "PICKUP"
      ? labels.pickup
      : `${labels.shipping}${input.order.deliveryOptionName ? ` — ${input.order.deliveryOptionName}` : ""}`;
  drawText(page, `${labels.fulfillment}: ${fulfillment}`, {
    x: startX,
    y,
    size: 10,
    font: regular,
    color: BLACK,
    rtl,
    align,
    maxWidth: contentW,
  });
  y -= 16;

  if (input.order.deliveryOptionType !== "PICKUP" && input.order.address) {
    drawText(page, `${labels.address}: ${input.order.address}`, {
      x: startX,
      y,
      size: 10,
      font: regular,
      color: BLACK,
      rtl,
      align,
      maxWidth: contentW,
    });
    y -= 16;
  }

  // Footer
  const phone = input.storePhone?.trim() || STORE_PHONE;
  page.drawLine({
    start: { x: margin, y: 56 },
    end: { x: width - margin, y: 56 },
    thickness: 0.75,
    color: LINE,
  });
  const brandW = bold.widthOfTextAtSize(BRAND_LEGAL_NAME, 9);
  page.drawText(BRAND_LEGAL_NAME, {
    x: (width - brandW) / 2,
    y: 36,
    size: 9,
    font: bold,
    color: BLACK,
  });
  if (phone) {
    const phoneW = regular.widthOfTextAtSize(phone, 8);
    page.drawText(phone, {
      x: (width - phoneW) / 2,
      y: 22,
      size: 8,
      font: regular,
      color: MUTED,
    });
  }

  return pdf.save();
}
