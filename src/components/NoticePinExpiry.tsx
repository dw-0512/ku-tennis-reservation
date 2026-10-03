"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type NoticePinExpiryProps = {
  expiresAt: string | null;
  onExpire?: () => void;
};

export default function NoticePinExpiry({
  expiresAt,
  onExpire,
}: NoticePinExpiryProps) {
  const router = useRouter();

  useEffect(() => {
    if (!expiresAt) return;

    const end = new Date(expiresAt).getTime();
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;

    function schedule() {
      timer = setTimeout(
        () => {
          if (disposed) return;

          if (Date.now() < end) {
            schedule();
            return;
          }

          if (onExpire) onExpire();
          else router.refresh();
        },
        Math.min(Math.max(end - Date.now(), 0), 2147483647),
      );
    }

    schedule();

    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [expiresAt, onExpire, router]);

  return null;
}
