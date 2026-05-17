import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_NAME } from "@/lib/store";
import { StoreJsonLd } from "@/components/storefront/store-json-ld";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: "HAGOR BY WAEL — Professional tactical, military and outdoor gear.",
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: "Tactical · Military · Outdoor — Premium gear store",
  },
  twitter: { card: "summary_large_image", title: SITE_NAME },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreJsonLd />
        {children}
      </body>
    </html>
  );
}
