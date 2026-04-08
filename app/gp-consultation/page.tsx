import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/app/lib/services";

export default function GpConsultationPage() {
  const service = getServiceBySlug("gp-consultation")!;
  return <ServicePagePlaceholder service={service} />;
}
