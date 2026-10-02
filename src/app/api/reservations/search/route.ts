import { getMemberSession } from "@/lib/member-session";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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

const dayOffsetMap: Record<string, number> = {
  월요일: 0,
  화요일: 1,
  수요일: 2,
  목요일: 3,
  금요일: 4,
  토요일: 5,
  일요일: 6,
};

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

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getCourtDate(batchStartDate: string, dayName: string) {
  const offset = dayOffsetMap[dayName];

  if (offset === undefined) {
    return null;
  }

  return addDaysToDateString(batchStartDate, offset);
}

function getSlotEndTimeInKst(courtDate: string, slotEndTime: string) {
  const normalizedEndTime = normalizeTime(slotEndTime);

  return new Date(`${courtDate}T${normalizedEndTime}:00+09:00`).getTime();
}

export async function POST(request: Request) {
  const member = await getMemberSession(
    request.headers.get("x-kutc-member-session"),
  );
  if (!member)
    return NextResponse.json(
      { ok: false, message: "동아리원 확인이 필요합니다." },
      { status: 401 },
    );

  const reserverName = member.name;
  const studentId = member.studentId;

  if (!reserverName || !studentId) {
    return NextResponse.json(
      {
        ok: false,
        message: "이름과 학번을 모두 입력해주세요.",
      },
      { status: 400 },
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
    `,
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
      { status: 500 },
    );
  }

  const now = Date.now();
  const rows = (data ?? []) as RawReservation[];

  const reservations = rows.flatMap((reservation) => {
    const batch = getFirstItem(reservation.reservation_batches);
    const courtGroup = getFirstItem(reservation.court_groups);

    if (!batch || !courtGroup) {
      return [];
    }

    const courtDate = getCourtDate(batch.start_date, courtGroup.day_name);

    if (!courtDate) {
      return [];
    }

    const slotEndTime = getSlotEndTimeInKst(
      courtDate,
      reservation.slot_end_time,
    );

    if (slotEndTime <= now) {
      return [];
    }

    return [
      {
        id: reservation.id,
        title: batch.title ?? "코트예약",
        date: courtGroup.day_name ?? "",
        courtDate,
        courtName: (courtGroup.court_name ?? "")
          .replace(/기숙사\s*코트/g, "기숙사 코트")
          .replace(/의대\s*코트/g, "의대 코트"),
        time: `${normalizeTime(reservation.slot_start_time)} ~ ${normalizeTime(
          reservation.slot_end_time,
        )}`,
        slotStartTime: normalizeTime(reservation.slot_start_time),
        hours: Array.from(
          {
            length:
              Number(reservation.slot_end_time.slice(0, 2)) -
              Number(reservation.slot_start_time.slice(0, 2)),
          },
          (_, i) => Number(reservation.slot_start_time.slice(0, 2)) + i,
        ).map((hour) => ({
          hour,
          canCancel:
            new Date(`${courtDate}T00:00:00+09:00`).getTime() +
              (hour + 1) * 3600000 >
            now,
        })),
        slotEndTime: normalizeTime(reservation.slot_end_time),
        courtNumber: reservation.court_number,
        name: reservation.reserver_name,
        canCancel: true,
      },
    ];
  });

  return NextResponse.json({
    ok: true,
    reservations,
  });
}
