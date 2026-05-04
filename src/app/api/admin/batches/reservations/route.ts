import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type AdminBatchReservationsRequest = {
  adminPassword: string;
  batchId: string;
};

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

export async function POST(request: Request) {
  const body = (await request.json()) as AdminBatchReservationsRequest;

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  if (!body.batchId) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 주차 정보가 없습니다.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      reserver_name,
      student_id,
      slot_start_time,
      slot_end_time,
      court_number,
      created_at,
      court_groups (
        day_name,
        court_name
      )
    `
    )
    .eq("batch_id", body.batchId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약자 목록을 불러오지 못했습니다.",
        error: error.message,
      },
      { status: 500 }
    );
  }

  const reservations = (data ?? []).map((reservation) => {
    const courtGroup = Array.isArray(reservation.court_groups)
      ? reservation.court_groups[0]
      : reservation.court_groups;

    return {
      id: reservation.id,
      name: reservation.reserver_name,
      studentId: reservation.student_id,
      day: courtGroup?.day_name ?? "",
      courtName: courtGroup?.court_name ?? "",
      time: `${normalizeTime(reservation.slot_start_time)} ~ ${normalizeTime(
        reservation.slot_end_time
      )}`,
      courtNumber: reservation.court_number,
      createdAt: reservation.created_at,
    };
  });

  return NextResponse.json({
    ok: true,
    reservations,
  });
}