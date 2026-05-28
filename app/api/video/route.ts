import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const WHEREBY_API = "https://api.whereby.dev/v1/meetings";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { consultationId } = await req.json();
  if (!consultationId) {
    return NextResponse.json({ error: "consultationId required" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("consultations")
    .select("id, partner_doctor_id, status")
    .eq("id", consultationId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  if (row.partner_doctor_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden — only the assigned GP can create a video room for this consultation" },
      { status: 403 },
    );
  }

  if (row.status === "pending") {
    return NextResponse.json(
      { error: "Claim this consultation before starting a video call" },
      { status: 409 },
    );
  }

  const apiKey = process.env.WHEREBY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Whereby API key not configured" }, { status: 500 });
  }

  const endDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const res = await fetch(WHEREBY_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endDate,
      fields: ["hostRoomUrl"],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[whereby]", err);
    return NextResponse.json({ error: "Failed to create room" }, { status: 502 });
  }

  const room = await res.json() as { roomUrl: string; hostRoomUrl: string; meetingId: string };

  const { error: updateErr } = await supabase
    .from("consultations")
    .update({
      video_call_url: room.roomUrl,
      video_call_scheduled_at: new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("partner_doctor_id", user.id);

  if (updateErr) {
    console.error("[whereby] consultation update", updateErr.message);
    return NextResponse.json({ error: "Failed to save room on consultation" }, { status: 500 });
  }

  return NextResponse.json({
    hostRoomUrl: room.hostRoomUrl,
    roomUrl: room.roomUrl,
    meetingId: room.meetingId,
  });
}
