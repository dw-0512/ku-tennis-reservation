import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type AdminCancelReservationRequest = {
  adminPassword: string;
  reservationId: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AdminCancelReservationRequest;

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  if (!body.reservationId) {
    return NextResponse.json(
      {
        ok: false,
        message: "취소할 예약 정보가 없습니다.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", body.reservationId)
    .is("cancelled_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 취소에 실패했습니다.",
        error: error?.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "관리자 권한으로 예약이 취소되었습니다.",
  });
}