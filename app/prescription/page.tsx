import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/app/lib/services";

export default function PrescriptionPage() {
  const service = getServiceBySlug("prescription")!;
  return <ServicePagePlaceholder service={service} />;
}
