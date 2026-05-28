import { unstable_noStore as noStore } from "next/cache";
import {
  getActiveCases,
  getConsultations,
  getHasFailedRedFlagNotificationLast24h,
  getPartnerDoctor,
} from "@/lib/queries";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  noStore();
  const [consultations, activeCases, doctor, hasRedFlagDeliveryFailure24h] = await Promise.all([
    getConsultations(),
    getActiveCases(),
    getPartnerDoctor(),
    getHasFailedRedFlagNotificationLast24h(),
  ]);
  return (
    <DashboardClient
      consultations={consultations}
      activeCases={activeCases}
      isAcceptingCases={doctor?.is_accepting_cases ?? true}
      hasRedFlagDeliveryFailure24h={hasRedFlagDeliveryFailure24h}
    />
  );
}
