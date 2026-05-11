import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import ReservationButton from "@/components/ReservationButton";
import AutoRefreshOnOpen from "@/components/AutoRefreshOnOpen";

export const dynamic = "force-dynamic";

type DbSegment = {
  id: string;
  start_time: string;
  end_time: string;
  court_count: number;
};

type DbCourtGroup = {
  id: string;
  day_name: string;
  court_name: string;
  display_order: number;
  court_segments: DbSegment[];
};

type DbReservationBatch = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  open_at: string;
  close_at: string;
  display_until: string;
  court_groups: DbCourtGroup[];
};

type DbReservation = {
  id: string;
  batch_id: string;
  group_id: string;
  segment_id: string;
  slot_start_time: string;
  slot_end_time: string;
  court_number: number;
  reserver_name: string;
};

type NoticePreview = {
  id: string;
  title: string;
  created_at: string;
};

type Slot = {
  groupId: string;
  segmentId: string;
  startHour: number;
  endHour: number;
  courtCount: number;
};

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

const dayOffsetMap: Record<string, number> = {
  월요일: 0,
  화요일: 1,
  수요일: 2,
  목요일: 3,
  금요일: 4,
  토요일: 5,
  일요일: 6,
};

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

function addDaysToDateString(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function isPastCourtGroup(batchStartDate: string, dayName: string) {
  const offset = dayOffsetMap[dayName];

  if (offset === undefined) {
    return false;
  }

  const courtDate = addDaysToDateString(batchStartDate, offset);
  const today = getKoreaTodayDateString();

  return courtDate < today;
}

function formatKoreanDateString(dateString: string) {
  const [, month, day] = dateString.split("-").map(Number);

  return `${month}월 ${day}일`;
}

function isNewNotice(dateString: string) {
  const createdAt = new Date(dateString).getTime();
  const now = Date.now();

  const oneDay = 24 * 60 * 60 * 1000;

  return now - createdAt <= oneDay;
}

function getCourtGroupDateLabel(batchStartDate: string, dayName: string) {
  const offset = dayOffsetMap[dayName];

  if (offset === undefined) {
    return dayName;
  }

  const courtDate = addDaysToDateString(batchStartDate, offset);

  return `${formatKoreanDateString(courtDate)} ${dayName}`;
}

function isClosedSlot({
  batchStartDate,
  dayName,
  slotStartTime,
}: {
  batchStartDate: string;
  dayName: string;
  slotStartTime: string;
}) {
  const offset = dayOffsetMap[dayName];

  if (offset === undefined) {
    return false;
  }

  const courtDate = addDaysToDateString(batchStartDate, offset);
  const { today, currentTime } = getKoreaDateTimeParts();

  if (courtDate < today) {
    return true;
  }

  if (courtDate === today && slotStartTime <= currentTime) {
    return true;
  }

  return false;
}

function timeToHour(time: string) {
  return Number(time.slice(0, 2));
}

function makeReservationKey({
  groupId,
  segmentId,
  slotStartTime,
  slotEndTime,
  courtNumber,
}: {
  groupId: string;
  segmentId: string;
  slotStartTime: string;
  slotEndTime: string;
  courtNumber: number;
}) {
  return `${groupId}-${segmentId}-${slotStartTime}-${slotEndTime}-${courtNumber}`;
}

function makeSlots({
  groupId,
  segmentId,
  startTime,
  endTime,
  courtCount,
}: {
  groupId: string;
  segmentId: string;
  startTime: string;
  endTime: string;
  courtCount: number;
}): Slot[] {
  const slots: Slot[] = [];

  let hour = timeToHour(startTime);
  const endHour = timeToHour(endTime);

  if (hour % 2 === 1) {
    slots.push({
      groupId,
      segmentId,
      startHour: hour,
      endHour: hour + 1,
      courtCount,
    });

    hour += 1;
  }

  while (hour + 2 <= endHour) {
    slots.push({
      groupId,
      segmentId,
      startHour: hour,
      endHour: hour + 2,
      courtCount,
    });

    hour += 2;
  }

  return slots;
}

async function getVisibleBatches() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select(
      `
      id,
      title,
      start_date,
      end_date,
      open_at,
      close_at,
      display_until,
      court_groups (
        id,
        day_name,
        court_name,
        display_order,
        court_segments (
          id,
          start_time,
          end_time,
          court_count
        )
      )
    `
    )
    .lte("open_at", now)
    .gte("display_until", now)
    .order("start_date", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as DbReservationBatch[];
}

async function getNextOpenAt() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select("open_at")
    .gt("open_at", now)
    .gte("display_until", now)
    .order("open_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.open_at ?? null;
}

async function getNoticePreviews() {
  const { data, error } = await supabaseAdmin
    .from("notices")
    .select("id, title, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    return [];
  }

  return (data ?? []) as NoticePreview[];
}

async function getActiveReservations(batchIds: string[]) {
  if (batchIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      batch_id,
      group_id,
      segment_id,
      slot_start_time,
      slot_end_time,
      court_number,
      reserver_name
    `
    )
    .in("batch_id", batchIds)
    .is("cancelled_at", null);

  if (error) {
    return [];
  }

  return (data ?? []) as DbReservation[];
}

export default async function Home() {
  const [batches, nextOpenAt, noticePreviews] = await Promise.all([
    getVisibleBatches(),
    getNextOpenAt(),
    getNoticePreviews(),
  ]);

  const serverNow = new Date().toISOString();

  const batchIds = batches.map((batch) => batch.id);
  const activeReservations = await getActiveReservations(batchIds);

  const reservationMap = new Map<string, string>();

  for (const reservation of activeReservations) {
    const key = makeReservationKey({
      groupId: reservation.group_id,
      segmentId: reservation.segment_id,
      slotStartTime: normalizeTime(reservation.slot_start_time),
      slotEndTime: normalizeTime(reservation.slot_end_time),
      courtNumber: reservation.court_number,
    });

    reservationMap.set(key, reservation.reserver_name);
  }

  return (
  <main className="min-h-screen bg-[#F8F8F8]">
      <section className="bg-[#8B0029] px-5 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                Korea University Tennis Club
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                <span>고려대학교 테니스부</span>
                <span className="block sm:inline sm:ml-2">코트 예약</span>
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white px-4 py-2 text-[#8B0029]"
              >
                코트 예약
              </Link>

              <Link
                href="/my"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                내 예약 확인 및 취소
              </Link>

              <Link
                href="/notice"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                공지사항
              </Link>
            </nav>
          </div>
        </div>
      </section>

            {noticePreviews.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 pt-6">
          <Link
            href="/notice"
            className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5] transition hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[#8B0029]">공지사항</p>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                전체 보기
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {noticePreviews.map((notice) => (
                <div
                  key={notice.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B0029]" />

                  <p className="min-w-0 truncate font-bold text-gray-900">
                    {notice.title}
                  </p>

                  {isNewNotice(notice.created_at) ? (
                    <span className="shrink-0 rounded-full bg-[#8B0029] px-2 py-0.5 text-xs font-bold text-white">
                      N
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </Link>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-5 py-6">
        {batches.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-gray-900">
              현재 오픈된 예약 일정이 없습니다
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              일요일 14시에 코트 예약이 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {batches.map((batch) => (
              <section key={batch.id} className="space-y-6">
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
                  <p className="text-sm font-bold text-[#8B0029]">예약 일정</p>

                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {batch.title}
                    </h2>

                    <div className="flex gap-2 text-xs font-bold">
                      <span className="rounded-full bg-white px-3 py-1 text-gray-900 ring-1 ring-gray-300">
                        예약 가능
                      </span>
                      <span className="rounded-full bg-[#8B0029] px-3 py-1 text-white">
                        예약 완료
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {batch.court_groups
                    .filter(
                      (group) =>
                        !isPastCourtGroup(batch.start_date, group.day_name)
                    )
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((group) => {
                      const segments = group.court_segments;

                      if (segments.length === 0) {
                        return null;
                      }

                      return (
                        <section
                          key={group.id}
                          className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5E5E5]"
                        >
                          <div className="border-b border-gray-200 bg-white px-5 py-4">
                            <p className="text-sm font-bold text-[#8B0029]">
                              {getCourtGroupDateLabel(batch.start_date, group.day_name)}
                            </p>

                            <h3 className="mt-1 text-2xl font-bold text-gray-900">
                              {group.court_name}
                            </h3>
                          </div>

                          <div>
                            {segments.map((segment) => {
                              const slots = makeSlots({
                                groupId: group.id,
                                segmentId: segment.id,
                                startTime: segment.start_time,
                                endTime: segment.end_time,
                                courtCount: segment.court_count,
                              });

                              return slots.map((slot, index) => {
                                const slotStartTime = formatHour(
                                  slot.startHour
                                );
                                const slotEndTime = formatHour(slot.endHour);

                                return (
                                  <div
                                    key={`${slot.segmentId}-${slot.startHour}-${slot.endHour}`}
                                    className={`grid gap-3 px-5 py-4 sm:grid-cols-[140px_1fr] sm:items-center ${
                                      index !== 0
                                        ? "border-t border-gray-100"
                                        : ""
                                    }`}
                                  >
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">
                                        {slotStartTime} ~ {slotEndTime}
                                      </p>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {Array.from({
                                        length: slot.courtCount,
                                      }).map((_, courtIndex) => {
                                        const courtNumber = courtIndex + 1;

                                        const reservationKey =
                                          makeReservationKey({
                                            groupId: slot.groupId,
                                            segmentId: slot.segmentId,
                                            slotStartTime,
                                            slotEndTime,
                                            courtNumber,
                                          });

                                        const reservedBy = reservationMap.get(reservationKey);

const isClosed = isClosedSlot({
  batchStartDate: batch.start_date,
  dayName: group.day_name,
  slotStartTime,
});

return (
  <ReservationButton
  key={courtNumber}
  batchId={batch.id}
  groupId={slot.groupId}
  segmentId={slot.segmentId}
  slotStartTime={slotStartTime}
  slotEndTime={slotEndTime}
  courtNumber={courtNumber}
  courtName={group.court_name}
  reservedBy={reservedBy}
  isClosed={isClosed}
/>
);
                                      })}
                                    </div>
                                  </div>
                                );
                              });
                            })}
                          </div>
                        </section>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
      <AutoRefreshOnOpen nextOpenAt={nextOpenAt} serverNow={serverNow} />
    </main>
  );
}