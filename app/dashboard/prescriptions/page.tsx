import { unstable_noStore as noStore } from "next/cache";
import PrescriptionsClient from "./PrescriptionsClient";

export const metadata = { title: "Prescriptions — ExpressGP" };

export default function PrescriptionsPage() {
  noStore();
  return <PrescriptionsClient />;
}
