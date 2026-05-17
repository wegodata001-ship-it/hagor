import { SITE_NAME } from "@/lib/store";
import { getSiteBaseUrl } from "@/lib/payments/config";

type Props = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image: string | null;
  inStock: boolean;
};

export function ProductJsonLd({ id, name, description, price, currency, image, inStock }: Props) {
  const base = getSiteBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description ?? name,
    image: image ? [image.startsWith("http") ? image : `${base}/${image.replace(/^\//, "")}`] : undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${base}/products/${id}`,
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
