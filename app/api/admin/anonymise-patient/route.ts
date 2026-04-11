import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  // Verify admin auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { patientId, reason } = await req.json();
  if (!patientId || !reason?.trim()) {
    return NextResponse.json({ error: "patientId and reason are required" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Call the stored procedure (defined in add_patient_anonymisation_procedure.sql)
  const { data, error } = await admin.rpc("anonymise_patient", {
    patient_id: patientId,
    reason: reason.trim(),
    requesting_admin_id: user.id,
  });

  if (error) {
    console.error("[anonymise-patient]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
