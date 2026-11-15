"use client";

import { useEffect, useState } from "react";
import { MEMBER_DATA_CHANGE_EVENT, memberFetch } from "@/lib/member-client";
import type { Booking } from "./slots";

export function useLiveBookings(
  groupId: string | null,
  reservations: Booking[],
) {
  const [snapshot, setSnapshot] = useState<{
    groupId: string;
    reservations: Booking[];
  } | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const controller = new AbortController();
    let running = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let streamController: AbortController | undefined;

    async function refresh() {
      if (controller.signal.aborted || document.visibilityState === "hidden") {
        return;
      }
      if (running) {
        pending = true;
        return;
      }

      running = true;

      try {
        const response = await memberFetch(
          `/api/reservations/live?groupId=${encodeURIComponent(groupId!)}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) return;

        const result = (await response.json()) as { reservations: Booking[] };

        if (!controller.signal.aborted) {
          setSnapshot({ groupId: groupId!, reservations: result.reservations });
        }
      } catch {
        return;
      } finally {
        running = false;
        if (pending && !controller.signal.aborted) {
          pending = false;
          void refresh();
        }
      }
    }

    function scheduleRefresh() {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 100);
    }

    async function listen(current: AbortController) {
      const response = await memberFetch(
        `/api/reservations/live?groupId=${encodeURIComponent(groupId!)}&stream=1`,
        { cache: "no-store", signal: current.signal },
      );

      if (!response.ok || !response.body) return;
      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (!current.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let end: number;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const message = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (message === "data: changed") scheduleRefresh();
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }

    function connect() {
      if (
        controller.signal.aborted ||
        document.visibilityState === "hidden" ||
        streamController
      ) {
        return;
      }

      clearTimeout(reconnectTimer);
      const current = new AbortController();
      streamController = current;

      void listen(current)
        .catch(() => undefined)
        .finally(() => {
          if (streamController === current) streamController = undefined;
          if (!controller.signal.aborted) {
            reconnectTimer = setTimeout(connect, 1000);
          }
        });
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        streamController?.abort();
      } else {
        scheduleRefresh();
        connect();
      }
    }

    const interval = setInterval(scheduleRefresh, 30000);

    void refresh();
    connect();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", scheduleRefresh);
    window.addEventListener(MEMBER_DATA_CHANGE_EVENT, scheduleRefresh);

    return () => {
      controller.abort();
      streamController?.abort();
      clearTimeout(reconnectTimer);
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", scheduleRefresh);
      window.removeEventListener(MEMBER_DATA_CHANGE_EVENT, scheduleRefresh);
    };
  }, [groupId, reservations]);

  return snapshot?.groupId === groupId ? snapshot.reservations : reservations;
}
