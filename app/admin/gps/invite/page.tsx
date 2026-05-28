import { unstable_noStore as noStore } from "next/cache";
import InviteGPClient from "./InviteGPClient";

export const metadata = { title: "Invite GP — Admin" };

export default function AdminInviteGPPage() {
  noStore();
  return <InviteGPClient />;
}
