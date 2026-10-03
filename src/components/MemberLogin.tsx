"use client";

import { saveMemberToken } from "@/lib/member-client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function MemberLogin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const loginPending = useRef(false);

  async function handleLogin() {
    if (loginPending.current) return;
    if (!name.trim() || !studentId.trim()) {
      alert("이름과 학번을 모두 입력해주세요.");
      return;
    }
    loginPending.current = true;
    setIsChecking(true);
    try {
      const response = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, studentId }),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(result.message ?? "동아리원 확인에 실패했습니다.");
        return;
      }
      saveMemberToken(result.token);
      router.replace("/");
    } catch {
      alert("동아리원 확인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      loginPending.current = false;
      setIsChecking(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-gray-900">동아리원 정보 입력</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-gray-700">이름</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 이동우"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">학번</label>
            <input
              type="text"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              placeholder="예: 2025123456"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={isChecking}
          className="mt-5 w-full rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50 sm:w-auto"
        >
          {isChecking ? "확인 중..." : "동아리원 확인하기"}
        </button>
      </div>
    </section>
  );
}
