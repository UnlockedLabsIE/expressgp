import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// PATCH /api/admin/gdpr/sar/[id] — update a SAR request (status, notes, assigned_to)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin", { uid: user.id });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as {
    status?:      string;
    notes?:       string;
    assigned_to?: string;
  };

  const admin = createAdminSupabaseClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status)       updates.status      = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.assigned_to)  updates.assigned_to = body.assigned_to;

  // If completing, record the timestamp
  if (body.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error: dbError } = await admin
    .from("sar_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await admin.from("audit_logs").insert({
    actor_id:   user.id,
    actor_type: "admin",
    action:     "sar_updated",
    table_name: "sar_requests",
    record_id:  id,
    new_value:  updates,
  });

  return NextResponse.json(data);
}
