"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isNewNotice } from "@/lib/notices/display";

type GuideNotice = {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
};

export default function LoginGuideNotice() {
  const [notice, setNotice] = useState<GuideNotice | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNotice() {
      try {
        const response = await fetch("/api/public-guide", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) return;

        const result = (await response.json()) as {
          notice: GuideNotice | null;
        };

        if (!controller.signal.aborted) setNotice(result.notice);
      } catch {
        return;
      }
    }

    void loadNotice();

    return () => controller.abort();
  }, []);

  if (!notice) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#8B0029]">공지사항</p>
        </div>

        <div className="mt-3 space-y-2">
          <Link href="/court-guide" className="flex items-center gap-2 text-sm">
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
        </div>
      </div>
    </section>
  );
}