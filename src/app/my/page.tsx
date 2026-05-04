"use client";

import { useState } from "react";
import Link from "next/link";

type Reservation = {
  id: string;
  title: string;
  date: string;
  courtName: string;
  time: string;
  courtNumber: number;
  name: string;
};

export default function MyReservationsPage() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);
  const [cancelPassword, setCancelPassword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleSearch() {
    if (!name.trim() || !studentId.trim()) {
      alert("이름과 학번을 모두 입력해주세요.");
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    setSelectedReservationId(null);
    setCancelPassword("");

    const response = await fetch("/api/reservations/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reserverName: name,
        studentId,
      }),
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
  }

  async function handleCancel(reservationId: string) {
    if (!cancelPassword.trim()) {
      alert("예약 비밀번호를 입력해주세요.");
      return;
    }

    setIsCancelling(true);

    const response = await fetch("/api/reservations/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reservationId,
        password: cancelPassword,
      }),
    });

    const result = await response.json();

    setIsCancelling(false);

    if (!response.ok) {
      alert(result.message ?? "예약 취소에 실패했습니다.");
      return;
    }

    alert("예약이 취소되었습니다.");

    setReservations((prevReservations) =>
      prevReservations.filter((reservation) => reservation.id !== reservationId)
    );
    setSelectedReservationId(null);
    setCancelPassword("");
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
                내 예약 확인 및 취소
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
                내 예약 확인 및 취소
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
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
          <h2 className="text-2xl font-bold text-gray-900">
            예약자 정보 입력
          </h2>

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
            onClick={handleSearch}
            disabled={isSearching}
            className="mt-5 w-full rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50 sm:w-auto"
          >
            {isSearching ? "조회 중..." : "내 예약 조회하기"}
          </button>
        </div>

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

                      <button
                        onClick={() => {
                          setSelectedReservationId(reservation.id);
                          setCancelPassword("");
                        }}
                        className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-700"
                      >
                        예약 취소
                      </button>
                    </div>

                    {selectedReservationId === reservation.id && (
                      <div className="mt-4 rounded-2xl bg-gray-50 p-4">
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

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => handleCancel(reservation.id)}
                            disabled={isCancelling}
                            className="rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] disabled:opacity-50"
                          >
                            {isCancelling
                              ? "취소 중..."
                              : "예약 취소하기"}
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