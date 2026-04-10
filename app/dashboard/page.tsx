import { unstable_noStore as noStore } from "next/cache";
import { getActiveCases, getConsultations, getPartnerDoctor } from "@/lib/queries";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  noStore();
  const [consultations, activeCases, doctor] = await Promise.all([
    getConsultations(),
    getActiveCases(),
    getPartnerDoctor(),
  ]);
  return (
    <DashboardClient
      consultations={consultations}
      activeCases={activeCases}
      isAcceptingCases={doctor?.is_accepting_cases ?? true}
    />
  );
}
