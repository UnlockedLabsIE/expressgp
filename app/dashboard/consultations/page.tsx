import { unstable_noStore as noStore } from "next/cache";
import { getAllConsultations, getPartnerDoctor } from "@/lib/queries";
import ConsultationsClient from "./ConsultationsClient";

export default async function ConsultationsPage() {
  noStore();
  const [consultations, doctor] = await Promise.all([
    getAllConsultations(),
    getPartnerDoctor(),
  ]);
  return (
    <ConsultationsClient
      consultations={consultations}
      isAcceptingCases={doctor?.is_accepting_cases ?? true}
    />
  );
}
