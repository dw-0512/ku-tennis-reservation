"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { loadMemberContent } from "@/app/member-content";
import {
  MEMBER_STORAGE_KEY,
  MEMBER_CHANGE_EVENT,
  clearMemberToken,
} from "@/lib/member-client";
import MemberWelcome from "./MemberWelcome";
import MemberHome from "./MemberHome";
import MemberNotices from "./MemberNotices";
import MemberNoticeDetail from "./MemberNoticeDetail";
import MyReservations from "./MyReservations";

type MemberContent = Extract<
  Awaited<ReturnType<typeof loadMemberContent>>,
  { ok: true }
>;

function subscribe(callback: () => void) {
  window.addEventListener(MEMBER_CHANGE_EVENT, callback);
  return () => window.removeEventListener(MEMBER_CHANGE_EVENT, callback);
}

export default function MemberTabGate({
  path,
  page = "",
  revision,
}: {
  path: string;
  page?: string;
  revision: string;
}) {
  const token = useSyncExternalStore(
    subscribe,
    () => window.sessionStorage.getItem(MEMBER_STORAGE_KEY),
    () => null,
  );
  const key = JSON.stringify([token, path, page]);
  const [screen, setScreen] = useState<{
    key: string;
    content: MemberContent;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    loadMemberContent(token, path, page)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          clearMemberToken();
          return;
        }
        setFailedKey(null);
        setScreen({ key, content: result });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [token, path, page, key, revision]);
  if (!token) return <MemberWelcome />;
  if (failedKey === key)
    return (
      <main className="min-h-screen bg-[#F8F8F8] px-5 py-6 text-sm text-gray-600">
        불러오기에 실패했습니다. 새로고침해주세요.
      </main>
    );
  if (screen?.key !== key)
    return <main className="min-h-screen bg-[#F8F8F8]" />;
  const content = screen.content;
  switch (content.kind) {
    case "home":
      return <MemberHome data={content.data} />;
    case "my":
      return <MyReservations />;
    case "notices":
      return <MemberNotices data={content.data} />;
    case "detail":
      return <MemberNoticeDetail notice={content.data} />;
  }
}
