import { getStoreContact } from "@/lib/contact";
import { getSiteUrl, SITE_SEO_TITLE } from "@/lib/site-url";

export function StoreJsonLd() {
  const contact = getStoreContact();
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: SITE_SEO_TITLE,
    telephone: contact.storePhone || undefined,
    url: siteUrl,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
