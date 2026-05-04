import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type AdminBatchesRequest = {
  adminPassword: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AdminBatchesRequest;

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  const { data: batches, error: batchesError } = await supabaseAdmin
    .from("reservation_batches")
    .select("id, title, start_date, end_date, open_at, created_at")
    .order("start_date", { ascending: false });

  if (batchesError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 주차 목록을 불러오지 못했습니다.",
        error: batchesError.message,
      },
      { status: 500 }
    );
  }

  const batchIds = (batches ?? []).map((batch) => batch.id);

  if (batchIds.length === 0) {
    return NextResponse.json({
      ok: true,
      batches: [],
    });
  }

  const { data: reservations, error: reservationsError } = await supabaseAdmin
    .from("reservations")
    .select("batch_id")
    .in("batch_id", batchIds)
    .is("cancelled_at", null);

  if (reservationsError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약자 수를 확인하지 못했습니다.",
        error: reservationsError.message,
      },
      { status: 500 }
    );
  }

  const reservationCountMap = new Map<string, number>();

  for (const reservation of reservations ?? []) {
    const currentCount = reservationCountMap.get(reservation.batch_id) ?? 0;
    reservationCountMap.set(reservation.batch_id, currentCount + 1);
  }

  const result = (batches ?? []).map((batch) => {
    const activeReservationCount = reservationCountMap.get(batch.id) ?? 0;

    return {
      id: batch.id,
      title: batch.title,
      startDate: batch.start_date,
      endDate: batch.end_date,
      openAt: batch.open_at,
      activeReservationCount,
      canOverwrite: activeReservationCount === 0,
    };
  });

  return NextResponse.json({
    ok: true,
    batches: result,
  });
}