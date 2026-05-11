"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Notice = {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

function formatKoreanDateTime(dateString: string) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return formatter.format(new Date(dateString));
}

export default function AdminNoticesPage() {
  const router = useRouter();

  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function requestNotices(
    actionBody: Record<string, unknown>,
    passwordOverride?: string
  ) {
    const passwordToUse = passwordOverride ?? adminPassword;

    const response = await fetch("/api/admin/notices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword: passwordToUse,
        ...actionBody,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error ?? result.message ?? "요청에 실패했습니다.");
    }

    return result;
  }

  async function loadNotices(passwordOverride?: string) {
    const passwordToUse = passwordOverride ?? adminPassword;

    setIsLoading(true);
    setMessage("");

    try {
      const result = await requestNotices(
        {
          action: "list",
        },
        passwordToUse
      );

      setAdminPassword(passwordToUse);
      window.sessionStorage.setItem("kutcAdminPassword", passwordToUse);

      setNotices(result.notices ?? []);
      setIsLoggedIn(true);

      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "공지사항 목록을 불러오지 못했습니다."
      );
      setIsLoggedIn(false);

      return false;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function checkAdmin() {
      const savedPassword = window.sessionStorage.getItem("kutcAdminPassword");

      if (!savedPassword) {
        router.replace("/kutc-admin");
        return;
      }

      const ok = await loadNotices(savedPassword);

      if (!isMounted) {
        return;
      }

      if (!ok) {
        window.sessionStorage.removeItem("kutcAdminPassword");
        router.replace("/kutc-admin");
        return;
      }

      setIsCheckingAdmin(false);
    }

    void checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit() {
    setIsLoading(true);
    setMessage("");

    try {
      await requestNotices({
        action: editingNoticeId ? "update" : "create",
        noticeId: editingNoticeId,
        title,
        content,
        isPublished,
      });

      setTitle("");
      setContent("");
      setIsPublished(true);
      setEditingNoticeId(null);
      setMessage(
        editingNoticeId
          ? "공지사항이 수정되었습니다."
          : "공지사항이 저장되었습니다."
      );

      await loadNotices();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "공지사항 저장에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(noticeId: string) {
    const confirmed = window.confirm("이 공지사항을 삭제할까요?");

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await requestNotices({
        action: "delete",
        noticeId,
      });

      setMessage("공지사항이 삭제되었습니다.");
      await loadNotices();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "공지사항 삭제에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(notice: Notice) {
    setEditingNoticeId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setIsPublished(notice.is_published);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingNoticeId(null);
    setTitle("");
    setContent("");
    setIsPublished(true);
    setMessage("");
  }

  if (isCheckingAdmin || !isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <section className="bg-[#8B0029] px-5 py-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                Korea University Tennis Club
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                공지사항 관리
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/kutc-admin"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                예약 관리로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-6 px-5 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingNoticeId ? "공지사항 수정" : "새 공지사항 작성"}
          </h2>

          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="제목"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="내용"
              rows={8}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />

            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
                className="h-4 w-4"
              />
              공개하기
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="rounded-xl bg-[#8B0029] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
              >
                {editingNoticeId ? "수정하기" : "등록하기"}
              </button>

              {editingNoticeId ? (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl bg-gray-200 px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-300"
                >
                  수정 취소
                </button>
              ) : null}
            </div>

            {message ? (
              <p className="text-sm font-bold text-[#8B0029]">{message}</p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              공지사항 목록
            </h2>

            <button
              type="button"
              onClick={() => loadNotices()}
              disabled={isLoading}
              className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 ring-1 ring-gray-200 transition hover:bg-gray-200 disabled:opacity-50"
            >
              새로고침
            </button>
          </div>

          {notices.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              등록된 공지사항이 없습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {notices.map((notice) => (
                <article
                  key={notice.id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {notice.title}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${
                            notice.is_published
                              ? "bg-[#8B0029] text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {notice.is_published ? "공개" : "비공개"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-bold text-gray-500">
                        {formatKoreanDateTime(notice.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(notice)}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-200"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(notice.id)}
                        className="rounded-lg bg-[#8B0029] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#6F0021]"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {notice.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}