import { createClient } from "@supabase/supabase-js";

export function createBookingStream(groupId: string, signal: AbortSignal) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const encoder = new TextEncoder();
  let close = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const channel = client.channel(`court-bookings:${groupId}`, {
        config: { private: true },
      });
      const heartbeat = setInterval(() => send(": keepalive\n\n"), 15000);
      const timeout = setTimeout(() => close(), 45000);

      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(timeout);
        signal.removeEventListener("abort", close);
        void client.removeChannel(channel).catch(() => undefined);
        client.realtime.disconnect();
        try {
          controller.close();
        } catch {
          return;
        }
      };

      function send(message: string) {
        if (!closed) controller.enqueue(encoder.encode(message));
      }

      signal.addEventListener("abort", close, { once: true });
      if (signal.aborted) {
        close();
        return;
      }

      channel
        .on("broadcast", { event: "changed" }, () => {
          send("data: changed\n\n");
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") send("data: changed\n\n");
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            close();
          }
        });
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
