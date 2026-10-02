"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReservationButtonProps = {
  batchId: string;
  groupId: string;
  segmentId: string;
  slotStartTime: string;
  slotEndTime: string;
  courtNumber: number;
  courtName: string;
  reservedBy?: string;
  isClosed?: boolean;
};

export default function ReservationButton({
  batchId,
  groupId,
  segmentId,
  slotStartTime,
  slotEndTime,
  courtNumber,
  courtName,
  reservedBy,
  isClosed,
}: ReservationButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [reserverName, setReserverName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reserverName.trim() || !studentId.trim() || !password.trim()) {
      alert("이름, 학번, 예약 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/reservations/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchId,
        groupId,
        segmentId,
        slotStartTime,
        slotEndTime,
        courtNumber,
        reserverName,
        studentId,
        password,
      }),
    });

    const result = await response.json();

    setIsSubmitting(false);

    if (!response.ok) {
      alert(result.message ?? "예약에 실패했습니다.");
      return;
    }

    alert("예약이 완료되었습니다.");

    setIsOpen(false);
    setReserverName("");
    setStudentId("");
    setPassword("");

    router.refresh();
  }

  if (reservedBy) {
    return (
      <button
        disabled
        className="rounded-xl bg-[#8B0029] px-3 py-3 text-sm font-bold text-white"
      >
        {courtNumber}면 {reservedBy}
      </button>
    );
  }

  if (isClosed) {
  return (
    <button
      disabled
      className="rounded-xl bg-gray-200 px-3 py-3 text-sm font-bold text-gray-500"
    >
      {courtNumber}면 예약 마감
    </button>
  );
}

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-white px-3 py-3 text-sm font-bold text-gray-900 ring-1 ring-gray-300 transition hover:border-[#8B0029] hover:text-[#8B0029] hover:ring-[#8B0029]"
      >
        {courtNumber}면 예약 가능
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">코트 예약</h2>

            <p className="mt-2 text-sm font-semibold text-gray-600">
              <span className="block">{courtName}</span>
              <span className="block">
                {slotStartTime} ~ {slotEndTime} / {courtNumber}면
              </span>
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700">이름</label>
                <input
                  type="text"
                  value={reserverName}
                  onChange={(event) => setReserverName(event.target.value)}
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

              <div>
                <label className="text-sm font-bold text-gray-700">
                  예약 비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="예약 취소 시 사용할 비밀번호"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
              >
                {isSubmitting ? "예약 중..." : "예약하기"}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100 disabled:opacity-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}