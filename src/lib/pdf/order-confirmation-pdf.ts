import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { BRAND_LEGAL_NAME } from "@/lib/brand";
import { STORE_PHONE } from "@/lib/store";
import { formatSelectedOptionsLines, parseSelectedOptions } from "@/lib/hagour-product-options";
import { isOrderPaymentSettled } from "@/lib/order-tracking";
import { shape, wrap, containsRtl } from "@/lib/pdf/bidi";
import type { OrderPaymentStatus, OrderStatus } from "@prisma/client";

export type PdfLang = "he" | "ar" | "en";

/** Raw order shape accepted by the renderer. */
export type PdfOrder = {
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
  /** Optional customer note attached to the order (Order.notes). */
  notes?: string | null;
  items: {
    productName: string;
    quantity: number;
    unitPrice: { toString(): string } | number;
    totalPrice: { toString(): string } | number;
    selectedOptions: unknown;
  }[];
};

/** Business identity block — sourced entirely from StoreSettings. Never invented. */
export type PdfBusiness = {
  /** Public display name (e.g. "HAGOUR BY WAEL"). */
  displayName?: string | null;
  /** Legal business name (e.g. "אמין בריזינטים ועבודות טקסטיל בע״מ"). */
  legalName?: string | null;
  /** Tax ID / VAT ID (e.g. "516025954"). Displayed as "ח.פ. …" / "Tax ID …" per lang. */
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
};

/** Payment record — only safe, non-sensitive fields. */
export type PdfPayment = {
  /** Provider slug (e.g. "hyp", "manual", "cash"). Mapped to a localized label. */
  provider?: string | null;
  amount?: number | null;
  paidAt?: Date | null;
  status?: string | null;
  /** Confirmation / receipt reference from the gateway. Safe to display. */
  confirmationNumber?: string | null;
};

// ─── Palette ────────────────────────────────────────────────────────────────
const GOLD: RGB = rgb(200 / 255, 146 / 255, 17 / 255);
const GOLD_SOFT: RGB = rgb(245 / 255, 232 / 255, 200 / 255);
const BLACK: RGB = rgb(0.07, 0.09, 0.15);
const MUTED: RGB = rgb(0.42, 0.45, 0.5);
const BORDER: RGB = rgb(0.88, 0.88, 0.9);
const CARD_BG: RGB = rgb(0.97, 0.97, 0.97);
const ROW_ALT_BG: RGB = rgb(0.98, 0.98, 0.98);
const HEADER_BG: RGB = rgb(0.09, 0.11, 0.16);
const WHITE: RGB = rgb(1, 1, 1);

// ─── Layout constants (points; A4 portrait) ────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const HEADER_H = 84;
const FOOTER_H = 48;
const BODY_TOP = PAGE_H - MARGIN - HEADER_H - 8;
const BODY_BOTTOM = MARGIN + FOOTER_H + 6;

// ─── Currency ───────────────────────────────────────────────────────────────
/**
 * ILS money label. The shekel sign is a strong LTR-classified character in
 * our shaper so "₪1.00" always renders exactly as written.
 */
