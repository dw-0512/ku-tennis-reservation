import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CancelReservationRequest = {
  reservationId: string;
  password: string;
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

export async function POST(request: Request) {
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

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("password_hash", passwordHash)
    .is("cancelled_at", null)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "예약이 취소되었습니다.",
  });
}