import { OfficialLegalRoute } from "@/app/(store)/_legal/official-legal-route";
import { officialLegalMetadata } from "@/lib/official-legal-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return officialLegalMetadata("shipping-policy");
}

export default function ShippingPolicyPage() {
  return <OfficialLegalRoute slug="shipping-policy" />;
}
