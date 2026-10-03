"use client";

import { useEffect, useRef } from "react";
import { useServerClock } from "@/lib/use-server-clock";
import { formatRemainingTime, PREVIEW_LEAD_TIME } from "@/lib/booking/time";
import { useRouter } from "next/navigation";

type AutoRefreshOnOpenProps = {
  nextOpenAt: string | null;
  serverNow: string;
};

export default function AutoRefreshOnOpen({
  nextOpenAt,
  serverNow,
}: AutoRefreshOnOpenProps) {
  const router = useRouter();
  const refreshed = useRef({ nextOpenAt, preview: false, open: false });
  const serverTime = Date.parse(serverNow);
  const now = useServerClock(serverNow);
  useEffect(() => {
    if (!nextOpenAt) return;
    const openTime = Date.parse(nextOpenAt);
    const previewTime = openTime - PREVIEW_LEAD_TIME;
    if (refreshed.current.nextOpenAt !== nextOpenAt) {
      refreshed.current = { nextOpenAt, preview: false, open: false };
    }
    if (serverTime >= previewTime) refreshed.current.preview = true;
    let shouldRefresh = false;
    if (!refreshed.current.preview && now >= previewTime) {
      refreshed.current.preview = true;
      shouldRefresh = true;
    }
    if (!refreshed.current.open && now >= openTime) {
      refreshed.current.open = true;
      shouldRefresh = true;
    }
    if (shouldRefresh) router.refresh();
  }, [nextOpenAt, serverTime, now, router]);

  if (!nextOpenAt) return null;

  const remaining = new Date(nextOpenAt).getTime() - now;

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6">
      <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-gray-200">
        다음 예약 오픈까지 남은 시간:{" "}
        <span className="text-[#8B0029]">
          {remaining > 0 ? formatRemainingTime(remaining) : "곧 열립니다"}
        </span>
      </div>
    </section>
  );
}
