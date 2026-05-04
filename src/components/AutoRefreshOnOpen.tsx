"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshOnOpenProps = {
  nextOpenAt: string | null;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}일 ${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function AutoRefreshOnOpen({
  nextOpenAt,
}: AutoRefreshOnOpenProps) {
  const router = useRouter();
  const [remainingText, setRemainingText] = useState("");

  useEffect(() => {
    if (!nextOpenAt) {
      setRemainingText("");
      return;
    }

    const openTime = new Date(nextOpenAt).getTime();

    function updateCountdown() {
      const remainingMs = openTime - Date.now();

      if (remainingMs <= 0) {
        setRemainingText("곧 열립니다");
        return;
      }

      setRemainingText(formatRemainingTime(remainingMs));
    }

    updateCountdown();

    const interval = window.setInterval(updateCountdown, 1000);
    const delay = openTime - Date.now();

    const timers =
      delay > 0
        ? [
            window.setTimeout(() => {
              router.refresh();
            }, delay),
            window.setTimeout(() => {
              router.refresh();
            }, delay + 2000),
          ]
        : [
            window.setTimeout(() => {
              router.refresh();
            }, 500),
          ];

    return () => {
      window.clearInterval(interval);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [nextOpenAt, router]);

  if (!nextOpenAt || !remainingText) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-5 pb-6">
      <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-gray-200">
        다음 예약 오픈까지 남은 시간:{" "}
        <span className="text-[#8B0029]">{remainingText}</span>
      </div>
    </section>
  );
}