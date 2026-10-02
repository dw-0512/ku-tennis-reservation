"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshOnOpenProps = {
  nextOpenAt: string | null;
  serverNow: string;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}일 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function AutoRefreshOnOpen({
  nextOpenAt,
  serverNow,
}: AutoRefreshOnOpenProps) {
  const router = useRouter();
  const [clock, setClock] = useState<{
    serverNow: string;
    time: number;
  } | null>(null);
  const serverTime = new Date(serverNow).getTime();
  const now = clock?.serverNow === serverNow ? clock.time : serverTime;

  useEffect(() => {
    if (!nextOpenAt) return;

    const openTime = new Date(nextOpenAt).getTime();
    const previewTime = openTime - 172800000;
    const offset = serverTime - Date.now();
    let previewRefreshed = serverTime >= previewTime;
    let openRefreshed = false;

    const timer = window.setInterval(() => {
      const time = Date.now() + offset;
      setClock({ serverNow, time });

      if (!previewRefreshed && time >= previewTime) {
        previewRefreshed = true;
        router.refresh();
      }
      if (!openRefreshed && time >= openTime) {
        openRefreshed = true;
        router.refresh();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [nextOpenAt, serverNow, serverTime, router]);

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
