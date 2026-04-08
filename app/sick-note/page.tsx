import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/lib/config/services";

export default function SickNotePage() {
  const service = getServiceBySlug("sick-note")!;
  return <ServicePagePlaceholder service={service} />;
}
