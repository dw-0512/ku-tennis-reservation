"use client";

import { memberFetch } from "@/lib/member-client";

import { useRef, useState } from "react";
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
  triggerLabel?: string;
  onBooked?: () => void;
  onDismiss?: () => void;
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
  triggerLabel,
  onBooked,
  onDismiss,
}: ReservationButtonProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPending = useRef(false);

  async function handleSubmit() {
    if (submitPending.current) return;
    if (!password.trim()) {
      alert("예약 비밀번호를 입력해주세요.");
      return;
    }

    submitPending.current = true;
    setIsSubmitting(true);

    try {
      const response = await memberFetch("/api/reservations/create", {
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
          password,
        }),
      });

      const result = await response.json();

      setIsSubmitting(false);

      if (!response.ok) {
        setIsOpen(false);
        onDismiss?.();
        alert(result.message ?? "예약에 실패했습니다.");
        router.refresh();
        return;
      }

      alert(
        result.partial
          ? "선택한 시간 중 일부가 먼저 예약되어 남은 시간만 예약되었습니다."
          : "예약이 완료되었습니다.",
      );

      setIsOpen(false);
      setPassword("");

      onBooked?.();
      router.refresh();
    } catch {
      setIsOpen(false);
      onDismiss?.();
      alert("연결이 끊겼습니다. 예약 확인에서 처리 결과를 확인해주세요.");
    } finally {
      submitPending.current = false;
      setIsSubmitting(false);
    }
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
        className={
          triggerLabel
            ? "shrink-0 rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021]"
            : "rounded-xl bg-white px-3 py-3 text-sm font-bold text-gray-900 ring-1 ring-gray-300 transition hover:border-[#8B0029] hover:text-[#8B0029] hover:ring-[#8B0029]"
        }
      >
        {triggerLabel ?? `${courtNumber}면 예약 가능`}
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

            <p className="mt-3 text-sm text-gray-600">
              선택한 시간 중 일부가 먼저 예약되면 남은 시간만 예약됩니다.
            </p>

            <div className="mt-5 space-y-4">
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
                onClick={() => {
                  setIsOpen(false);
                  onDismiss?.();
                }}
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
