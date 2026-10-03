"use client";

import { formatKoreanDateTime, isNewNotice } from "@/lib/notices/display";

import type { NoticeDetail } from "@/lib/member-pages/notice-detail";
import NoticePinExpiry from "@/components/NoticePinExpiry";
import { nextPinExpiry } from "@/lib/notices/title";
import Link from "next/link";
import MemberHeader from "./MemberHeader";
import { notFound } from "next/navigation";

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-gray-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

export default function MemberNoticeDetail({
  notice,
}: {
  notice: NoticeDetail | null;
}) {
  if (!notice) notFound();
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <MemberHeader active="/notice" title="공지사항" />

      <section className="mx-auto max-w-6xl px-5 py-6">
        <Link
          href="/notice"
          className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50"
        >
          공지사항 목록으로
        </Link>

        <article className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
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

          <h2 className="mt-3 break-keep text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
            {notice.title}
          </h2>

          <p className="mt-2 text-sm font-semibold text-gray-500">
            {formatKoreanDateTime(notice.created_at)}
          </p>

          <div className="mt-5 whitespace-pre-wrap break-keep text-sm leading-6 text-gray-800">
            {renderBoldText(notice.content)}
          </div>
        </article>
      </section>
      <NoticePinExpiry expiresAt={nextPinExpiry([notice])} />
    </main>
  );
}
