import { unstable_noStore } from "next/cache";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  unstable_noStore();
  return <MessagesClient />;
}
