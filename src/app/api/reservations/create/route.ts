import {
  addDaysToDateString,
  dayOffsetMap,
  normalizeTime,
} from "@/lib/booking/time";
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

type CreateReservationRequest = {
  batchId: string;
  groupId: string;
  segmentId: string;
  slotStartTime: string;
  slotEndTime: string;
  courtNumber: number;
  password: string;
};

function getKoreaDateTimeParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  return {
    today: `${year}-${month}-${day}`,
    currentTime: `${hour}:${minute}`,
  };
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

  const body = await readJsonBody<CreateReservationRequest>(request);
  if (!body)
    return NextResponse.json(
      { ok: false, message: "예약 정보가 올바르지 않습니다." },
      { status: 400 },
    );

  const batchId = cleanText(body.batchId ?? "");
  const groupId = cleanText(body.groupId ?? "");
  const segmentId = cleanText(body.segmentId ?? "");
  const slotStartTime = normalizeTime(cleanText(body.slotStartTime ?? ""));
  const slotEndTime = normalizeTime(cleanText(body.slotEndTime ?? ""));
  const reserverName = member.name;
  const studentId = member.studentId;
  const password = typeof body.password === "string" ? body.password : "";
  const courtNumber = Number(body.courtNumber);

  if (
    !batchId ||
    !groupId ||
    !segmentId ||
    !slotStartTime ||
    !slotEndTime ||
    !reserverName ||
    !studentId ||
    !password.trim()
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 정보를 모두 입력해주세요.",
      },
      { status: 400 },
    );
  }

  if (![1, 2].includes(courtNumber)) {
    return NextResponse.json(
      {
        ok: false,
        message: "코트 번호가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const { data: batch, error: batchError } = await supabaseAdmin
    .from("reservation_batches")
    .select("id, start_date, open_at, close_at")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 배너를 찾을 수 없습니다.",
      },
      { status: 404 },
    );
  }

  const now = Date.now();
  const openAt = new Date(batch.open_at).getTime();
  const closeAt = new Date(batch.close_at).getTime();

  if (now < openAt) {
    return NextResponse.json(
      {
        ok: false,
        message: "아직 예약 오픈 전입니다.",
      },
      { status: 403 },
    );
  }

  if (now > closeAt) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 가능 시간이 지났습니다.",
      },
      { status: 403 },
    );
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from("court_groups")
    .select("id, batch_id, day_name")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return NextResponse.json(
      {
        ok: false,
        message: "코트 그룹을 찾을 수 없습니다.",
      },
      { status: 404 },
    );
  }

  if (group.batch_id !== batchId) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 배너와 코트 정보가 일치하지 않습니다.",
      },
      { status: 400 },
    );
  }

  const dayOffset = dayOffsetMap[group.day_name];

  if (dayOffset === undefined) {
    return NextResponse.json(
      {
        ok: false,
        message: "요일 정보가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const courtDate = addDaysToDateString(batch.start_date, dayOffset);
  const { today, currentTime } = getKoreaDateTimeParts();

  if (courtDate < today) {
    return NextResponse.json(
      {
        ok: false,
        message: "이미 지난 날짜의 예약입니다.",
      },
      { status: 403 },
    );
  }

  if (courtDate === today && slotEndTime <= currentTime) {
    return NextResponse.json(
      {
        ok: false,
        message: "이미 종료된 시간은 예약할 수 없습니다.",
      },
      { status: 403 },
    );
  }

  const { data: segment, error: segmentError } = await supabaseAdmin
    .from("court_segments")
    .select("id, group_id, start_time, end_time, court_count")
    .eq("id", segmentId)
    .single();

  if (segmentError || !segment) {
    return NextResponse.json(
      {
        ok: false,
        message: "해당 시간 구간을 찾을 수 없습니다.",
      },
      { status: 404 },
    );
  }

  if (segment.group_id !== groupId) {
    return NextResponse.json(
      {
        ok: false,
        message: "코트 정보가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  if (courtNumber > segment.court_count) {
    return NextResponse.json(
      {
        ok: false,
        message: "선택한 면 번호가 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  if (
    !/^([01]\d|2[0-3]):00$/.test(slotStartTime) ||
    !/^([01]\d|2[0-4]):00$/.test(slotEndTime) ||
    Number(slotEndTime.slice(0, 2)) - Number(slotStartTime.slice(0, 2)) < 1 ||
    Number(slotEndTime.slice(0, 2)) - Number(slotStartTime.slice(0, 2)) > 2
  ) {
    return NextResponse.json(
      { ok: false, message: "시간표에 없는 예약 시간입니다." },
      { status: 400 },
    );
  }
  const passwordHash = hashPassword(password);
  const { data, error } = await supabaseAdmin.rpc("kutc_create_booking", {
    p_request: {
      batch_id: batchId,
      group_id: groupId,
      slot_start_time: slotStartTime,
      slot_end_time: slotEndTime,
      court_number: courtNumber,
      reserver_name: reserverName,
      student_id: studentId,
      password_hash: passwordHash,
      created_device_id: deviceId,
      created_user_agent: userAgent,
    },
  });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("reservations_unique_active_student")) {
        return NextResponse.json(
          {
            ok: false,
            message: "기존 예약 내역이 있습니다.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "이미 예약된 시간입니다. 다른 시간을 선택해주세요.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message:
          error.code === "P0001" ? error.message : "예약 저장에 실패했습니다.",
        error: error.message,
      },
      { status: error.code === "P0001" ? 409 : 500 },
    );
  }

  return withDeviceCookie(
    NextResponse.json({
      ok: true,
      message: "예약이 완료되었습니다.",
      reservationId: data.reservationId,
      partial: data.partial,
      slotStartTime: data.slotStartTime,
      slotEndTime: data.slotEndTime,
    }),
    deviceId,
  );
}
