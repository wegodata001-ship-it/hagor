import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PRODUCTION_SITE_URL, SITE_SEO_DESCRIPTION, SITE_SEO_TITLE } from "@/lib/site-url";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(PRODUCTION_SITE_URL),
  title: { default: SITE_SEO_TITLE, template: `%s | ${SITE_SEO_TITLE}` },
  description: SITE_SEO_DESCRIPTION,
  applicationName: SITE_SEO_TITLE,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: PRODUCTION_SITE_URL,
    siteName: SITE_SEO_TITLE,
    title: SITE_SEO_TITLE,
    description: SITE_SEO_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SEO_TITLE,
    description: SITE_SEO_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreJsonLd />
        {children}
      </body>
    </html>
  );
}
