"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  name: string;
  student_id: string;
  is_active: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminMembersPage() {
  const router = useRouter();

  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);

  const [newName, setNewName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const availableMembers = members.filter((member) => member.is_active);
  const unavailableMembers = members.filter((member) => !member.is_active);

  async function requestMembers(
    actionBody: Record<string, unknown>,
    passwordOverride?: string
  ) {
    const passwordToUse = passwordOverride ?? adminPassword;

    const response = await fetch("/api/admin/members", {
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

  async function loadMembers(passwordOverride?: string) {
    const passwordToUse = passwordOverride ?? adminPassword;

    setIsLoading(true);
    setMessage("");

    try {
      const result = await requestMembers(
        {
          action: "list",
        },
        passwordToUse
      );

      setAdminPassword(passwordToUse);
      window.sessionStorage.setItem("kutcAdminPassword", passwordToUse);

      setMembers(result.members ?? []);
      setIsLoggedIn(true);

      return true;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "동아리원 명단을 불러오지 못했습니다."
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

      const ok = await loadMembers(savedPassword);

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

  async function handleCreateMember() {
    setIsLoading(true);
    setMessage("");

    try {
      await requestMembers({
        action: "create",
        name: newName,
        studentId: newStudentId,
        isActive: true,
      });

      setNewName("");
      setNewStudentId("");
      setMessage("동아리원이 추가되었습니다.");

      await loadMembers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "동아리원 추가에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function startEdit(member: Member) {
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditStudentId(member.student_id);
    setEditIsActive(member.is_active);
    setMessage("");
  }

  function cancelEdit() {
    setEditingMemberId(null);
    setEditName("");
    setEditStudentId("");
    setEditIsActive(true);
    setMessage("");
  }

  async function handleSaveEdit(isActiveOverride?: boolean) {
    if (!editingMemberId) {
      return;
    }

    const nextIsActive = isActiveOverride ?? editIsActive;

    setIsLoading(true);
    setMessage("");

    try {
      await requestMembers({
        action: "update",
        memberId: editingMemberId,
        name: editName,
        studentId: editStudentId,
        isActive: nextIsActive,
      });

      setEditingMemberId(null);
      setEditName("");
      setEditStudentId("");
      setEditIsActive(true);
      setMessage("동아리원 정보가 수정되었습니다.");

      await loadMembers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "동아리원 수정에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteMember(member: Member) {
    const confirmed = window.confirm(
      `${member.name} (${member.student_id}) 동아리원을 삭제할까요?\n\n삭제하면 명단에서 완전히 사라집니다.`
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      await requestMembers({
        action: "delete",
        memberId: member.id,
      });

      setMessage("동아리원이 삭제되었습니다.");
      await loadMembers();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "동아리원 삭제에 실패했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function renderMemberRow(member: Member) {
    const isEditing = editingMemberId === member.id;
    const statusIsActive = isEditing ? editIsActive : member.is_active;

    return (
      <tr key={member.id} className="border-t border-gray-100">
        <td className="px-3 py-3 align-middle">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />
          ) : (
            <span className="font-bold text-gray-900">{member.name}</span>
          )}
        </td>

        <td className="px-3 py-3 align-middle">
          {isEditing ? (
            <input
              type="text"
              value={editStudentId}
              onChange={(event) => setEditStudentId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />
          ) : (
            <span className="text-gray-700">{member.student_id}</span>
          )}
        </td>

        <td className="px-3 py-3 align-middle">
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
              statusIsActive
                ? "bg-[#8B0029] text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {statusIsActive ? "예약 가능" : "예약 불가능"}
          </span>
        </td>

        <td className="px-3 py-3 align-middle">
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSaveEdit()}
                disabled={isLoading}
                className="rounded-lg bg-[#8B0029] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
              >
                저장
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={isLoading}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-200 disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={() => handleSaveEdit(!editIsActive)}
                disabled={isLoading}
                className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                {editIsActive ? "예약 불가능으로 변경" : "예약 가능으로 변경"}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteMember(member)}
                disabled={isLoading}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => startEdit(member)}
              className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-200"
            >
              수정
            </button>
          )}
        </td>
      </tr>
    );
  }

  function renderMemberSection(title: string, sectionMembers: Member[]) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">
              신입생 학번이 위로 오도록 정렬됩니다.
            </p>
          </div>

          <p className="text-sm font-bold text-[#8B0029]">
            총 {sectionMembers.length}명
          </p>
        </div>

        {sectionMembers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">해당 인원이 없습니다.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-y border-gray-200 bg-gray-50 text-xs font-bold text-gray-500">
                  <th className="px-3 py-3">이름</th>
                  <th className="px-3 py-3">학번</th>
                  <th className="px-3 py-3">상태</th>
                  <th className="px-3 py-3">관리</th>
                </tr>
              </thead>

              <tbody>
                {sectionMembers.map((member) => renderMemberRow(member))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
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
                동아리원 관리
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/kutc-admin"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                예약 관리
              </Link>

              <Link
                href="/kutc-admin/notices"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                공지사항 관리
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-6 px-5 py-6">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
          <h2 className="text-2xl font-bold text-gray-900">
            새 동아리원 추가
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="이름"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />

            <input
              type="text"
              value={newStudentId}
              onChange={(event) => setNewStudentId(event.target.value)}
              placeholder="학번"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />

            <button
              type="button"
              onClick={handleCreateMember}
              disabled={isLoading}
              className="rounded-xl bg-[#8B0029] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
            >
              추가하기
            </button>
          </div>

          {message ? (
            <p className="mt-3 text-sm font-bold text-[#8B0029]">{message}</p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => loadMembers()}
            disabled={isLoading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50"
          >
            새로고침
          </button>
        </div>

        {renderMemberSection("예약 가능 인원", availableMembers)}

        {renderMemberSection("예약 불가능 인원", unavailableMembers)}
      </section>
    </main>
  );
}