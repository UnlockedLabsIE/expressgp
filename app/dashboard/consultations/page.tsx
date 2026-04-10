import { unstable_noStore as noStore } from "next/cache";
import { getConsultations } from "@/lib/queries";
import ConsultationsClient from "./ConsultationsClient";

export default async function ConsultationsPage() {
  noStore();
  const consultations = await getConsultations();
  return <ConsultationsClient consultations={consultations} />;
}
