"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AdminSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/55 ring-1 ring-white/10 transition-colors hover:bg-red-500/10 hover:text-red-300 hover:ring-red-500/20"
    >
      Sign out
    </button>
  );
}
