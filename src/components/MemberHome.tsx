"use client";

import type { HomeData } from "@/lib/member-pages/home";
import HomeCourtLayout from "@/components/HomeCourtLayout";
import NoticePinExpiry from "@/components/NoticePinExpiry";
import { nextPinExpiry } from "@/lib/notices/title";
import Link from "next/link";
import CourtBookingView from "@/components/CourtBookingView";
import AutoRefreshOnOpen from "@/components/AutoRefreshOnOpen";

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

export default function MemberHome({ data }: { data: HomeData }) {
  const { batches, nextOpenAt, noticePreviews, activeReservations, serverNow } =
    data;
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <section className="sticky top-0 z-40 bg-[#8B0029] px-5 py-6 text-white">
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
                예약 확인
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

      <HomeCourtLayout
        notices={
          noticePreviews.length > 0 ? (
            <section className="mx-auto max-w-6xl px-5 pt-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#8B0029]">공지사항</p>

                  <Link
                    href="/notice"
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 transition hover:bg-gray-200"
                  >
                    전체 보기
                  </Link>
                </div>

                <div className="mt-3 space-y-2">
                  {noticePreviews.map((notice) => (
                    <Link
                      key={notice.id}
                      href={`/notice/${notice.id}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B0029]" />

                      {notice.is_pinned ? (
                        <span className="shrink-0 rounded-full bg-[#8B0029]/10 px-2 py-0.5 text-xs font-bold text-[#8B0029] ring-1 ring-[#8B0029]/20">
                          필독
                        </span>
                      ) : null}

                      <p className="min-w-0 flex-1 truncate font-bold text-gray-900">
                        {notice.title}
                      </p>

                      {isNewNotice(notice.created_at) ? (
                        <span className="shrink-0 rounded-full bg-[#8B0029] px-2 py-0.5 text-xs font-bold text-white">
                          N
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null
        }
      >
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
            <div className="space-y-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
                <p className="text-sm font-bold text-[#8B0029]">예약 일정</p>
                <h2 className="mt-2 break-keep text-2xl font-bold text-gray-900">
                  테니스 코트 예약
                </h2>
              </div>
              <CourtBookingView
                groups={batches.flatMap((batch) =>
                  batch.court_groups
                    .filter(
                      (group) =>
                        !group.is_archived &&
                        !isPastCourtGroup(batch.start_date, group.day_name) &&
                        group.court_segments.length > 0,
                    )
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((group) => ({
                      ...group,
                      batchId: batch.id,
                      closeAt: batch.close_at,
                      openAt: batch.open_at,
                      date: addDaysToDateString(
                        batch.start_date,
                        dayOffsetMap[group.day_name] ?? 0,
                      ),
                      dateLabel: getCourtGroupDateLabel(
                        batch.start_date,
                        group.day_name,
                      ),
                    })),
                )}
                reservations={activeReservations}
                serverNow={serverNow}
              />
            </div>
          )}
        </section>
      </HomeCourtLayout>
      <NoticePinExpiry expiresAt={nextPinExpiry(noticePreviews)} />
      <AutoRefreshOnOpen nextOpenAt={nextOpenAt} serverNow={serverNow} />
    </main>
  );
}
