import { unstable_noStore as noStore } from "next/cache";
import { getAllConsultations } from "@/lib/queries";
import ConsultationsClient from "./ConsultationsClient";

export default async function ConsultationsPage() {
  noStore();
  const consultations = await getAllConsultations();
  return <ConsultationsClient consultations={consultations} />;
}
