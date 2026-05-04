import crypto from "crypto";
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
  reserverName: string;
  studentId: string;
  password: string;
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

function cleanText(value: string) {
  return value.trim();
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function timeToHour(time: string) {
  return Number(time.slice(0, 2));
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getKoreaTodayDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

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

function makeSlots(startTime: string, endTime: string) {
  const slots: { slotStartTime: string; slotEndTime: string }[] = [];

  let hour = timeToHour(startTime);
  const endHour = timeToHour(endTime);

  if (hour % 2 === 1) {
    slots.push({
      slotStartTime: formatHour(hour),
      slotEndTime: formatHour(hour + 1),
    });

    hour += 1;
  }

  while (hour + 2 <= endHour) {
    slots.push({
      slotStartTime: formatHour(hour),
      slotEndTime: formatHour(hour + 2),
    });

    hour += 2;
  }

  return slots;
}

function isValidSlotInSegment({
  segmentStartTime,
  segmentEndTime,
  slotStartTime,
  slotEndTime,
}: {
  segmentStartTime: string;
  segmentEndTime: string;
  slotStartTime: string;
  slotEndTime: string;
}) {
  const slots = makeSlots(segmentStartTime, segmentEndTime);

  return slots.some(
    (slot) =>
      slot.slotStartTime === slotStartTime && slot.slotEndTime === slotEndTime
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateReservationRequest;

  const batchId = cleanText(body.batchId ?? "");
  const groupId = cleanText(body.groupId ?? "");
  const segmentId = cleanText(body.segmentId ?? "");
  const slotStartTime = normalizeTime(cleanText(body.slotStartTime ?? ""));
  const slotEndTime = normalizeTime(cleanText(body.slotEndTime ?? ""));
  const reserverName = cleanText(body.reserverName ?? "");
  const studentId = cleanText(body.studentId ?? "");
  const password = body.password ?? "";
  const courtNumber = Number(body.courtNumber);

  if (
    !batchId ||
    !groupId ||
    !segmentId ||
    !slotStartTime ||
    !slotEndTime ||
    !reserverName ||
    !studentId ||
    !password
  ) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 정보를 모두 입력해주세요.",
      },
      { status: 400 }
    );
  }

  if (![1, 2].includes(courtNumber)) {
    return NextResponse.json(
      {
        ok: false,
        message: "코트 번호가 올바르지 않습니다.",
      },
      { status: 400 }
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
      { status: 404 }
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
      { status: 403 }
    );
  }

  if (now > closeAt) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 가능 시간이 지났습니다.",
      },
      { status: 403 }
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
      { status: 404 }
    );
  }

  if (group.batch_id !== batchId) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 배너와 코트 정보가 일치하지 않습니다.",
      },
      { status: 400 }
    );
  }

  const dayOffset = dayOffsetMap[group.day_name];

  if (dayOffset === undefined) {
    return NextResponse.json(
      {
        ok: false,
        message: "요일 정보가 올바르지 않습니다.",
      },
      { status: 400 }
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
    { status: 403 }
  );
}

if (courtDate === today && slotStartTime <= currentTime) {
  return NextResponse.json(
    {
      ok: false,
      message: "이미 시작된 시간은 예약할 수 없습니다.",
    },
    { status: 403 }
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
      { status: 404 }
    );
  }

  if (segment.group_id !== groupId) {
    return NextResponse.json(
      {
        ok: false,
        message: "코트 정보가 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  if (courtNumber > segment.court_count) {
    return NextResponse.json(
      {
        ok: false,
        message: "선택한 면 번호가 올바르지 않습니다.",
      },
      { status: 400 }
    );
  }

  const isValidSlot = isValidSlotInSegment({
    segmentStartTime: normalizeTime(segment.start_time),
    segmentEndTime: normalizeTime(segment.end_time),
    slotStartTime,
    slotEndTime,
  });

  if (!isValidSlot) {
    return NextResponse.json(
      {
        ok: false,
        message: "시간표에 없는 예약 시간입니다.",
      },
      { status: 400 }
    );
  }

  const passwordHash = hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .insert({
      batch_id: batchId,
      group_id: groupId,
      segment_id: segmentId,
      slot_start_time: slotStartTime,
      slot_end_time: slotEndTime,
      court_number: courtNumber,
      reserver_name: reserverName,
      student_id: studentId,
      password_hash: passwordHash,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("reservations_unique_active_student")) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "기존 예약 내역이 있습니다.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "이미 예약된 시간입니다. 다른 시간을 선택해주세요.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: "예약 저장에 실패했습니다.",
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "예약이 완료되었습니다.",
    reservationId: data.id,
  });
}