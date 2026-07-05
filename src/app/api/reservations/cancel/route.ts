import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CancelReservationRequest = {
  reservationId: string;
  password: string;
};

type ReservationForCancel = {
  id: string;
  slot_end_time: string;
  reservation_batches:
    | {
        start_date: string;
      }
    | {
        start_date: string;
      }[]
    | null;
  court_groups:
    | {
        day_name: string;
      }
    | {
        day_name: string;
      }[]
    | null;
};

const DEVICE_COOKIE_NAME = "kutc_device_id";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const dayOffsetMap: Record<string, number> = {
  월요일: 0,
  화요일: 1,
  수요일: 2,
  목요일: 3,
  금요일: 4,
  토요일: 5,
  일요일: 6,
  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
  토: 5,
  일: 6,
};

function hashPassword(password: string) {
  const secret = process.env.RESERVATION_PASSWORD_SECRET;

  if (!secret) {
    throw new Error("RESERVATION_PASSWORD_SECRET is missing");
  }

  return crypto
    .createHash("sha256")
    .update(`${password}:${secret}`)
    .digest("hex");
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.trim().split("=");

    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

function isValidDeviceId(deviceId: string | null): deviceId is string {
  if (!deviceId) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    deviceId
  );
}

function getOrCreateDeviceId(request: Request): string {
  const existingDeviceId = getCookieValue(
    request.headers.get("cookie"),
    DEVICE_COOKIE_NAME
  );

  if (isValidDeviceId(existingDeviceId)) {
    return existingDeviceId;
  }

  return crypto.randomUUID();
}

function withDeviceCookie(response: NextResponse, deviceId: string) {
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: deviceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });

  return response;
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

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDayOffset(dayName: string) {
  const cleanedDayName = dayName.trim();

  if (cleanedDayName in dayOffsetMap) {
    return dayOffsetMap[cleanedDayName];
  }

  if (cleanedDayName.includes("월")) return 0;
  if (cleanedDayName.includes("화")) return 1;
  if (cleanedDayName.includes("수")) return 2;
  if (cleanedDayName.includes("목")) return 3;
  if (cleanedDayName.includes("금")) return 4;
  if (cleanedDayName.includes("토")) return 5;
  if (cleanedDayName.includes("일")) return 6;

  return null;
}

function getCourtDate(batchStartDate: string, dayName: string) {
  const offset = getDayOffset(dayName);

  if (offset === null) {
    return null;
  }

  return addDaysToDateString(batchStartDate, offset);
}

function getSlotEndTimeInKst(courtDate: string, endTime: string) {
  const normalizedEndTime = normalizeTime(endTime);

  return new Date(`${courtDate}T${normalizedEndTime}:00+09:00`).getTime();
}

export async function POST(request: Request) {
  const deviceId = getOrCreateDeviceId(request);
  const userAgent = request.headers.get("user-agent");

  const body = (await request.json()) as CancelReservationRequest;

  const reservationId = body.reservationId?.trim();
  const password = body.password ?? "";

  if (!reservationId || !password) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 정보와 비밀번호를 입력해주세요.",
      },
      { status: 400 }
    );
  }

  const passwordHash = hashPassword(password);

  const { data: reservationData, error: reservationError } =
    await supabaseAdmin
      .from("reservations")
      .select(
        `
        id,
        slot_end_time,
        reservation_batches (
          start_date
        ),
        court_groups (
          day_name
        )
      `
      )
      .eq("id", reservationId)
      .eq("password_hash", passwordHash)
      .is("cancelled_at", null)
      .maybeSingle();

  if (reservationError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 정보를 확인하는 중 오류가 발생했습니다.",
        error: reservationError.message,
      },
      { status: 500 }
    );
  }

  if (!reservationData) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  const reservation = reservationData as ReservationForCancel;
  const batch = getFirstItem(reservation.reservation_batches);
  const courtGroup = getFirstItem(reservation.court_groups);

  if (!batch || !courtGroup) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 날짜 정보를 확인할 수 없습니다.",
      },
      { status: 500 }
    );
  }

  const courtDate = getCourtDate(batch.start_date, courtGroup.day_name);

  if (!courtDate) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 날짜 정보를 확인할 수 없습니다.",
      },
      { status: 500 }
    );
  }

  const slotEndTime = getSlotEndTimeInKst(
    courtDate,
    reservation.slot_end_time
  );

  if (slotEndTime <= Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        message: "이미 종료된 예약은 취소할 수 없습니다.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({
      cancelled_at: new Date().toISOString(),
      cancelled_device_id: deviceId,
      cancelled_user_agent: userAgent,
    })
    .eq("id", reservation.id)
    .is("cancelled_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 취소에 실패했습니다.",
      },
      { status: 500 }
    );
  }

  return withDeviceCookie(
    NextResponse.json({
      ok: true,
      message: "예약이 취소되었습니다.",
    }),
    deviceId
  );
}
