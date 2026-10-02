import { getMemberSession } from "@/lib/member-session";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CancelReservationRequest = {
  reservationId: string;
  password: string;
  hours?: number[];
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

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId);
}

function getOrCreateDeviceId(request: Request): string {
  const existingDeviceId = getCookieValue(
    request.headers.get("cookie"),
    DEVICE_COOKIE_NAME,
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

export async function POST(request: Request) {
  const member = await getMemberSession(
    request.headers.get("x-kutc-member-session"),
  );
  if (!member)
    return NextResponse.json(
      { ok: false, message: "동아리원 확인이 필요합니다." },
      { status: 401 },
    );
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
      { status: 400 },
    );
  }

  const { data: reservation, error: reservationError } = await supabaseAdmin
    .from("reservations")
    .select("student_id, reserver_name")
    .eq("id", reservationId)
    .maybeSingle();
  if (reservationError)
    return NextResponse.json(
      { ok: false, message: "예약 정보를 확인하지 못했습니다." },
      { status: 500 },
    );
  if (
    !reservation ||
    reservation.student_id !== member.studentId ||
    reservation.reserver_name !== member.name
  )
    return NextResponse.json(
      { ok: false, message: "본인의 예약만 취소할 수 있습니다." },
      { status: 403 },
    );

  const passwordHash = hashPassword(password);

  if (
    body.hours !== undefined &&
    (!Array.isArray(body.hours) ||
      body.hours.length < 1 ||
      body.hours.length > 2 ||
      body.hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23))
  ) {
    return NextResponse.json(
      { ok: false, message: "취소할 시간을 선택해주세요." },
      { status: 400 },
    );
  }
  const { error } = await supabaseAdmin.rpc("kutc_cancel_booking", {
    p_request: {
      reservationId,
      passwordHash,
      deviceId,
      userAgent,
      ...(body.hours !== undefined ? { hours: body.hours } : {}),
    },
  });
  if (error)
    return NextResponse.json(
      {
        ok: false,
        message:
          error.code === "P0001" ? error.message : "예약 취소에 실패했습니다.",
      },
      { status: error.code === "P0001" ? 400 : 500 },
    );

  return withDeviceCookie(
    NextResponse.json({
      ok: true,
      message: "예약이 취소되었습니다.",
    }),
    deviceId,
  );
}
