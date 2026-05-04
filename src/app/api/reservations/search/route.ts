import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type SearchReservationRequest = {
  reserverName: string;
  studentId: string;
};

type RawReservation = {
  id: string;
  slot_start_time: string;
  slot_end_time: string;
  court_number: number;
  reserver_name: string;
  reservation_batches:
    | {
        title: string;
        start_date: string;
        end_date: string;
      }
    | {
        title: string;
        start_date: string;
        end_date: string;
      }[]
    | null;
  court_groups:
    | {
        day_name: string;
        court_name: string;
      }
    | {
        day_name: string;
        court_name: string;
      }[]
    | null;
};

function cleanText(value: string) {
  return value.trim();
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function getFirstItem<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SearchReservationRequest;

  const reserverName = cleanText(body.reserverName ?? "");
  const studentId = cleanText(body.studentId ?? "");

  if (!reserverName || !studentId) {
    return NextResponse.json(
      {
        ok: false,
        message: "이름과 학번을 모두 입력해주세요.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      slot_start_time,
      slot_end_time,
      court_number,
      reserver_name,
      reservation_batches (
        title,
        start_date,
        end_date
      ),
      court_groups (
        day_name,
        court_name
      )
    `
    )
    .eq("reserver_name", reserverName)
    .eq("student_id", studentId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 조회에 실패했습니다.",
        error: error.message,
      },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as RawReservation[];

  const reservations = rows.map((reservation) => {
    const batch = getFirstItem(reservation.reservation_batches);
    const courtGroup = getFirstItem(reservation.court_groups);

    return {
      id: reservation.id,
      title: batch?.title ?? "코트예약",
      date: courtGroup?.day_name ?? "",
      courtName: courtGroup?.court_name ?? "",
      time: `${normalizeTime(reservation.slot_start_time)} ~ ${normalizeTime(
        reservation.slot_end_time
      )}`,
      courtNumber: reservation.court_number,
      name: reservation.reserver_name,
    };
  });

  return NextResponse.json({
    ok: true,
    reservations,
  });
}