function money(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}₪${abs.toFixed(2)}`;
}

function nz<T extends string | null | undefined>(v: T): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// ─── Localization ───────────────────────────────────────────────────────────
type Labels = ReturnType<typeof getLabels>;

function getLabels(lang: PdfLang) {
  if (lang === "en") {
    return {
      dir: "ltr" as const,
      tactical: "TACTICAL",
      titlePaid: "Order & Payment Confirmation",
      titleUnpaid: "Order Confirmation",
      docNumber: "Document no.",
      orderNumber: "Order no.",
      date: "Date",
      time: "Time",
      status: "Status",
      paymentStatus: "Payment",
      paymentMethod: "Payment method",
      paid: "Paid",
      unpaid: "Unpaid",
      pending: "Pending",
      businessDetails: "Business details",
      businessName: "Business",
      legalName: "Legal name",
      taxId: "Tax ID",
      phone: "Phone",
      email: "Email",
      address: "Address",
      website: "Website",
      customerDetails: "Customer",
      customerName: "Name",
      products: "Order items",
      colIndex: "#",
      colProduct: "Product",
      colQty: "Qty",
      colUnit: "Unit price",
      colDiscount: "Discount",
      colTotal: "Total",
      subtotal: "Subtotal",
      discount: "Discount",
      delivery: "Delivery",
      grandTotal: "Total",
      grandTotalPaid: "Total paid",
      paymentDetails: "Payment details",
      confirmationNumber: "Confirmation no.",
      amountPaid: "Amount paid",
      paidAt: "Payment date",
      fulfillmentDetails: "Fulfillment details",
      pickup: "Store pickup",
      shipping: "Delivery",
      recipient: "Recipient",
      method: "Method",
      notes: "Order notes",
      thankYou: "Thank you for choosing HAGOUR BY WAEL",
      pageOf: (a: number, b: number) => `Page ${a} of ${b}`,
      fmt: "en-GB",
    };
  }
  if (lang === "ar") {
    return {
      dir: "rtl" as const,
      tactical: "TACTICAL",
      titlePaid: "تأكيد الطلب والدفع",
      titleUnpaid: "تأكيد الطلب",
      docNumber: "رقم المستند",
      orderNumber: "رقم الطلب",
      date: "التاريخ",
      time: "الوقت",
      status: "الحالة",
      paymentStatus: "حالة الدفع",
      paymentMethod: "وسيلة الدفع",
      paid: "مدفوع",
      unpaid: "غير مدفوع",
      pending: "قيد المعالجة",
      businessDetails: "بيانات النشاط",
      businessName: "الاسم التجاري",
      legalName: "الاسم القانوني",
      taxId: "الرقم الضريبي",
      phone: "الهاتف",
      email: "البريد",
      address: "العنوان",
      website: "الموقع",
      customerDetails: "بيانات العميل",
      customerName: "الاسم",
      products: "تفاصيل الطلب",
      colIndex: "#",
      colProduct: "المنتج",
      colQty: "الكمية",
      colUnit: "سعر الوحدة",
      colDiscount: "خصم",
      colTotal: "الإجمالي",
      subtotal: "المجموع الفرعي",
      discount: "خصم",
      delivery: "التوصيل",
      grandTotal: "الإجمالي",
      grandTotalPaid: "المبلغ المدفوع",
      paymentDetails: "تفاصيل الدفع",
      confirmationNumber: "رقم التأكيد",
      amountPaid: "المبلغ المدفوع",
      paidAt: "تاريخ الدفع",
      fulfillmentDetails: "تفاصيل الاستلام",
      pickup: "استلام ذاتي",
      shipping: "توصيل",
      recipient: "المستلم",
      method: "الطريقة",
      notes: "ملاحظات",
      thankYou: "شكراً لاختياركم HAGOUR BY WAEL",
      pageOf: (a: number, b: number) => `صفحة ${a} من ${b}`,
      fmt: "ar",
    };
  }
  // he (default)
  return {
    dir: "rtl" as const,
    tactical: "TACTICAL",
    titlePaid: "אישור תשלום",
    titleUnpaid: "אישור הזמנה",
    docNumber: "מספר מסמך",
    orderNumber: "מספר הזמנה",
    date: "תאריך",
    time: "שעה",
    status: "סטטוס",
    paymentStatus: "סטטוס תשלום",
    paymentMethod: "אמצעי תשלום",
    paid: "שולם",
    unpaid: "לא שולם",
    pending: "בהמתנה",
    businessDetails: "פרטי העסק",
    businessName: "שם העסק",
    legalName: "שם משפטי",
    taxId: "ח.פ.",
    phone: "טלפון",
    email: "אימייל",
    address: "כתובת",
    website: "אתר",
    customerDetails: "פרטי לקוח",
    customerName: "שם",
    products: "פרטי הזמנה",
    colIndex: "#",
    colProduct: "מוצר",
    colQty: "כמות",
    colUnit: "מחיר יחידה",
    colDiscount: "הנחה",
    colTotal: "סה״כ",
    subtotal: "סכום ביניים",
    discount: "הנחה",
    delivery: "משלוח",
    grandTotal: "סה״כ לתשלום",
    grandTotalPaid: "סה״כ ששולם",
    paymentDetails: "פרטי תשלום",
    confirmationNumber: "מספר אישור עסקה",
    amountPaid: "סכום ששולם",
    paidAt: "תאריך תשלום",
    fulfillmentDetails: "אופן קבלה",
    pickup: "איסוף עצמי",
    shipping: "משלוח",
    recipient: "שם מקבל",
    method: "אופן קבלה",
    notes: "הערות להזמנה",
    thankYou: "תודה שבחרתם ב־HAGOUR BY WAEL",
    pageOf: (a: number, b: number) => `עמוד ${a} מתוך ${b}`,
    fmt: "he-IL",
  };
}

/** Map an internal payment provider slug to a human label per language. */
function paymentMethodLabel(provider: string | null | undefined, lang: PdfLang): string | null {
  if (!provider) return null;
  const key = provider.trim().toLowerCase();
  const map: Record<string, Record<PdfLang, string>> = {
    hyp: { he: "כרטיס אשראי", ar: "بطاقة ائتمان", en: "Credit card" },
    tranzila: { he: "כרטיס אשראי", ar: "بطاقة ائتمان", en: "Credit card" },
    "credit-card": { he: "כרטיס אשראי", ar: "بطاقة ائتمان", en: "Credit card" },
    creditcard: { he: "כרטיס אשראי", ar: "بطاقة ائتمان", en: "Credit card" },
    bit: { he: "Bit", ar: "Bit", en: "Bit" },
    paypal: { he: "PayPal", ar: "PayPal", en: "PayPal" },
    cash: { he: "מזומן", ar: "نقدي", en: "Cash" },
    manual: { he: "העברה ידנית", ar: "دفع يدوي", en: "Manual" },
    transfer: { he: "העברה בנקאית", ar: "تحويل بنكي", en: "Bank transfer" },
    "bank-transfer": { he: "העברה בנקאית", ar: "تحويل بنكي", en: "Bank transfer" },
  };
  return map[key]?.[lang] ?? provider;
}

// ─── Font loader ────────────────────────────────────────────────────────────
async function loadFonts(pdf: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  pdf.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  const regularBytes = await readFile(path.join(dir, "Arial.ttf"));
  const boldBytes = await readFile(path.join(dir, "Arial-Bold.ttf")).catch(() => regularBytes);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

// ─── Drawing primitives ─────────────────────────────────────────────────────
type TextOpts = {
  x: number;
  y: number;
  size: number;
  font: PDFFont;
  color?: RGB;
  /** Paragraph base direction. Defaults to false (LTR). */
  rtl?: boolean;
  /** left = anchor at x; right = anchor right-edge at x; center = anchor middle at x. */
  align?: "left" | "right" | "center";
  /** Optional wrap width (advisory — caller normally wraps ahead of time). */
  maxWidth?: number;
};

function drawText(page: PDFPage, raw: string, o: TextOpts): number {
  const rtl = Boolean(o.rtl);
  const shaped = shape(raw, rtl);
  const w = o.font.widthOfTextAtSize(shaped, o.size);
  let x = o.x;
  if (o.align === "right") x = o.x - w;
  else if (o.align === "center") x = o.x - w / 2;
  page.drawText(shaped, {
    x,
    y: o.y,
    size: o.size,
    font: o.font,
    color: o.color ?? BLACK,
  });
  return w;
}

// ─── Renderer entry ─────────────────────────────────────────────────────────
type FontPair = { regular: PDFFont; bold: PDFFont };

type Ctx = {
  pdf: PDFDocument;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  L: Labels;
  rtl: boolean;
  lang: PdfLang;
  regular: PDFFont;
  bold: PDFFont;
  business: Required<PdfBusiness>;
};

export async function buildOrderConfirmationPdf(input: {
  order: PdfOrder;
  lang?: PdfLang;
  storePhone?: string | null;
  business?: PdfBusiness | null;
  payment?: PdfPayment | null;
}): Promise<Uint8Array> {
  const lang: PdfLang = input.lang ?? "he";
  const L = getLabels(lang);
  const rtl = L.dir === "rtl";
  const pdf = await PDFDocument.create();
  const { regular, bold } = await loadFonts(pdf);

  const business: Required<PdfBusiness> = {
    displayName: nz(input.business?.displayName) ?? BRAND_LEGAL_NAME,
    legalName: nz(input.business?.legalName),
    taxId: nz(input.business?.taxId),
    phone: nz(input.business?.phone) ?? nz(input.storePhone) ?? STORE_PHONE,
    email: nz(input.business?.email),
    address: nz(input.business?.address),
    website: nz(input.business?.website),
  };

  const ctx: Ctx = {
    pdf,
    pages: [],
    page: null as unknown as PDFPage, // set by newPage()
    y: 0,
    L,
    rtl,
    lang,
    regular,
    bold,
    business,
  };
  newPage(ctx);

  const order = input.order;
  const payment = input.payment ?? null;
  const paid = isOrderPaymentSettled(
    order.paymentStatus as OrderPaymentStatus,
    order.status as OrderStatus,
  );

  drawTitle(ctx, paid ? L.titlePaid : L.titleUnpaid);
  drawDocInfoCard(ctx, order, paid, payment);
  drawTwoColumnInfo(ctx, order);
  drawProductsTable(ctx, order);
  drawTotals(ctx, order, paid);
  drawPaymentAndFulfillment(ctx, order, paid, payment);
  drawNotes(ctx, order);
  drawAllFooters(ctx);

  return pdf.save();
}

// ─── Page management ────────────────────────────────────────────────────────
function newPage(ctx: Ctx): PDFPage {
  const p = ctx.pdf.addPage([PAGE_W, PAGE_H]);
  ctx.pages.push(p);
  ctx.page = p;
  ctx.y = BODY_TOP;
  drawPageHeader(ctx, p);
  return p;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < BODY_BOTTOM) newPage(ctx);
}

// ─── Header band (drawn on every page) ─────────────────────────────────────
function drawPageHeader(ctx: Ctx, p: PDFPage): void {
  const { business, rtl, regular, bold, L } = ctx;

  p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: HEADER_BG });
  p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 3, width: PAGE_W, height: 3, color: GOLD });

  const bandTop = PAGE_H - 26;
  const brandX = rtl ? PAGE_W - MARGIN : MARGIN;
  const brandAlign: TextOpts["align"] = rtl ? "right" : "left";
  const contactX = rtl ? MARGIN : PAGE_W - MARGIN;
  const contactAlign: TextOpts["align"] = rtl ? "left" : "right";

  drawText(p, business.displayName ?? BRAND_LEGAL_NAME, {
    x: brandX,
    y: bandTop,
    size: 16,
    font: bold,
    color: WHITE,
    rtl: false,
    align: brandAlign,
  });
  drawText(p, L.tactical, {
    x: brandX,
    y: bandTop - 18,
    size: 9,
    font: regular,
    color: GOLD,
    rtl: false,
    align: brandAlign,
  });

  const contactLines: string[] = [];
  if (business.phone) contactLines.push(business.phone);
  if (business.email) contactLines.push(business.email);
  if (business.website) contactLines.push(business.website);
  let cy = bandTop;
  for (const line of contactLines) {
    drawText(p, line, {
      x: contactX,
      y: cy,
      size: 9,
      font: regular,
      color: WHITE,
      rtl: false,
      align: contactAlign,
    });
    cy -= 12;
  }
}

// ─── Title ─────────────────────────────────────────────────────────────────
function drawTitle(ctx: Ctx, title: string): void {
  const { page, rtl, bold } = ctx;
  const titleX = rtl ? PAGE_W - MARGIN : MARGIN;
  drawText(page, title, {
    x: titleX,
    y: ctx.y - 4,
    size: 22,
    font: bold,
    color: BLACK,
    rtl,
    align: rtl ? "right" : "left",
  });
  ctx.y -= 26;
  page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 1.5,
    color: GOLD,
  });
  ctx.y -= 12;
}

// ─── Document info card ────────────────────────────────────────────────────
function drawDocInfoCard(ctx: Ctx, order: PdfOrder, paid: boolean, payment: PdfPayment | null): void {
  const { page, rtl, regular, bold, L, lang } = ctx;
  const created = new Date(order.createdAt);
  const dateStr = created.toLocaleDateString(L.fmt);
  const timeStr = created.toLocaleTimeString(L.fmt, { hour: "2-digit", minute: "2-digit" });

  const paymentLabel =
    paymentMethodLabel(payment?.provider, lang) ?? (paid ? L.paid : "—");

  const rows: [string, string][] = [
    [L.docNumber, `HAGOR-${order.orderNumber}`],
    [L.orderNumber, order.orderNumber],
    [L.date, dateStr],
    [L.time, timeStr],
    [L.paymentStatus, paid ? L.paid : L.unpaid],
    [L.paymentMethod, paymentLabel ?? "—"],
  ];

  // 3 columns × 2 rows: label (8pt) + value (11pt) + gap → 24pt per row.
  const cellRowH = 24;
  const cols = 3;
  const cellW = (PAGE_W - MARGIN * 2) / cols;
  const rowsCount = Math.ceil(rows.length / cols);
  const cardH = 8 + rowsCount * cellRowH + 4;
  ensureSpace(ctx, cardH + 4);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - cardH,
    width: PAGE_W - MARGIN * 2,
    height: cardH,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.75,
  });

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cellLeft = MARGIN + col * cellW;
    const cellTop = ctx.y - 8 - row * cellRowH;

    const labelX = rtl ? cellLeft + cellW - 10 : cellLeft + 10;
    drawText(page, label, {
      x: labelX,
      y: cellTop,
      size: 7,
      font: regular,
      color: MUTED,
      rtl,
      align: rtl ? "right" : "left",
    });
    drawText(page, value, {
      x: labelX,
      y: cellTop - 11,
      size: 10.5,
      font: bold,
      color: BLACK,
      rtl: containsRtl(value),
      align: rtl ? "right" : "left",
      maxWidth: cellW - 20,
    });
  }
  ctx.y -= cardH + 10;
}

// ─── Business + Customer cards ─────────────────────────────────────────────
function drawTwoColumnInfo(ctx: Ctx, order: PdfOrder): void {
  const { rtl, regular, bold, L, business } = ctx;

  const bizRows: [string, string][] = [];
  if (business.displayName) bizRows.push([L.businessName, business.displayName]);
  if (business.legalName) bizRows.push([L.legalName, business.legalName]);
  if (business.taxId) bizRows.push([L.taxId, business.taxId]);
  if (business.phone) bizRows.push([L.phone, business.phone]);
  if (business.email) bizRows.push([L.email, business.email]);
  if (business.address) bizRows.push([L.address, business.address]);
  if (business.website) bizRows.push([L.website, business.website]);

  const custRows: [string, string][] = [];
  if (order.customerName) custRows.push([L.customerName, order.customerName]);
  if (order.customerPhone) custRows.push([L.phone, order.customerPhone]);
  if (order.customerEmail) custRows.push([L.email, order.customerEmail]);
  if (order.deliveryOptionType !== "PICKUP" && order.address)
    custRows.push([L.address, order.address]);

  const cardW = (PAGE_W - MARGIN * 2 - 12) / 2;
  const cardH = Math.max(measureInfoCard(bizRows, regular, cardW), measureInfoCard(custRows, regular, cardW), 90);
  ensureSpace(ctx, cardH + 4);

  const leftX = MARGIN;
  const rightX = MARGIN + cardW + 12;
  const bizX = rtl ? rightX : leftX;
  const custX = rtl ? leftX : rightX;

  drawInfoCard(ctx.page, bizX, ctx.y, cardW, cardH, L.businessDetails, bizRows, { regular, bold, rtl });
  drawInfoCard(ctx.page, custX, ctx.y, cardW, cardH, L.customerDetails, custRows, { regular, bold, rtl });
  ctx.y -= cardH + 10;
}

// Info-card layout constants — kept in sync between measure + draw.
const INFO_PAD = 10;
const INFO_HEADER = 24; // title (11pt) + underline + gap → yy starts at yTop-24
const INFO_LABEL_H = 10;
const INFO_VALUE_LH = 11;
const INFO_ROW_GAP = 1;

/**
 * Cards with 5+ rows switch to an internal 2-column layout so long
 * business/customer lists don't consume half the page.
 */
function isTwoColCard(rows: [string, string][]): boolean {
  return rows.length >= 5;
}

function rowHeight(font: PDFFont, value: string, textWidth: number): number {
  const wrapped = wrap(value, font, 10, textWidth);
  return INFO_LABEL_H + Math.max(1, wrapped.length) * INFO_VALUE_LH + INFO_ROW_GAP;
}

function measureInfoCard(rows: [string, string][], font: PDFFont, cardW: number): number {
  const two = isTwoColCard(rows);
  const gutter = 12;
  const innerW = cardW - INFO_PAD * 2 - (two ? gutter : 0);
  const cellW = two ? innerW / 2 : innerW;
  let sum = INFO_HEADER;
  if (!two) {
    for (const [, v] of rows) sum += rowHeight(font, v, cellW);
  } else {
    // Pair rows: left column gets even indices, right column odd.
    for (let i = 0; i < rows.length; i += 2) {
      const left = rowHeight(font, rows[i][1], cellW);
      const right = i + 1 < rows.length ? rowHeight(font, rows[i + 1][1], cellW) : 0;
      sum += Math.max(left, right);
    }
  }
  return sum + INFO_PAD;
}

function drawInfoCard(
  page: PDFPage,
  x: number,
  yTop: number,
  w: number,
  h: number,
  title: string,
  rows: [string, string][],
  ctx: FontPair & { rtl: boolean },
) {
  page.drawRectangle({
    x,
    y: yTop - h,
    width: w,
    height: h,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  const rtl = ctx.rtl;
  const headX = rtl ? x + w - INFO_PAD : x + INFO_PAD;
  drawText(page, title, {
    x: headX,
    y: yTop - 12,
    size: 10,
    font: ctx.bold,
    color: GOLD,
    rtl,
    align: rtl ? "right" : "left",
  });
  const underlineW = Math.min(60, w - INFO_PAD * 2);
  page.drawLine({
    start: { x: rtl ? headX - underlineW : headX, y: yTop - 16 },
    end: { x: rtl ? headX : headX + underlineW, y: yTop - 16 },
    thickness: 1,
    color: GOLD,
  });

  const two = isTwoColCard(rows);
  const gutter = 12;
  const innerW = w - INFO_PAD * 2 - (two ? gutter : 0);
  const cellW = two ? innerW / 2 : innerW;

  const drawRow = (anchorX: number, k: string, v: string, yy: number): number => {
    drawText(page, k, {
      x: anchorX,
      y: yy,
      size: 8,
      font: ctx.regular,
      color: MUTED,
      rtl,
      align: rtl ? "right" : "left",
    });
    let y2 = yy - INFO_LABEL_H;
    const lines = wrap(v, ctx.regular, 10, cellW);
    for (const line of (lines.length ? lines : [""])) {
      drawText(page, line, {
        x: anchorX,
        y: y2,
        size: 10,
        font: ctx.regular,
        color: BLACK,
        rtl: rtl || containsRtl(line),
        align: rtl ? "right" : "left",
      });
      y2 -= INFO_VALUE_LH;
    }
    return y2 - INFO_ROW_GAP;
  };

  if (!two) {
    let yy = yTop - INFO_HEADER;
    for (const [k, v] of rows) yy = drawRow(headX, k, v, yy);
  } else {
    // Two-column layout in reading order:
    //  rows[i]   → first column (base-direction start; RTL right, LTR left)
    //  rows[i+1] → second column (opposite side)
    const firstAnchor = headX;
    const secondAnchor = rtl ? headX - cellW - gutter : headX + cellW + gutter;
    let yy = yTop - INFO_HEADER;
    for (let i = 0; i < rows.length; i += 2) {
      const nextYFirst = drawRow(firstAnchor, rows[i][0], rows[i][1], yy);
      let nextYSecond = yy;
      if (i + 1 < rows.length) {
        nextYSecond = drawRow(secondAnchor, rows[i + 1][0], rows[i + 1][1], yy);
      }
      yy = Math.min(nextYFirst, nextYSecond);
    }
  }
}

// ─── Products table ─────────────────────────────────────────────────────────
function drawProductsTable(ctx: Ctx, order: PdfOrder): void {
  const { rtl, regular, bold, L, lang } = ctx;
  const tableW = PAGE_W - MARGIN * 2;

  const IDX = 24, QTY = 44, UNIT = 80, DISC = 64, TOTAL = 80;
  const PROD = tableW - (IDX + QTY + UNIT + DISC + TOTAL);
  type Col = { key: string; label: string; width: number; align: "left" | "right" | "center" };
  const cols: Col[] = [
    { key: "idx", label: L.colIndex, width: IDX, align: "center" },
    { key: "prod", label: L.colProduct, width: PROD, align: "left" },
    { key: "qty", label: L.colQty, width: QTY, align: "center" },
    { key: "unit", label: L.colUnit, width: UNIT, align: "right" },
    { key: "disc", label: L.colDiscount, width: DISC, align: "right" },
    { key: "total", label: L.colTotal, width: TOTAL, align: "right" },
  ];
  const layout = rtl ? [...cols].reverse() : cols;
  const xs: number[] = [];
  {
    let cx = MARGIN;
    for (const c of layout) {
      xs.push(cx);
      cx += c.width;
    }
  }
  const colOf = (key: string) => {
    const i = layout.findIndex((c) => c.key === key);
    return { x: xs[i], w: layout[i].width, align: layout[i].align };
  };

  const HEADER_ROW_H = 22;
  const MIN_ROW_H = 20;

  function drawTableHeader(yTop: number): number {
    ctx.page.drawRectangle({
      x: MARGIN,
      y: yTop - HEADER_ROW_H,
      width: tableW,
      height: HEADER_ROW_H,
      color: HEADER_BG,
    });
    for (const c of layout) {
      const { x, w } = colOf(c.key);
      let tx: number;
      if (c.align === "left") tx = x + 8;
      else if (c.align === "right") tx = x + w - 8;
      else tx = x + w / 2;
      drawText(ctx.page, c.label, {
        x: tx,
        y: yTop - 16,
        size: 9,
        font: bold,
        color: WHITE,
        rtl: rtl && containsRtl(c.label),
        align: c.align,
      });
    }
    return yTop - HEADER_ROW_H;
  }

  // Section heading
  ensureSpace(ctx, HEADER_ROW_H + MIN_ROW_H + 24);
  const headX = rtl ? PAGE_W - MARGIN : MARGIN;
  drawText(ctx.page, L.products, {
    x: headX,
    y: ctx.y - 2,
    size: 11,
    font: bold,
    color: GOLD,
    rtl,
    align: rtl ? "right" : "left",
  });
  ctx.y -= 16;

  // Header
  ctx.y = drawTableHeader(ctx.y);

  // Rows
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const opts = parseSelectedOptions(item.selectedOptions);
    const optLines = formatSelectedOptionsLines(opts, lang === "ar" ? "ar" : lang === "en" ? "en" : "he");
    const unitN = Number(item.unitPrice);
    const totalN = Number(item.totalPrice);
    const qty = item.quantity;
    const lineDiscount = Math.max(0, unitN * qty - totalN);

    const nameLines = wrap(item.productName, regular, 10, colOf("prod").w - 16);
    const optLinesWrapped: string[] = [];
    for (const ol of optLines) {
      optLinesWrapped.push(...wrap(ol, regular, 8, colOf("prod").w - 16));
    }
    const rowH = Math.max(MIN_ROW_H, 6 + nameLines.length * 12 + optLinesWrapped.length * 10 + 4);

    // Page break with header repetition
    if (ctx.y - rowH < BODY_BOTTOM) {
      newPage(ctx);
      ctx.y = drawTableHeader(ctx.y);
    }

    if (i % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - rowH,
        width: tableW,
        height: rowH,
        color: ROW_ALT_BG,
      });
    }
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y - rowH },
      end: { x: MARGIN + tableW, y: ctx.y - rowH },
      thickness: 0.4,
      color: BORDER,
    });

    // Index
    {
      const c = colOf("idx");
      drawText(ctx.page, String(i + 1), {
        x: c.x + c.w / 2,
        y: ctx.y - 14,
        size: 10,
        font: regular,
        color: MUTED,
        rtl: false,
        align: "center",
      });
    }
    // Product name + option lines
    {
      const c = colOf("prod");
      const anchorX = c.align === "right" ? c.x + c.w - 8 : c.x + 8;
      let ly = ctx.y - 14;
      for (const line of nameLines) {
        drawText(ctx.page, line, {
          x: anchorX,
          y: ly,
          size: 10,
          font: bold,
          color: BLACK,
          rtl: containsRtl(line),
          align: c.align,
        });
        ly -= 12;
      }
      for (const line of optLinesWrapped) {
        drawText(ctx.page, line, {
          x: anchorX,
          y: ly,
          size: 8,
          font: regular,
          color: MUTED,
          rtl: containsRtl(line),
          align: c.align,
        });
        ly -= 10;
      }
    }
    // Qty
    {
      const c = colOf("qty");
      drawText(ctx.page, String(qty), {
        x: c.x + c.w / 2,
        y: ctx.y - 14,
        size: 10,
        font: regular,
        color: BLACK,
        rtl: false,
        align: "center",
      });
    }
    // Unit price
    {
      const c = colOf("unit");
      drawText(ctx.page, money(unitN), {
        x: c.x + c.w - 8,
        y: ctx.y - 14,
        size: 10,
        font: regular,
        color: BLACK,
        rtl: false,
        align: "right",
      });
    }
    // Discount
    {
      const c = colOf("disc");
      drawText(ctx.page, lineDiscount > 0.001 ? `−${money(lineDiscount)}` : money(0), {
        x: c.x + c.w - 8,
        y: ctx.y - 14,
        size: 10,
        font: regular,
        color: lineDiscount > 0.001 ? GOLD : MUTED,
        rtl: false,
        align: "right",
      });
    }
    // Total
    {
      const c = colOf("total");
      drawText(ctx.page, money(totalN), {
        x: c.x + c.w - 8,
        y: ctx.y - 14,
        size: 10,
        font: bold,
        color: BLACK,
        rtl: false,
        align: "right",
      });
    }

    ctx.y -= rowH;
  }

  ctx.y -= 8;
}

// ─── Totals ────────────────────────────────────────────────────────────────
function drawTotals(ctx: Ctx, order: PdfOrder, paid: boolean): void {
  const { rtl, regular, bold, L } = ctx;
  const subtotalN = Number(order.subtotal);
  const discountN = Number(order.discountAmount) + Number(order.pointsDiscountAmount);
  const deliveryN = Number(order.deliveryPrice);
  const totalN = Number(order.total);

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: L.subtotal, value: money(subtotalN) },
  ];
  if (discountN > 0.001) rows.push({ label: L.discount, value: `−${money(discountN)}` });
  rows.push({ label: L.delivery, value: money(deliveryN) });
  rows.push({
    label: paid ? L.grandTotalPaid : L.grandTotal,
    value: money(totalN),
    strong: true,
  });

  ensureSpace(ctx, rows.length * 18 + (paid ? 20 : 0) + 16);
  const blockW = 260;
  const blockX0 = rtl ? MARGIN : PAGE_W - MARGIN - blockW;
  const blockX1 = blockX0 + blockW;
  for (const row of rows) {
    const size = row.strong ? 13 : 10;
    if (row.strong) {
      ctx.page.drawLine({
        start: { x: blockX0, y: ctx.y + 6 },
        end: { x: blockX1, y: ctx.y + 6 },
        thickness: 1,
        color: GOLD,
      });
    }
    const labelX = rtl ? blockX1 : blockX0;
    drawText(ctx.page, row.label, {
      x: labelX,
      y: ctx.y,
      size,
      font: row.strong ? bold : regular,
      color: row.strong ? BLACK : MUTED,
      rtl,
      align: rtl ? "right" : "left",
    });
    const valueX = rtl ? blockX0 : blockX1;
    drawText(ctx.page, row.value, {
      x: valueX,
      y: ctx.y,
      size,
      font: bold,
      color: row.strong ? GOLD : BLACK,
      rtl: false,
      align: rtl ? "left" : "right",
    });
    ctx.y -= row.strong ? 22 : 15;
  }
  if (paid) {
    const pillW = 62;
    const pillH = 16;
    const pillX = rtl ? blockX1 - pillW : blockX0;
    ctx.page.drawRectangle({
      x: pillX,
      y: ctx.y + 4,
      width: pillW,
      height: pillH,
      color: GOLD_SOFT,
      borderColor: GOLD,
      borderWidth: 0.75,
    });
    drawText(ctx.page, L.paid, {
      x: pillX + pillW / 2,
      y: ctx.y + 9,
      size: 9,
      font: bold,
      color: BLACK,
      rtl,
      align: "center",
    });
    ctx.y -= 12;
  }
  ctx.y -= 10;
}

// ─── Payment + Fulfillment cards ────────────────────────────────────────────
function drawPaymentAndFulfillment(
  ctx: Ctx,
  order: PdfOrder,
  paid: boolean,
  payment: PdfPayment | null,
): void {
  const { rtl, regular, bold, L, business, lang } = ctx;
  const payRows: [string, string][] = [];
  const methodLbl = paymentMethodLabel(payment?.provider, lang);
  if (methodLbl) payRows.push([L.paymentMethod, methodLbl]);
  if (payment?.paidAt) {
    const d = new Date(payment.paidAt);
    payRows.push([
      L.paidAt,
      `${d.toLocaleDateString(L.fmt)} ${d.toLocaleTimeString(L.fmt, { hour: "2-digit", minute: "2-digit" })}`,
    ]);
  }
  if (typeof payment?.amount === "number" && Number.isFinite(payment.amount)) {
    payRows.push([L.amountPaid, money(payment.amount)]);
  }
  payRows.push([L.status, paid ? L.paid : (payment?.status ?? L.unpaid)]);
  if (payment?.confirmationNumber) payRows.push([L.confirmationNumber, payment.confirmationNumber]);

  const fulRows: [string, string][] = [];
  const method =
    order.deliveryOptionType === "PICKUP"
      ? L.pickup
      : order.deliveryOptionName
        ? `${L.shipping} — ${order.deliveryOptionName}`
        : L.shipping;
  fulRows.push([L.method, method]);
  if (order.deliveryOptionType === "PICKUP") {
    if (business.address) fulRows.push([L.address, business.address]);
  } else {
    if (order.customerName) fulRows.push([L.recipient, order.customerName]);
    if (order.customerPhone) fulRows.push([L.phone, order.customerPhone]);
    if (order.address) fulRows.push([L.address, order.address]);
  }

  const cardW = (PAGE_W - MARGIN * 2 - 12) / 2;
  const cardH = Math.max(measureInfoCard(payRows, regular, cardW), measureInfoCard(fulRows, regular, cardW), 80);
  ensureSpace(ctx, cardH + 4);

  const leftX = MARGIN;
  const rightX = MARGIN + cardW + 12;
  const payX = rtl ? rightX : leftX;
  const fulX = rtl ? leftX : rightX;

  drawInfoCard(ctx.page, payX, ctx.y, cardW, cardH, L.paymentDetails, payRows, { regular, bold, rtl });
  drawInfoCard(ctx.page, fulX, ctx.y, cardW, cardH, L.fulfillmentDetails, fulRows, { regular, bold, rtl });
  ctx.y -= cardH + 10;
}

// ─── Notes (hidden when empty) ─────────────────────────────────────────────
function drawNotes(ctx: Ctx, order: PdfOrder): void {
  const { rtl, regular, bold, L } = ctx;
  const noteText = nz(order.notes);
  if (!noteText) return;

  const lines = wrap(noteText, regular, 10, PAGE_W - MARGIN * 2 - 24);
  const needed = 22 + 12 + lines.length * 14 + 14;
  ensureSpace(ctx, needed + 8);
  const boxTop = ctx.y;
  const boxH = needed;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: boxTop - boxH,
    width: PAGE_W - MARGIN * 2,
    height: boxH,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.75,
  });
  const headX = rtl ? PAGE_W - MARGIN - 12 : MARGIN + 12;
  drawText(ctx.page, L.notes, {
    x: headX,
    y: boxTop - 16,
    size: 10,
    font: bold,
    color: GOLD,
    rtl,
    align: rtl ? "right" : "left",
  });
  let ly = boxTop - 34;
  for (const line of lines) {
    drawText(ctx.page, line, {
      x: headX,
      y: ly,
      size: 10,
      font: regular,
      color: BLACK,
      rtl: rtl || containsRtl(line),
      align: rtl ? "right" : "left",
    });
    ly -= 14;
  }
  ctx.y = boxTop - boxH - 12;
}

// ─── Footer (drawn after all body content, once page count is known) ───────
function drawAllFooters(ctx: Ctx): void {
  const total = ctx.pages.length;
  for (let i = 0; i < total; i++) drawFooter(ctx, ctx.pages[i], i + 1, total);
}

function drawFooter(ctx: Ctx, page: PDFPage, pageNum: number, total: number): void {
  const { rtl, regular, bold, L, business } = ctx;
  const y0 = MARGIN + 4;
  page.drawLine({
    start: { x: MARGIN, y: y0 + 32 },
    end: { x: PAGE_W - MARGIN, y: y0 + 32 },
    thickness: 0.5,
    color: BORDER,
  });
  const brand = business.displayName ?? BRAND_LEGAL_NAME;
  drawText(page, brand, {
    x: PAGE_W / 2,
    y: y0 + 18,
    size: 9,
    font: bold,
    color: BLACK,
    rtl: false,
    align: "center",
  });
  const contactParts: string[] = [];
  if (business.phone) contactParts.push(business.phone);
  if (business.website) contactParts.push(business.website);
  const contact = contactParts.join(" · ");
  if (contact) {
    drawText(page, contact, {
      x: PAGE_W / 2,
      y: y0 + 6,
      size: 8,
      font: regular,
      color: MUTED,
      rtl: false,
      align: "center",
    });
  }
  if (total > 1) {
    const pageOf = L.pageOf(pageNum, total);
    const pgX = rtl ? MARGIN : PAGE_W - MARGIN;
    drawText(page, pageOf, {
      x: pgX,
      y: y0 + 6,
      size: 8,
      font: regular,
      color: MUTED,
      rtl,
      align: rtl ? "left" : "right",
    });
  }
  if (pageNum === total) {
    const thankX = rtl ? PAGE_W - MARGIN : MARGIN;
    drawText(page, L.thankYou, {
      x: thankX,
      y: y0 + 6,
      size: 8,
      font: regular,
      color: MUTED,
      rtl,
      align: rtl ? "right" : "left",
    });
  }
}
