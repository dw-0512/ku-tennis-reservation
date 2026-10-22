import Link from "next/link";
import { isNewNotice } from "@/lib/notices/display";
import type { NoticePreview } from "@/lib/notices/previews";

export default function NoticePreviewBlock({
  notices,
}: {
  notices: NoticePreview[];
}) {
  if (notices.length === 0) return null;

  return (
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
          {notices.map((notice) => (
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
  );
}
