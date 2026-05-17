import { getStoreContact } from "@/lib/contact";
import { SITE_NAME } from "@/lib/store";

export function StoreJsonLd() {
  const contact = getStoreContact();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: SITE_NAME,
    telephone: contact.storePhone || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
