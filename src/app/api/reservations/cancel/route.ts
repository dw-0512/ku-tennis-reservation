import { getMemberSession } from "@/lib/member-session";
import {
  hashPassword,
  getOrCreateDeviceId,
  withDeviceCookie,
} from "@/lib/booking/server";
import { cleanText, readJsonBody } from "@/lib/server-request";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CancelReservationRequest = {
  reservationId: string;
  password: string;
  hours?: number[];
};

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

  const body = await readJsonBody<CancelReservationRequest>(request);
  if (!body)
    return NextResponse.json(
      { ok: false, message: "예약 정보가 올바르지 않습니다." },
      { status: 400 },
    );

  const reservationId = cleanText(body.reservationId);
  const password = typeof body.password === "string" ? body.password : "";

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
