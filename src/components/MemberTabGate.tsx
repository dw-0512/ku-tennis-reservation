"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  fetchMemberContent,
  getCachedMemberContent,
  prefetchMemberContent,
  type MemberContent,
} from "@/lib/member-content-client";
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
  const cachedContent = useMemo(() => getCachedMemberContent(key), [key]);
  const previousRevision = useRef(revision);
  const [screen, setScreen] = useState<{
    key: string;
    content: MemberContent;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const force = previousRevision.current !== revision;
    previousRevision.current = revision;
    let prefetchTimer: ReturnType<typeof setTimeout> | undefined;
    fetchMemberContent(token, path, page, force)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          clearMemberToken();
          return;
        }
        setFailedKey(null);
        setScreen({ key, content: result });
        prefetchTimer = setTimeout(
          () => prefetchMemberContent(token, path),
          750,
        );
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
      clearTimeout(prefetchTimer);
    };
  }, [token, path, page, key, revision]);
  if (!token) return <MemberWelcome />;
  if (failedKey === key)
    return (
      <main className="min-h-screen bg-[#F8F8F8] px-5 py-6 text-sm text-gray-600">
        불러오기에 실패했습니다. 새로고침해주세요.
      </main>
    );
  const content = screen?.key === key ? screen.content : cachedContent;
  if (!content) return <main className="min-h-screen bg-[#F8F8F8]" />;
  switch (content.kind) {
    case "home":
      return <MemberHome data={content.data} />;
    case "my":
      return <MyReservations initialReservations={content.data} />;
    case "notices":
      return <MemberNotices data={content.data} />;
    case "detail":
      return <MemberNoticeDetail notice={content.data} />;
  }
}
