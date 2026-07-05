import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Notice = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
};

type NoticePageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const NOTICES_PER_PAGE = 10;

function formatKoreanDateTime(dateString: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return formatter.format(new Date(dateString));
}

function isNewNotice(dateString: string) {
  const createdAt = new Date(dateString).getTime();
  const now = Date.now();

  const oneDay = 24 * 60 * 60 * 1000;

  return now - createdAt <= oneDay;
}

function getPageNumber(page?: string) {
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return 1;
  }

  return pageNumber;
}

async function getPinnedNotices() {
  const { data, error } = await supabaseAdmin
    .from("notices")
    .select("id, title, content, is_pinned, pinned_at, created_at, updated_at")
    .eq("is_published", true)
    .eq("is_pinned", true)
    .order("pinned_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as Notice[];
}

async function getPublishedNotices(page: number) {
  const from = (page - 1) * NOTICES_PER_PAGE;
  const to = from + NOTICES_PER_PAGE - 1;

  const { data, error, count } = await supabaseAdmin
    .from("notices")
    .select("id, title, content, is_pinned, pinned_at, created_at, updated_at", {
      count: "exact",
    })
    .eq("is_published", true)
    .eq("is_pinned", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      notices: [],
      totalCount: 0,
      totalPages: 1,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / NOTICES_PER_PAGE), 1);

  return {
    notices: (data ?? []) as Notice[],
    totalCount,
    totalPages,
  };
}

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

export default async function NoticePage({ searchParams }: NoticePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentPage = getPageNumber(resolvedSearchParams.page);

  const pinnedNotices = await getPinnedNotices();

  const { notices, totalCount, totalPages } = await getPublishedNotices(
    currentPage
  );

  const hasNoNotices = pinnedNotices.length === 0 && totalCount === 0;

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
                공지사항
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
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
                className="rounded-full bg-white px-4 py-2 text-[#8B0029]"
              >
                공지사항
              </Link>
            </nav>
          </div>
        </div>
      </section>

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
              <div className="mb-4 space-y-2">
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
    </main>
  );
}