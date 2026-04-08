import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/app/lib/services";

export default function MedicalCertPage() {
  const service = getServiceBySlug("medical-cert")!;
  return <ServicePagePlaceholder service={service} />;
}
