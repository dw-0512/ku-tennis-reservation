import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-session";
import { getMemberReservations } from "@/lib/booking/my-reservations";

export async function POST(request: Request) {
  const member = await getMemberSession(
    request.headers.get("x-kutc-member-session"),
  );
  if (!member)
    return NextResponse.json(
      { ok: false, message: "동아리원 확인이 필요합니다." },
      { status: 401 },
    );
  try {
    const reservations = await getMemberReservations(member);
    return NextResponse.json({ ok: true, reservations });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 조회에 실패했습니다.",
        error: error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
