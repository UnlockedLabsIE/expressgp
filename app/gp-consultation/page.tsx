import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/lib/config/services";

export default function GpConsultationPage() {
  const service = getServiceBySlug("gp-consultation")!;
  return <ServicePagePlaceholder service={service} />;
}
