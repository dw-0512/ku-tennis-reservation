import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isScheduleDate, validateScheduleGroups } from "@/lib/booking/schedule";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "예약 일정 정보가 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (
    !process.env.ADMIN_PASSWORD ||
    body?.adminPassword !== process.env.ADMIN_PASSWORD
  )
    return NextResponse.json(
      { ok: false, message: "관리자 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  const { editingBatchId, reservationTitle, startDate, endDate, courtGroups } =
    body;
  if (
    typeof reservationTitle !== "string" ||
    !reservationTitle.trim() ||
    !isScheduleDate(startDate) ||
    !isScheduleDate(endDate) ||
    startDate > endDate ||
    (editingBatchId != null &&
      (typeof editingBatchId !== "string" || !editingBatchId.trim()))
  )
    return NextResponse.json(
      { ok: false, message: "예약 제목과 날짜를 확인해주세요." },
      { status: 400 },
    );
  const validationError = validateScheduleGroups(courtGroups);
  if (validationError)
    return NextResponse.json(
      { ok: false, message: validationError },
      { status: 400 },
    );
  const { data, error } = await supabaseAdmin.rpc("kutc_save_schedule", {
    p_request: {
      editingBatchId: editingBatchId ?? null,
      reservationTitle,
      startDate,
      endDate,
      courtGroups,
    },
  });
  if (error) {
    const conflict = ["23505", "23P01"].includes(error.code);
    return NextResponse.json(
      {
        ok: false,
        message: conflict
          ? "이미 저장된 날짜와 겹치는 예약 주차입니다. 저장된 주차를 불러와 수정해주세요."
          : error.code === "P0001"
            ? error.message
            : "예약 일정 저장에 실패했습니다.",
      },
      { status: conflict || error.code === "P0001" ? 409 : 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    message: editingBatchId
      ? "기존 예약 일정이 새 내용으로 수정되었습니다."
      : "예약 일정이 저장되었습니다.",
    batchId: data.batchId,
  });
}
