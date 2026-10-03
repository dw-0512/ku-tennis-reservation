"use client";

import { formatKoreanDateTime, isNewNotice } from "@/lib/notices/display";

import type { NoticesData } from "@/lib/member-pages/notices";
import NoticePinExpiry from "@/components/NoticePinExpiry";
import { nextPinExpiry } from "@/lib/notices/title";
import Link from "next/link";
import MemberHeader from "./MemberHeader";

type Notice = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_until: string | null;
  created_at: string;
  updated_at: string;
};

function getPageHref(page: number) {
  return `/notice?page=${page}`;
}

function NoticeArticle({ notice }: { notice: Notice }) {
  return (
    <Link
      href={`/notice/${notice.id}`}
      className="group block rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-[#E5E5E5] transition hover:bg-gray-50"
    >
      <article>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {notice.is_pinned ? (
              <span className="shrink-0 rounded-full bg-[#8B0029]/10 px-2 py-0.5 text-[11px] font-bold text-[#8B0029] ring-1 ring-[#8B0029]/20">
                필독
              </span>
            ) : null}

            {isNewNotice(notice.created_at) && (
              <span className="shrink-0 rounded-full bg-[#8B0029] px-2 py-0.5 text-[11px] font-bold text-white">
                N
              </span>
            )}

            <h2 className="min-w-0 break-keep text-sm font-bold text-gray-900 transition group-hover:text-[#8B0029] sm:text-base">
              {notice.title}
            </h2>
          </div>

          <time className="shrink-0 text-[11px] font-bold text-gray-500">
            {formatKoreanDateTime(notice.created_at)}
          </time>
        </div>
      </article>
    </Link>
  );
}

export default function MemberNotices({ data }: { data: NoticesData }) {
  const { currentPage, pinnedNotices, notices, totalPages, hasNoNotices } =
    data;
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <MemberHeader active="/notice" title="공지사항" />

      <section className="mx-auto max-w-6xl px-5 py-6">
        {hasNoNotices ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-gray-900">
              등록된 공지사항이 없습니다
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              추후 코트 예약 관련 안내를 이곳에서 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <>
            {pinnedNotices.length > 0 ? (
              <div className="mb-2 space-y-2">
                {pinnedNotices.map((notice) => (
                  <NoticeArticle key={notice.id} notice={notice} />
                ))}
              </div>
            ) : null}

            {notices.length > 0 ? (
              <div className="space-y-2">
                {notices.map((notice) => (
                  <NoticeArticle key={notice.id} notice={notice} />
                ))}
              </div>
            ) : null}

            {totalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
                {currentPage > 1 ? (
                  <Link
                    href={getPageHref(currentPage - 1)}
                    className="rounded-full bg-white px-4 py-2 text-gray-700 ring-1 ring-[#E5E5E5] transition hover:bg-gray-100"
                  >
                    이전
                  </Link>
                ) : (
                  <span className="rounded-full bg-gray-100 px-4 py-2 text-gray-400">
                    이전
                  </span>
                )}

                {Array.from({ length: totalPages }).map((_, index) => {
                  const pageNumber = index + 1;
                  const isCurrentPage = pageNumber === currentPage;

                  return isCurrentPage ? (
                    <span
                      key={pageNumber}
                      className="rounded-full bg-[#8B0029] px-4 py-2 text-white"
                    >
                      {pageNumber}
                    </span>
                  ) : (
                    <Link
                      key={pageNumber}
                      href={getPageHref(pageNumber)}
                      className="rounded-full bg-white px-4 py-2 text-gray-700 ring-1 ring-[#E5E5E5] transition hover:bg-gray-100"
                    >
                      {pageNumber}
                    </Link>
                  );
                })}

                {currentPage < totalPages ? (
                  <Link
                    href={getPageHref(currentPage + 1)}
                    className="rounded-full bg-white px-4 py-2 text-gray-700 ring-1 ring-[#E5E5E5] transition hover:bg-gray-100"
                  >
                    다음
                  </Link>
                ) : (
                  <span className="rounded-full bg-gray-100 px-4 py-2 text-gray-400">
                    다음
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </section>
      <NoticePinExpiry expiresAt={nextPinExpiry(pinnedNotices)} />
    </main>
  );
}
