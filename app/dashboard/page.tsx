import { getActiveCases, getConsultations } from "@/lib/queries";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const [consultations, activeCases] = await Promise.all([
    getConsultations(),
    getActiveCases(),
  ]);
  return <DashboardClient consultations={consultations} activeCases={activeCases} />;
}
