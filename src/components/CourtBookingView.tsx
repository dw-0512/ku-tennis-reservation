"use client";
import { useState } from "react";
import { useServerClock } from "@/lib/use-server-clock";
import { formatRemainingTime } from "@/lib/booking/time";
import { useCourtView } from "./HomeCourtLayout";
import ReservationButton from "./ReservationButton";
import {
  Booking,
  Segment,
  Selection,
  bookingAt,
  canExtend,
  courtLabel,
  formatHour,
  hourEnded,
  makeHourlySlots,
  toggleHour,
} from "@/lib/booking/slots";

type Group = {
  id: string;
  batchId: string;
  date: string;
  dateLabel: string;
  court_name: string;
  court_segments: Segment[];
  closeAt: string;
  openAt: string;
};
export default function CourtBookingView({
  groups,
  reservations,
  serverNow,
}: {
  groups: Group[];
  reservations: Booking[];
  serverNow: string;
}) {
  const { activeId, setActiveId } = useCourtView();
  const [selection, setSelection] = useState<Selection>(null);
  const now = useServerClock(serverNow, (time) => {
    if (
      activeId &&
      !groups.some(
        (group) => group.id === activeId && !hourEnded(group.date, 21, time),
      )
    ) {
      setActiveId(null);
      setSelection(null);
    }
  });
  const visible = groups.filter((g) => !hourEnded(g.date, 21, now));
  const active = visible.find((g) => g.id === activeId);
  if (!active) {
    const dates = [...new Set(visible.map((g) => g.date))].sort();
    return (
      <div className="space-y-3">
        {dates.map((date) => {
          const courts = visible.filter((g) => g.date === date);
          return (
            <section
              key={date}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5E5E5]"
            >
              <div className="border-b border-gray-200 px-5 py-4">
                <p className="text-sm font-bold text-[#8B0029]">
                  {courts[0].dateLabel}
                </p>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {courts.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveId(g.id);
                      setSelection(null);
                    }}
                    className="rounded-xl bg-white px-3 py-3 text-center text-sm font-bold text-gray-900 ring-1 ring-gray-300 transition hover:text-[#8B0029] hover:ring-[#8B0029]"
                  >
                    {courtLabel(g.court_name)}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  const rows = makeHourlySlots(active.court_segments);
  const gridRows: string[] = [];

  const rowPositions = rows.map((row, index) => {
    if (index > 0 && row.hour > rows[index - 1].hour + 1) {
      gridRows.push("12px");
    }

    gridRows.push("44px");

    return gridRows.length;
  });
  const isPreview = now < new Date(active.openAt).getTime();
  const remainingTime = formatRemainingTime(
    Date.parse(active.openAt) - now,
    "ceil",
  );
  const bookings = isPreview
    ? []
    : reservations.filter((r) => r.group_id === active.id);
  const faces = rows.some((r) => r.segments[1]) ? 2 : 1;
  const closed = (hour: number) =>
    hourEnded(active.date, hour, now) ||
    new Date(active.closeAt).getTime() < now;
  const validSelection =
    !isPreview &&
    selection &&
    selection.hours.every(
      (h) =>
        rows.some((r) => r.hour === h && r.segments[selection.face - 1]) &&
        !bookingAt(bookings, h, selection.face) &&
        !closed(h),
    )
      ? selection
      : null;
  const grid =
    faces === 2
      ? "grid-cols-[64px_1fr_1fr] sm:grid-cols-[140px_1fr_1fr]"
      : "grid-cols-[64px_1fr] sm:grid-cols-[140px_1fr_1fr]";
  const start = validSelection?.hours[0];
  const segmentId =
    start === undefined
      ? null
      : rows.find((r) => r.hour === start)?.segments[
          (validSelection?.face ?? 1) - 1
        ];
  return (
    <div className="pb-[calc(110px+env(safe-area-inset-bottom))]">
      <button
        onClick={() => {
          setActiveId(null);
          setSelection(null);
        }}
        className="mb-3 rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 ring-1 ring-gray-300"
      >
        ← 돌아가기
      </button>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5E5E5]">
        <div className="border-b border-gray-200 px-5 py-4">
          <p className="text-sm font-bold text-[#8B0029]">{active.dateLabel}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {courtLabel(active.court_name)}
            </h3>
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
        <div className="px-5 pb-5 pt-3">
          <div
            className={`grid ${grid} gap-3 border-b border-gray-200 pb-3 text-center text-sm font-bold text-gray-900`}
          >
            <span className="text-left">시간</span>
            <span>1면</span>
            {faces === 2 && <span>2면</span>}
          </div>
          <div
            className={`grid ${grid} gap-3 pt-3`}
            style={{ gridTemplateRows: gridRows.join(" ") }}
          >
            {rows.map((row, index) => renderRow(row, index))}
          </div>
        </div>
      </section>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 pt-4">
          {isPreview ? (
            <p className="text-sm font-bold text-gray-900">
              예약 오픈까지 남은 시간:{" "}
              <span className="text-[#8B0029]">{remainingTime}</span>
            </p>
          ) : (
            <div>
              <p className="text-xs text-gray-500">
                {validSelection
                  ? `${validSelection.face}면 · ${validSelection.hours.length}시간`
                  : "원하는 시간을 선택해 주세요"}
              </p>
              <p className="mt-1 text-base font-bold text-gray-900">
                {validSelection
                  ? `${formatHour(validSelection.hours[0])} ~ ${formatHour(validSelection.hours.at(-1)! + 1)}`
                  : "연속된 최대 2시간"}
              </p>
            </div>
          )}
          {validSelection && segmentId ? (
            <ReservationButton
              key={`${active.id}-${validSelection.face}-${validSelection.hours.join("-")}`}
              batchId={active.batchId}
              groupId={active.id}
              segmentId={segmentId}
              slotStartTime={formatHour(validSelection.hours[0])}
              slotEndTime={formatHour(validSelection.hours.at(-1)! + 1)}
              courtNumber={validSelection.face}
              courtName={courtLabel(active.court_name)}
              triggerLabel="예약하기"
              onBooked={() => setSelection(null)}
              onDismiss={() => setSelection(null)}
            />
          ) : (
            <button
              disabled
              className="shrink-0 rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white opacity-40"
            >
              {isPreview ? "예약 불가" : "예약하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
  function renderRow(
    row: ReturnType<typeof makeHourlySlots>[number],
    index: number,
  ) {
    return (
      <div key={row.hour} className="contents">
        {index > 0 && row.hour > rows[index - 1].hour + 1 && (
          <div
            style={{
              gridColumn: "1 / -1",
              gridRow: rowPositions[index] - 1,
            }}
            className="flex items-center"
          >
            <div className="h-px w-full bg-gray-200" />
          </div>
        )}

        <div
          style={{ gridColumn: 1, gridRow: rowPositions[index] }}
          className="flex flex-col justify-center"
        >
          <p className="text-sm font-bold text-gray-900">{row.hour}:00 ~</p>
          <p className="text-xs font-normal text-gray-500">{row.hour + 1}:00</p>
        </div>
        {Array.from({ length: faces }, (_, f) => {
          const face = f + 1;
          const booking = bookingAt(bookings, row.hour, face);
          const previous =
            index > 0 && rows[index - 1].hour === row.hour - 1
              ? bookingAt(bookings, row.hour - 1, face)
              : undefined;
          if (booking && previous?.id === booking.id) return null;
          let span = 1;
          if (booking)
            while (
              index + span < rows.length &&
              rows[index + span].hour === row.hour + span &&
              bookingAt(bookings, row.hour + span, face)?.id === booking.id
            )
              span++;
          const style = {
            gridColumn: face + 1,
            gridRow: `${rowPositions[index]} / span ${span}`,
          };
          if (!row.segments[f] && !booking)
            return <span key={face} style={style} />;
          const selected =
            validSelection?.face === face &&
            validSelection.hours.includes(row.hour);
          const extend =
            !booking &&
            !closed(row.hour) &&
            canExtend(validSelection, row.hour, face);
          const buttonClass = isPreview
            ? "bg-white text-gray-500 ring-1 ring-gray-300"
            : booking || selected
              ? "bg-[#8B0029] text-white"
              : closed(row.hour)
                ? "bg-gray-200 text-gray-500"
                : extend
                  ? "bg-white text-[#8B0029] ring-1 ring-[#8B0029]"
                  : "bg-white text-gray-900 ring-1 ring-gray-300";

          return (
            <button
              key={face}
              style={style}
              disabled={isPreview || !!booking || closed(row.hour)}
              aria-pressed={selected ?? false}
              onClick={() =>
                setSelection(toggleHour(validSelection, row.hour, face))
              }
              className={`min-w-0 rounded-xl px-2 text-sm font-bold transition ${buttonClass}`}
            >
              {isPreview
                ? "오픈 예정"
                : booking
                  ? booking.reserver_name
                  : closed(row.hour)
                    ? "예약 마감"
                    : selected
                      ? "선택됨"
                      : "예약 가능"}
            </button>
          );
        })}
      </div>
    );
  }
}
