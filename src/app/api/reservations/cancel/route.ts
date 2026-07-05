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
  court_date: string;
  slot_end_time: string;
};

const DEVICE_COOKIE_NAME = "kutc_device_id";
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

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

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
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

function getSlotEndTimeInKst(courtDate: string, endTime: string) {
  const normalizedEndTime = endTime.slice(0, 5);

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

  const { data: reservation, error: reservationError } = await supabaseAdmin
    .from("reservations")
    .select("id, court_date, slot_end_time")
    .eq("id", reservationId)
    .eq("password_hash", passwordHash)
    .is("cancelled_at", null)
    .single<ReservationForCancel>();

  if (reservationError || !reservation) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  const slotEndTime = getSlotEndTimeInKst(
    reservation.court_date,
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