"use client";

import { memberFetch } from "@/lib/member-client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Reservation = {
  id: string;
  title: string;
  date: string;
  courtDate: string;
  courtName: string;
  time: string;
  slotEndTime: string;
  courtNumber: number;
  name: string;
  canCancel: boolean;
  hours: { hour: number; canCancel: boolean }[];
};

export default function MyReservationsPage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelHours, setCancelHours] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleSearch() {
    setIsSearching(true);
    setHasSearched(false);
    setSelectedReservationId(null);
    setCancelPassword("");

    try {
      const response = await memberFetch("/api/reservations/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      setIsSearching(false);
      setHasSearched(true);

      if (!response.ok) {
        alert(result.message ?? "예약 조회에 실패했습니다.");
        setReservations([]);
        return;
      }

      setReservations(result.reservations);
    } catch {
      alert("예약 조회에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    memberFetch("/api/reservations/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.assign("/");
          return;
        }
        const result = await response.json();
        if (controller.signal.aborted) return;
        setHasSearched(true);
        setIsSearching(false);
        if (!response.ok) {
          alert(result.message ?? "예약 조회에 실패했습니다.");
          return;
        }
        setReservations(result.reservations);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setIsSearching(false);
        alert("예약 조회에 실패했습니다. 다시 시도해주세요.");
      });
    return () => controller.abort();
  }, []);

  async function handleCancel(reservationId: string) {
    if (!cancelPassword.trim()) {
      alert("예약 비밀번호를 입력해주세요.");
      return;
    }

    if (!cancelHours.length) {
      alert("취소할 시간을 선택해주세요.");
      return;
    }
    const reservation = reservations.find((r) => r.id === reservationId);
    const selectedTimes = cancelHours
      .map((h) => `${h}:00 ~ ${h + 1}:00`)
      .join(", ");
    if (
      !window.confirm(
        `${reservation?.courtName ?? ""} ${reservation?.courtNumber ?? ""}면\n${selectedTimes}\n선택한 시간을 취소하시겠습니까?`,
      )
    )
      return;
    setIsCancelling(true);
    try {
      const response = await memberFetch("/api/reservations/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          password: cancelPassword,
          hours: cancelHours,
        }),
      });

      const result = await response.json();

      setIsCancelling(false);

      if (!response.ok) {
        alert(result.message ?? "예약 취소에 실패했습니다.");
        return;
      }

      alert("예약이 취소되었습니다.");

      setSelectedReservationId(null);
      setCancelPassword("");
      setCancelHours([]);
      await handleSearch();
    } catch {
      alert("연결이 끊겼습니다. 다시 조회하여 취소 결과를 확인해주세요.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <section className="sticky top-0 z-40 bg-[#8B0029] px-5 py-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                Korea University Tennis Club
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                예약 확인 및 취소
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                코트 예약
              </Link>

              <Link
                href="/my"
                className="rounded-full bg-white px-4 py-2 text-[#8B0029]"
              >
                예약 확인
              </Link>

              <Link
                href="/notice"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                공지사항
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        {isSearching && <p className="text-sm text-gray-600">조회 중...</p>}
        {hasSearched && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-gray-900">예약 내역</h2>

            {reservations.length === 0 ? (
              <div className="mt-5 rounded-2xl bg-gray-50 p-5 text-sm font-semibold text-gray-600">
                조회된 예약이 없습니다.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="rounded-2xl border border-[#E5E5E5] p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#8B0029]">
                          {reservation.title}
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {reservation.date} {reservation.courtName}{" "}
                          {reservation.courtNumber}면
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {reservation.time}
                        </p>
                      </div>

                      {reservation.canCancel ? (
                        <button
                          onClick={() => {
                            setSelectedReservationId(reservation.id);
                            setCancelHours([]);
                            setCancelPassword("");
                          }}
                          className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-700"
                        >
                          예약 취소
                        </button>
                      ) : (
                        <span className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-500">
                          취소 불가
                        </span>
                      )}
                    </div>

                    {reservation.canCancel &&
                      selectedReservationId === reservation.id && (
                        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm font-bold text-gray-700">
                            취소할 시간
                          </p>
                          <div className="mb-4 mt-2 flex flex-wrap gap-3">
                            {reservation.hours.map(({ hour, canCancel }) => (
                              <button
                                key={hour}
                                disabled={!canCancel || isCancelling}
                                aria-pressed={cancelHours.includes(hour)}
                                onClick={() =>
                                  setCancelHours((prev) =>
                                    prev.includes(hour)
                                      ? prev.filter((h) => h !== hour)
                                      : [...prev, hour].sort((a, b) => a - b),
                                  )
                                }
                                className={`rounded-xl px-3 py-3 text-sm font-bold ${!canCancel ? "bg-gray-200 text-gray-500" : cancelHours.includes(hour) ? "bg-[#8B0029] text-white" : "bg-white text-gray-900 ring-1 ring-gray-300"}`}
                              >
                                {hour}:00 ~ {hour + 1}:00
                                {!canCancel ? " (취소 불가)" : ""}
                              </button>
                            ))}
                          </div>
                          <label className="text-sm font-bold text-gray-700">
                            예약 비밀번호
                          </label>

                          <input
                            type="password"
                            value={cancelPassword}
                            onChange={(event) =>
                              setCancelPassword(event.target.value)
                            }
                            placeholder="예약할 때 입력한 비밀번호"
                            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                          />

                          <p className="mt-2 text-xs text-gray-500">
                            비밀번호를 잊으셨다면 관리자에게 문의해주세요.
                          </p>
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => handleCancel(reservation.id)}
                              disabled={isCancelling}
                              className="rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
                            >
                              {isCancelling ? "취소 중..." : "예약 취소하기"}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedReservationId(null);
                                setCancelPassword("");
                              }}
                              disabled={isCancelling}
                              className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100 disabled:opacity-50"
                            >
                              닫기
                            </button>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
