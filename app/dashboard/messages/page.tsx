import { unstable_noStore } from "next/cache";
import { getPartnerDoctor } from "@/lib/queries";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
  unstable_noStore();
  const doctor = await getPartnerDoctor();
  return (
    <MessagesClient isAcceptingCases={doctor?.is_accepting_cases ?? true} />
  );
}
