import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Notice = {
  id: string;
  title: string;
  content: string;
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

  const threeDays = 24 * 60 * 60 * 1000;

  return now - createdAt <= threeDays;
}

async function getPublishedNotices() {
  const { data, error } = await supabaseAdmin
    .from("notices")
    .select("id, title, content, created_at, updated_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    return [];
  }

  return (data ?? []) as Notice[];
}

export default async function NoticePage() {
  const notices = await getPublishedNotices();

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
                내 예약 확인 및 취소
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
        {notices.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-gray-900">
              등록된 공지사항이 없습니다
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              추후 코트 예약 관련 안내를 이곳에서 확인할 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E5E5]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {isNewNotice(notice.created_at) && (
                      <span className="rounded-full bg-[#8B0029] px-2 py-0.5 text-xs font-bold text-white">
                        N
                      </span>
                    )}

                    <h2 className="text-xl font-bold text-gray-900">
                      {notice.title}
                    </h2>
                  </div>

                  <time className="text-xs font-bold text-gray-500">
                    {formatKoreanDateTime(notice.created_at)}
                  </time>
                </div>

                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {notice.content}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}