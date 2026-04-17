import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isAdmin: false, isGP: false });
  }

  const admin = createAdminSupabaseClient();

  const [{ data: adminRow }, { data: gpRow }] = await Promise.all([
    admin
      .from("admin_users")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    admin
      .from("partner_doctors")
      .select("id")
      .eq("id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    isAdmin: !!adminRow,
    isGP: !!gpRow,
  });
}
