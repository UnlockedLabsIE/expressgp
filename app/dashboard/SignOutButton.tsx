"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-xl bg-white/5 px-3 py-2 text-left text-sm font-medium text-white/55 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  );
}
