import { unstable_noStore as noStore } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  getNotificationDeliveryLogForGP,
  getNotificationPreferences,
  getPartnerDoctor,
} from "@/lib/queries";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings — ExpressGP" };

export default async function SettingsPage() {
  noStore();

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [doctor, notifPrefs, deliveryLog] = await Promise.all([
    getPartnerDoctor(),
    getNotificationPreferences(),
    getNotificationDeliveryLogForGP(20),
  ]);

  return (
    <SettingsClient
      doctor={doctor}
      notifPrefs={notifPrefs}
      deliveryLog={deliveryLog}
      userEmail={user?.email ?? ""}
      lastSignInAt={user?.last_sign_in_at ?? null}
    />
  );
}
