import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const WHEREBY_API = "https://api.whereby.dev/v1/meetings";

export async function POST(req: NextRequest) {
  // Verify the GP is authenticated
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { consultationId } = await req.json();
  if (!consultationId) {
    return NextResponse.json({ error: "consultationId required" }, { status: 400 });
  }

  const apiKey = process.env.WHEREBY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Whereby API key not configured" }, { status: 500 });
  }

  // Room expires 2 hours from now
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

  // Save room URL to consultation so patient can also get it
  await supabase
    .from("consultations")
    .update({
      video_call_url: room.roomUrl,
      video_call_scheduled_at: new Date().toISOString(),
    })
    .eq("id", consultationId);

  return NextResponse.json({
    hostRoomUrl: room.hostRoomUrl,  // GP link (with host controls)
    roomUrl: room.roomUrl,          // Patient link
    meetingId: room.meetingId,
  });
}
