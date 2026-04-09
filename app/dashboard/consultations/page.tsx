import { getConsultations } from "@/lib/queries";
import ConsultationsClient from "./ConsultationsClient";

export default async function ConsultationsPage() {
  const consultations = await getConsultations();
  return <ConsultationsClient consultations={consultations} />;
}
