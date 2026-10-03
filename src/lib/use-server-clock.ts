"use client";

import { useEffect, useEffectEvent, useState } from "react";

export function useServerClock(
  serverNow: string,
  onTick?: (time: number) => void,
) {
  const serverTime = Date.parse(serverNow);
  const [clock, setClock] = useState<{ source: string; time: number } | null>(
    null,
  );
  const tick = useEffectEvent((time: number) => {
    setClock({ source: serverNow, time });
    onTick?.(time);
  });
  useEffect(() => {
    const offset = serverTime - Date.now();
    const update = () => tick(Date.now() + offset);
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pageshow", update);
    };
  }, [serverNow, serverTime]);
  return clock?.source === serverNow ? clock.time : serverTime;
}
