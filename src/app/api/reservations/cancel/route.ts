import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CancelReservationRequest = {
  reservationId: string;
  password: string;
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

function getOrCreateDeviceId(request: Request) {
  const existingDeviceId = getCookieValue(
    request.headers.get("cookie"),
    DEVICE_COOKIE_NAME
  );

  if (existingDeviceId) {
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
  const deviceId = getOrCreateDeviceId(request);
  const userAgent = request.headers.get("user-agent");

  const body = (await request.json()) as CancelReservationRequest;

  const reservationId = body.reservationId?.trim();
  const password = body.password ?? "";

  if (!reservationId || !password) {
    return withDeviceCookie(
      NextResponse.json(
        {
          ok: false,
          message: "예약 정보와 비밀번호를 입력해주세요.",
        },
        { status: 400 }
      ),
      deviceId
    );
  }

  const passwordHash = hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("password_hash", passwordHash)
    .is("cancelled_at", null)
    .select(
      "id, batch_id, group_id, segment_id, slot_start_time, slot_end_time, court_number, reserver_name, student_id"
    )
    .single();

  if (error || !data) {
    return withDeviceCookie(
      NextResponse.json(
        {
          ok: false,
          message: "예약 비밀번호가 올바르지 않습니다.",
        },
        { status: 401 }
      ),
      deviceId
    );
  }

  const { error: logError } = await supabaseAdmin
    .from("reservation_audit_logs")
    .insert({
      action: "cancel",
      reservation_id: data.id,
      batch_id: data.batch_id,
      group_id: data.group_id,
      segment_id: data.segment_id,
      slot_start_time: data.slot_start_time,
      slot_end_time: data.slot_end_time,
      court_number: data.court_number,
      reserver_name: data.reserver_name,
      student_id: data.student_id,
      device_id: deviceId,
      user_agent: userAgent,
    });

  if (logError) {
    console.error("reservation audit log insert failed", logError);
  }

  return withDeviceCookie(
    NextResponse.json({
      ok: true,
      message: "예약이 취소되었습니다.",
    }),
    deviceId
  );
}