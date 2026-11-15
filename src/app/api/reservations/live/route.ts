import { NextResponse } from "next/server";
import { createBookingStream } from "@/lib/booking/live-stream";
import { getMemberSession } from "@/lib/member-session";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const groupId = new URL(request.url).searchParams.get("groupId");

  if (!groupId || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(groupId)) {
    return NextResponse.json(
      { ok: false, message: "코트 정보가 올바르지 않습니다." },
      { status: 400, headers },
    );
  }

  try {
    const member = await getMemberSession(
      request.headers.get("x-kutc-member-session"),
    );

    if (!member) {
      return NextResponse.json(
        { ok: false, message: "동아리원 확인이 필요합니다." },
        { status: 401, headers },
      );
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("court_groups")
      .select("batch_id")
      .eq("id", groupId)
      .eq("is_archived", false)
      .maybeSingle();

    if (groupError) throw groupError;
    if (!group) {
      return NextResponse.json({ reservations: [] }, { headers });
    }

    if (new URL(request.url).searchParams.get("stream") === "1") {
      return createBookingStream(groupId, request.signal);
    }

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("reservation_batches")
      .select("open_at, display_until")
      .eq("id", group.batch_id)
      .maybeSingle();

    if (batchError) throw batchError;
    if (
      !batch ||
      Date.now() < Date.parse(batch.open_at) ||
      Date.now() > Date.parse(batch.display_until)
    ) {
      return NextResponse.json({ reservations: [] }, { headers });
    }

    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select(
        "id, group_id, slot_start_time, slot_end_time, court_number, reserver_name",
      )
      .eq("group_id", groupId)
      .is("cancelled_at", null);

    if (error) throw error;

    return NextResponse.json({ reservations: data ?? [] }, { headers });
  } catch {
    return NextResponse.json(
      { ok: false, message: "예약 현황을 불러오지 못했습니다." },
      { status: 500, headers },
    );
  }
}
