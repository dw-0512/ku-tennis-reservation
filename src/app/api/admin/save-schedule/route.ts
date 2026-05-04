import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type TimeSegment = {
  id: number;
  startTime: string;
  endTime: string;
  courtCount: number;
};

type CourtGroup = {
  id: number;
  day: string;
  courtName: string;
  segments: TimeSegment[];
};

type SaveScheduleRequest = {
  adminPassword: string;
  editingBatchId?: string | null;
  reservationTitle: string;
  startDate: string;
  endDate: string;
  courtGroups: CourtGroup[];
};

type ActiveReservation = {
  id: string;
  slot_start_time: string;
  slot_end_time: string;
  court_number: number;
  court_groups:
    | {
        day_name: string;
        court_name: string;
      }
    | {
        day_name: string;
        court_name: string;
      }[]
    | null;
};

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function createKoreanTime(dateString: string, time: string) {
  return `${dateString}T${time}:00+09:00`;
}

function isValidTimeRange(startTime: string, endTime: string) {
  return startTime < endTime;
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

function getFirstItem<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function makeSlotKey({
  dayName,
  courtName,
  slotStartTime,
  slotEndTime,
  courtNumber,
}: {
  dayName: string;
  courtName: string;
  slotStartTime: string;
  slotEndTime: string;
  courtNumber: number;
}) {
  return `${dayName}-${courtName}-${slotStartTime}-${slotEndTime}-${courtNumber}`;
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

function buildProposedSlotKeys(courtGroups: CourtGroup[]) {
  const slotKeys = new Set<string>();

  for (const group of courtGroups) {
    for (const segment of group.segments) {
      const slots = makeSlots(segment.startTime, segment.endTime);

      for (const slot of slots) {
        for (
          let courtNumber = 1;
          courtNumber <= segment.courtCount;
          courtNumber += 1
        ) {
          slotKeys.add(
            makeSlotKey({
              dayName: group.day,
              courtName: group.courtName,
              slotStartTime: slot.slotStartTime,
              slotEndTime: slot.slotEndTime,
              courtNumber,
            })
          );
        }
      }
    }
  }

  return slotKeys;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SaveScheduleRequest;

  const {
    adminPassword,
    editingBatchId,
    reservationTitle,
    startDate,
    endDate,
    courtGroups,
  } = body;

  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  if (!reservationTitle || !startDate || !endDate) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 제목, 시작 날짜, 종료 날짜가 필요합니다.",
      },
      { status: 400 }
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      {
        ok: false,
        message: "시작 날짜는 종료 날짜보다 늦을 수 없습니다.",
      },
      { status: 400 }
    );
  }

  for (const group of courtGroups) {
    for (const segment of group.segments) {
      if (!isValidTimeRange(segment.startTime, segment.endTime)) {
        return NextResponse.json(
          {
            ok: false,
            message: `${group.day} ${group.courtName}의 시간 구간이 올바르지 않습니다.`,
          },
          { status: 400 }
        );
      }

      if (![1, 2].includes(segment.courtCount)) {
        return NextResponse.json(
          {
            ok: false,
            message: `${group.day} ${group.courtName}의 면 수가 올바르지 않습니다.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const openDate = addDays(startDate, -1);
  const openAt = createKoreanTime(openDate, "14:00");
  const closeAt = createKoreanTime(endDate, "22:00");
  const displayUntil = createKoreanTime(endDate, "22:00");

  const { data: existingBatch, error: existingBatchError } =
    await supabaseAdmin
      .from("reservation_batches")
      .select("id")
      .eq("start_date", startDate)
      .eq("end_date", endDate)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingBatchError) {
    return NextResponse.json(
      {
        ok: false,
        message: "기존 예약 배너 확인에 실패했습니다.",
        error: existingBatchError.message,
      },
      { status: 500 }
    );
  }

  if (existingBatch && editingBatchId !== existingBatch.id) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "이미 저장된 주차입니다. 저장된 예약 주차 목록에서 '불러와서 수정'을 눌러 수정해주세요.",
      },
      { status: 409 }
    );
  }

  if (!existingBatch) {
    const { data: newBatch, error: batchError } = await supabaseAdmin
      .from("reservation_batches")
      .insert({
        title: reservationTitle,
        start_date: startDate,
        end_date: endDate,
        open_at: openAt,
        close_at: closeAt,
        display_until: displayUntil,
      })
      .select("id")
      .single();

    if (batchError || !newBatch) {
      return NextResponse.json(
        {
          ok: false,
          message: "예약 배너 저장에 실패했습니다.",
          error: batchError?.message,
        },
        { status: 500 }
      );
    }

    for (const [groupIndex, group] of courtGroups.entries()) {
      const { data: savedGroup, error: groupError } = await supabaseAdmin
        .from("court_groups")
        .insert({
          batch_id: newBatch.id,
          day_name: group.day,
          court_name: group.courtName,
          display_order: groupIndex,
        })
        .select("id")
        .single();

      if (groupError || !savedGroup) {
        return NextResponse.json(
          {
            ok: false,
            message: "코트 그룹 저장에 실패했습니다.",
            error: groupError?.message,
          },
          { status: 500 }
        );
      }

      if (group.segments.length > 0) {
        const segmentsToInsert = group.segments.map((segment) => ({
          group_id: savedGroup.id,
          start_time: segment.startTime,
          end_time: segment.endTime,
          court_count: segment.courtCount,
        }));

        const { error: segmentError } = await supabaseAdmin
          .from("court_segments")
          .insert(segmentsToInsert);

        if (segmentError) {
          return NextResponse.json(
            {
              ok: false,
              message: "시간 구간 저장에 실패했습니다.",
              error: segmentError.message,
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "예약 일정이 저장되었습니다.",
      batchId: newBatch.id,
    });
  }

  const batchId = existingBatch.id;

  const { data: activeReservationsData, error: activeReservationsError } =
    await supabaseAdmin
      .from("reservations")
      .select(
        `
        id,
        slot_start_time,
        slot_end_time,
        court_number,
        court_groups (
          day_name,
          court_name
        )
      `
      )
      .eq("batch_id", batchId)
      .is("cancelled_at", null);

  if (activeReservationsError) {
    return NextResponse.json(
      {
        ok: false,
        message: "기존 예약 내역 확인에 실패했습니다.",
        error: activeReservationsError.message,
      },
      { status: 500 }
    );
  }

  const activeReservations =
    (activeReservationsData ?? []) as ActiveReservation[];

  const proposedSlotKeys = buildProposedSlotKeys(courtGroups);

  for (const reservation of activeReservations) {
    const courtGroup = getFirstItem(reservation.court_groups);

    if (!courtGroup) {
      return NextResponse.json(
        {
          ok: false,
          message: "기존 예약의 코트 정보를 확인하지 못했습니다.",
        },
        { status: 500 }
      );
    }

    const reservationSlotKey = makeSlotKey({
      dayName: courtGroup.day_name,
      courtName: courtGroup.court_name,
      slotStartTime: normalizeTime(reservation.slot_start_time),
      slotEndTime: normalizeTime(reservation.slot_end_time),
      courtNumber: reservation.court_number,
    });

    if (!proposedSlotKeys.has(reservationSlotKey)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "기존 예약이 있는 시간이 새 시간표에서 사라졌습니다. 먼저 관리자 예약 취소 후 다시 수정해주세요.",
        },
        { status: 409 }
      );
    }
  }

  const { data: oldGroups, error: oldGroupsError } = await supabaseAdmin
    .from("court_groups")
    .select("id")
    .eq("batch_id", batchId);

  if (oldGroupsError) {
    return NextResponse.json(
      {
        ok: false,
        message: "기존 코트 그룹 확인에 실패했습니다.",
        error: oldGroupsError.message,
      },
      { status: 500 }
    );
  }

  const oldGroupIds = (oldGroups ?? []).map((group) => group.id);

  const { error: updateBatchError } = await supabaseAdmin
    .from("reservation_batches")
    .update({
      title: reservationTitle,
      start_date: startDate,
      end_date: endDate,
      open_at: openAt,
      close_at: closeAt,
      display_until: displayUntil,
    })
    .eq("id", batchId);

  if (updateBatchError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 배너 수정에 실패했습니다.",
        error: updateBatchError.message,
      },
      { status: 500 }
    );
  }

  const savedSlotMap = new Map<
    string,
    {
      groupId: string;
      segmentId: string;
    }
  >();

  for (const [groupIndex, group] of courtGroups.entries()) {
    const { data: savedGroup, error: groupError } = await supabaseAdmin
      .from("court_groups")
      .insert({
        batch_id: batchId,
        day_name: group.day,
        court_name: group.courtName,
        display_order: groupIndex,
      })
      .select("id")
      .single();

    if (groupError || !savedGroup) {
      return NextResponse.json(
        {
          ok: false,
          message: "새 코트 그룹 저장에 실패했습니다.",
          error: groupError?.message,
        },
        { status: 500 }
      );
    }

    for (const segment of group.segments) {
      const { data: savedSegment, error: segmentError } = await supabaseAdmin
        .from("court_segments")
        .insert({
          group_id: savedGroup.id,
          start_time: segment.startTime,
          end_time: segment.endTime,
          court_count: segment.courtCount,
        })
        .select("id")
        .single();

      if (segmentError || !savedSegment) {
        return NextResponse.json(
          {
            ok: false,
            message: "새 시간 구간 저장에 실패했습니다.",
            error: segmentError?.message,
          },
          { status: 500 }
        );
      }

      const slots = makeSlots(segment.startTime, segment.endTime);

      for (const slot of slots) {
        for (
          let courtNumber = 1;
          courtNumber <= segment.courtCount;
          courtNumber += 1
        ) {
          const key = makeSlotKey({
            dayName: group.day,
            courtName: group.courtName,
            slotStartTime: slot.slotStartTime,
            slotEndTime: slot.slotEndTime,
            courtNumber,
          });

          savedSlotMap.set(key, {
            groupId: savedGroup.id,
            segmentId: savedSegment.id,
          });
        }
      }
    }
  }

  for (const reservation of activeReservations) {
    const courtGroup = getFirstItem(reservation.court_groups);

    if (!courtGroup) {
      continue;
    }

    const reservationSlotKey = makeSlotKey({
      dayName: courtGroup.day_name,
      courtName: courtGroup.court_name,
      slotStartTime: normalizeTime(reservation.slot_start_time),
      slotEndTime: normalizeTime(reservation.slot_end_time),
      courtNumber: reservation.court_number,
    });

    const newLocation = savedSlotMap.get(reservationSlotKey);

    if (!newLocation) {
      return NextResponse.json(
        {
          ok: false,
          message: "기존 예약을 새 시간표에 연결하지 못했습니다.",
        },
        { status: 500 }
      );
    }

    const { error: moveReservationError } = await supabaseAdmin
      .from("reservations")
      .update({
        group_id: newLocation.groupId,
        segment_id: newLocation.segmentId,
      })
      .eq("id", reservation.id);

    if (moveReservationError) {
      return NextResponse.json(
        {
          ok: false,
          message: "기존 예약을 새 시간표로 옮기지 못했습니다.",
          error: moveReservationError.message,
        },
        { status: 500 }
      );
    }
  }

  if (oldGroupIds.length > 0) {
    const { error: deleteOldGroupsError } = await supabaseAdmin
      .from("court_groups")
      .delete()
      .in("id", oldGroupIds);

    if (deleteOldGroupsError) {
      return NextResponse.json(
        {
          ok: false,
          message: "기존 코트 그룹 삭제에 실패했습니다.",
          error: deleteOldGroupsError.message,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message: "기존 예약 일정이 새 내용으로 수정되었습니다.",
    batchId,
  });
}