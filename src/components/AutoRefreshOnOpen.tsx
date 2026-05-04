"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshOnOpenProps = {
  nextOpenAt: string | null;
};

export default function AutoRefreshOnOpen({
  nextOpenAt,
}: AutoRefreshOnOpenProps) {
  const router = useRouter();

  useEffect(() => {
    if (!nextOpenAt) {
      return;
    }

    const openTime = new Date(nextOpenAt).getTime();
    const delay = openTime - Date.now();

    if (delay <= 0) {
      router.refresh();
      return;
    }

    const timer1 = window.setTimeout(() => {
      router.refresh();
    }, delay);

    const timer2 = window.setTimeout(() => {
      router.refresh();
    }, delay + 2000);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
    };
  }, [nextOpenAt, router]);

  return null;
}