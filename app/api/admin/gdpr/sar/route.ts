import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

function adminGuard() {
  return createServerSupabaseClient().then(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, error: NextResponse.json({ error: "Unauthenticated" }, { status: 401 }) };
    const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
    if (!isAdmin) return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    return { user, error: null };
  });
}

// GET /api/admin/gdpr/sar — list all SAR requests
export async function GET() {
  const { user, error } = await adminGuard();
  if (error) return error;
  void user;

  const admin = createAdminSupabaseClient();
  const { data, error: dbError } = await admin
    .from("sar_requests")
    .select(`
      id, patient_email, patient_name, request_type, status,
      received_at, deadline_at, completed_at, notes,
      assigned_to, created_at, updated_at,
      patient:patients ( id, first_name, last_name )
    `)
    .order("received_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/gdpr/sar — create a new SAR request
export async function POST(req: NextRequest) {
  const { user, error } = await adminGuard();
  if (error) return error;

  const body = await req.json() as {
    patient_id?:    string;
    patient_email:  string;
    patient_name:   string;
    request_type:   string;
    notes?:         string;
  };

  if (!body.patient_email?.trim() || !body.patient_name?.trim() || !body.request_type) {
    return NextResponse.json(
      { error: "patient_email, patient_name and request_type are required" },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();

  const { data, error: dbError } = await admin
    .from("sar_requests")
    .insert({
      patient_id:    body.patient_id ?? null,
      patient_email: body.patient_email.trim().toLowerCase(),
      patient_name:  body.patient_name.trim(),
      request_type:  body.request_type,
      notes:         body.notes?.trim() ?? null,
      assigned_to:   user!.id,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id:   user!.id,
    actor_type: "admin",
    action:     "sar_created",
    table_name: "sar_requests",
    record_id:  data.id,
    new_value: {
      request_type:  body.request_type,
      patient_email: body.patient_email,
      legal_basis:   "GDPR Art.12 — 30-day response window from receipt",
    },
  });

  return NextResponse.json(data, { status: 201 });
}
