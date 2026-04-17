import { unstable_noStore as noStore } from "next/cache";
import AuditLogClient from "./AuditLogClient";

export const metadata = { title: "Audit log — ExpressGP" };

export default function AuditLogPage() {
  noStore();
  return <AuditLogClient />;
}
