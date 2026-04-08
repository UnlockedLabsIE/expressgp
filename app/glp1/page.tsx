import ServicePagePlaceholder from "@/app/components/ServicePagePlaceholder";
import { getServiceBySlug } from "@/lib/config/services";

export default function Glp1Page() {
  const service = getServiceBySlug("glp1")!;
  return <ServicePagePlaceholder service={service} />;
}
