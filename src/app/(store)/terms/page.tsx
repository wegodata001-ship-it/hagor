import { OfficialLegalRoute } from "@/app/(store)/_legal/official-legal-route";
import { officialLegalMetadata } from "@/lib/official-legal-page";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return officialLegalMetadata("terms");
}

export default function TermsPage() {
  return <OfficialLegalRoute slug="terms" />;
}
