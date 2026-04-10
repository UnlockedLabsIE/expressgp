import { unstable_noStore } from "next/cache";
import PatientsClient from "./PatientsClient";

export default function PatientsPage() {
  unstable_noStore();
  return <PatientsClient />;
}
