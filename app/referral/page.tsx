import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/app/lib/services";

export default function ReferralPage() {
  const service = getServiceBySlug("referral")!;
  return <ServicePagePlaceholder service={service} />;
}
