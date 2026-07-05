import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NoticeDetailPageProps = {
  params: Promise<{
    noticeId: string;
  }>;
};

type NoticeDetail = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export default async function NoticeDetailPage({
  params,
}: NoticeDetailPageProps) {
  const { noticeId } = await params;

  const { data, error } = await supabaseAdmin
    .from("notices")
    .select(
      "id, title, content, is_pinned, pinned_at, created_at, updated_at"
    )
    .eq("id", noticeId)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const notice = data as NoticeDetail;

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
        <Link
          href="/notice"
          className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          공지사항 목록으로
        </Link>

        <article className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E5E5]">
          <div className="flex flex-wrap items-center gap-2">
            {notice.is_pinned ? (
              <span className="rounded-full bg-[#8B0029]/10 px-2 py-1 text-xs font-bold text-[#8B0029] ring-1 ring-[#8B0029]/20">
                필독
              </span>
            ) : null}

            {isNewNotice(notice.created_at) ? (
              <span className="rounded-full bg-[#8B0029] px-2 py-1 text-xs font-bold text-white">
                N
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 break-keep text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
            {notice.title}
          </h2>

          <p className="mt-2 text-sm font-semibold text-gray-500">
            {formatKoreanDateTime(notice.created_at)}
          </p>

          <div className="mt-6 whitespace-pre-wrap break-keep text-sm leading-7 text-gray-800 sm:text-base">
            {notice.content}
          </div>
        </article>
      </section>
    </main>
  );
}