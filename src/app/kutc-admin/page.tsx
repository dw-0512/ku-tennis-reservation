"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminReservation = {
  id: string;
  name: string;
  studentId: string;
  day: string;
  courtName: string;
  time: string;
  courtNumber: number;
  createdAt: string;
};

type SavedBatch = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  openAt: string;
  activeReservationCount: number;
  canOverwrite: boolean;
};

type TimeSegment = {
  id: number;
  startTime: string;
  endTime: string;
  courtCount: number;
};

type CourtGroup = {
  id: number;
  day: string;
  courtName: string;
  segments: TimeSegment[];
};

type WeekOption = {
  id: string;
  label: string;
  title: string;
  startDate: string;
  endDate: string;
  openLabel: string;
};

const hourOptions = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

const initialCourtGroups: CourtGroup[] = [
  {
    id: 1,
    day: "월요일",
    courtName: "기숙사코트",
    segments: [
      {
        id: 101,
        startTime: "09:00",
        endTime: "22:00",
        courtCount: 2,
      },
    ],
  },
  {
    id: 2,
    day: "월요일",
    courtName: "의대코트",
    segments: [
      {
        id: 201,
        startTime: "20:00",
        endTime: "22:00",
        courtCount: 1,
      },
    ],
  },
  {
    id: 3,
    day: "수요일",
    courtName: "기숙사코트",
    segments: [
      {
        id: 301,
        startTime: "09:00",
        endTime: "22:00",
        courtCount: 2,
      },
    ],
  },
  {
    id: 4,
    day: "목요일",
    courtName: "의대코트",
    segments: [
      {
        id: 401,
        startTime: "20:00",
        endTime: "22:00",
        courtCount: 1,
      },
    ],
  },
  {
    id: 5,
    day: "토요일",
    courtName: "기숙사코트",
    segments: [
      {
        id: 501,
        startTime: "12:00",
        endTime: "22:00",
        courtCount: 1,
      },
    ],
  },
  {
    id: 6,
    day: "일요일",
    courtName: "의대코트",
    segments: [
      {
        id: 601,
        startTime: "14:00",
        endTime: "22:00",
        courtCount: 1,
      },
    ],
  },
];

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatKoreanDate(date: Date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function addDays(date: Date, days: number) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

function getMondayOfThisWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function getWeekNumberInMonth(monday: Date) {
  const year = monday.getFullYear();
  const month = monday.getMonth();

  let count = 0;

  for (let day = 1; day <= monday.getDate(); day++) {
    const date = new Date(year, month, day);

    if (date.getDay() === 1) {
      count += 1;
    }
  }

  return count;
}

function createWeekOptions(): WeekOption[] {
  const today = new Date();
  const thisMonday = getMondayOfThisWeek(today);

  return Array.from({ length: 4 }).map((_, index) => {
    const monday = addDays(thisMonday, index * 7);
    const sunday = addDays(monday, 6);
    const openSunday = addDays(monday, -1);

    const year = monday.getFullYear();
    const month = monday.getMonth() + 1;
    const weekNumber = getWeekNumberInMonth(monday);

    const startLabel = formatKoreanDate(monday);
    const endLabel = formatKoreanDate(sunday);

    return {
      id: toDateString(monday),
      label: `${year}년 ${month}월 ${weekNumber}주차 (${startLabel} ~ ${endLabel})`,
      title: `${startLabel} ~ ${endLabel} 코트예약`,
      startDate: toDateString(monday),
      endDate: toDateString(sunday),
      openLabel: `${formatKoreanDate(openSunday)} 일요일 14:00`,
    };
  });
}

const weekOptions = createWeekOptions();

export default function AdminPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState(weekOptions[0].id);
  const [courtGroups, setCourtGroups] = useState(initialCourtGroups);
  const [savedBatches, setSavedBatches] = useState<SavedBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedReservationBatchTitle, setSelectedReservationBatchTitle] =
    useState("");
  const [adminReservations, setAdminReservations] = useState<
    AdminReservation[]
  >([]);
const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  const selectedWeek =
    weekOptions.find((week) => week.id === selectedWeekId) ?? weekOptions[0];

useEffect(() => {
  const savedPassword = window.sessionStorage.getItem("kutcAdminPassword");

  if (!savedPassword) {
    return;
  }

  setPassword(savedPassword);
  setIsUnlocked(true);
  void loadSavedBatches(savedPassword);
}, []);

  function isSavedWeek(startDate: string, batches = savedBatches) {
  return batches.some((batch) => batch.startDate === startDate);
}

function getFirstUnsavedWeekId(batches = savedBatches) {
  const firstUnsavedWeek = weekOptions.find(
    (week) => !isSavedWeek(week.startDate, batches)
  );

  return firstUnsavedWeek?.id ?? weekOptions[0].id;
}

  function isWeekSelectable(startDate: string) {
    return weekOptions.some((week) => week.id === startDate);
  }

  async function loadSavedBatches(adminPassword: string) {
    setIsLoadingBatches(true);

    const response = await fetch("/api/admin/batches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword,
      }),
    });

    const result = await response.json();

    setIsLoadingBatches(false);

    if (!response.ok) {
      alert(result.message ?? "저장된 예약 주차를 불러오지 못했습니다.");
      return;
    }

    const batches = result.batches as SavedBatch[];

setSavedBatches(batches);

if (editingBatchId === null && isSavedWeek(selectedWeekId, batches)) {
  setSelectedWeekId(getFirstUnsavedWeekId(batches));
}
  }

  async function handleLogin() {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adminPassword: password,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.message ?? "관리자 비밀번호가 올바르지 않습니다.");
    return;
  }

  window.sessionStorage.setItem("kutcAdminPassword", password);

  setIsUnlocked(true);
  await loadSavedBatches(password);
}

  function updateSegment(
    groupId: number,
    segmentId: number,
    field: "startTime" | "endTime" | "courtCount",
    value: string
  ) {
    setCourtGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          segments: group.segments.map((segment) => {
            if (segment.id !== segmentId) {
              return segment;
            }

            return {
              ...segment,
              [field]: field === "courtCount" ? Number(value) : value,
            };
          }),
        };
      })
    );
  }

  function addSegment(groupId: number) {
    setCourtGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        const newSegment: TimeSegment = {
          id: Date.now(),
          startTime: "09:00",
          endTime: "10:00",
          courtCount: 1,
        };

        return {
          ...group,
          segments: [...group.segments, newSegment],
        };
      })
    );
  }

  function deleteSegment(groupId: number, segmentId: number) {
    setCourtGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }

        return {
          ...group,
          segments: group.segments.filter(
            (segment) => segment.id !== segmentId
          ),
        };
      })
    );
  }

  async function handleSaveAll() {
    if (editingBatchId === null && isSavedWeek(selectedWeek.startDate)) {
    alert(
      "이미 저장된 주차입니다. 저장된 예약 주차 목록에서 '불러와서 수정'을 눌러 수정해주세요."
    );
    return;
  }
    const response = await fetch("/api/admin/save-schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword: password,
        editingBatchId,
        reservationTitle: selectedWeek.title,
        startDate: selectedWeek.startDate,
        endDate: selectedWeek.endDate,
        courtGroups,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message ?? "저장에 실패했습니다.");
      return;
    }

    alert(result.message ?? "예약 일정이 저장되었습니다.");
    setEditingBatchId(null);
    await loadSavedBatches(password);
  }

  async function loadBatchForEdit(batchId: string) {
    const response = await fetch("/api/admin/batches/load", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword: password,
        batchId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message ?? "예약 주차를 불러오지 못했습니다.");
      return;
    }

    setEditingBatchId(result.batch.id);
    setSelectedWeekId(result.batch.startDate);
    setCourtGroups(result.batch.courtGroups);

    alert("예약 주차를 불러왔습니다. 아래에서 수정 후 전체 저장하기를 눌러주세요.");
  }

  async function deleteBatch(batchId: string) {
    const confirmed = window.confirm(
      "이 예약 주차를 삭제할까요? 예약자가 없는 주차만 삭제할 수 있습니다."
    );

    if (!confirmed) {
      return;
    }

    const response = await fetch("/api/admin/batches/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminPassword: password,
        batchId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.message ?? "예약 주차 삭제에 실패했습니다.");
      return;
    }

    alert("예약 주차가 삭제되었습니다.");
    setEditingBatchId(null);
    await loadSavedBatches(password);
  }
  async function loadBatchReservations(batchId: string, batchTitle: string) {
  setIsLoadingReservations(true);
  setSelectedReservationBatchTitle(batchTitle);

  const response = await fetch("/api/admin/batches/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adminPassword: password,
      batchId,
    }),
  });

  const result = await response.json();

  setIsLoadingReservations(false);

  if (!response.ok) {
    alert(result.message ?? "예약자 목록을 불러오지 못했습니다.");
    setAdminReservations([]);
    return;
  }

  setAdminReservations(result.reservations);
}

  async function adminCancelReservation(reservationId: string) {
  const confirmed = window.confirm(
    "이 예약을 관리자 권한으로 취소할까요?"
  );

  if (!confirmed) {
    return;
  }

  const response = await fetch("/api/admin/batches/reservations/cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      adminPassword: password,
      reservationId,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.message ?? "예약 취소에 실패했습니다.");
    return;
  }

  alert("예약이 취소되었습니다.");

  setAdminReservations((prevReservations) =>
    prevReservations.filter((reservation) => reservation.id !== reservationId)
  );

  await loadSavedBatches(password);
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
                관리자 페이지
              </h1>
            </div>

            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                코트 예약으로 돌아가기
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

      <section className="mx-auto max-w-5xl px-5 py-6">
        {!isUnlocked ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-gray-900">
              관리자 비밀번호 입력
            </h2>

            <div className="mt-5">
              <label className="text-sm font-bold text-gray-700">
                관리자 비밀번호
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="관리자 비밀번호"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
              />
            </div>

            <button
              onClick={handleLogin}
              className="mt-5 w-full rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] sm:w-auto"
            >
              관리자 화면 열기
            </button>

          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
              <h2 className="text-2xl font-bold text-gray-900">
                저장된 예약 주차
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                이미 저장된 예약 주차와 현재 예약자 수를 확인합니다.
              </p>

              {isLoadingBatches ? (
                <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                  불러오는 중...
                </div>
              ) : savedBatches.length === 0 ? (
                <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                  저장된 예약 주차가 없습니다.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {savedBatches.map((batch) => {
                    const selectable = isWeekSelectable(batch.startDate);

                    return (
                      <div
                        key={batch.id}
                        className="rounded-2xl border border-[#E5E5E5] p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-gray-900">
                              {batch.title}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              {batch.startDate} ~ {batch.endDate}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              오픈 시간:{" "}
                              {new Date(batch.openAt).toLocaleString("ko-KR")}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                              예약자 {batch.activeReservationCount}명
                            </span>

                            <button
                              onClick={() => loadBatchReservations(batch.id, batch.title)}
                              className="rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100"
                            >
                              예약자 확인
                            </button>

                            {batch.activeReservationCount > 0 && (
                              <span className="rounded-full bg-[#8B0029] px-3 py-1 text-white">
                                예약자 있음
                              </span>
                            )}

                            {selectable ? (
                              <button
                                onClick={() => loadBatchForEdit(batch.id)}
                                className="rounded-full bg-gray-900 px-3 py-1 text-white transition hover:bg-gray-700"
                              >
                                수정하기
                              </button>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                                선택 범위 밖
                              </span>
                            )}

                            {batch.activeReservationCount === 0 && (
                              <button
                                onClick={() => deleteBatch(batch.id)}
                                className="rounded-full bg-white px-3 py-1 text-[#8B0029] ring-1 ring-[#8B0029]/30 transition hover:bg-[#8B0029]/10"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
  <h2 className="text-2xl font-bold text-gray-900">
    예약자 목록
  </h2>

  {selectedReservationBatchTitle ? (
    <p className="mt-1 text-sm text-gray-600">
      {selectedReservationBatchTitle}
    </p>
  ) : (
    <p className="mt-1 text-sm text-gray-600">
      저장된 예약 주차에서 예약자 확인을 누르면 목록이 표시됩니다.
    </p>
  )}

  {isLoadingReservations ? (
    <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
      불러오는 중...
    </div>
  ) : adminReservations.length === 0 ? (
    <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
      표시할 예약자가 없습니다.
    </div>
  ) : (
    <div className="mt-5 space-y-3">
      {adminReservations.map((reservation) => (
        <div
          key={reservation.id}
          className="rounded-2xl border border-[#E5E5E5] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-gray-900">
                {reservation.name} / {reservation.studentId}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {reservation.day} {reservation.courtName}{" "}
                {reservation.courtNumber}면
              </p>

              <p className="mt-1 text-sm font-semibold text-[#8B0029]">
                {reservation.time}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
  <p className="text-xs font-semibold text-gray-500">
    예약 시각:{" "}
    {new Date(reservation.createdAt).toLocaleString("ko-KR")}
  </p>

  <button
    onClick={() => adminCancelReservation(reservation.id)}
    className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#8B0029] ring-1 ring-[#8B0029]/30 transition hover:bg-[#8B0029]/10"
  >
    관리자 취소
  </button>
</div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
              <h2 className="text-2xl font-bold text-gray-900">
                예약 주차 선택
              </h2>

              <div className="mt-5">
                <label className="text-sm font-bold text-gray-700">
                  예약할 주차
                </label>

                <select
                  value={selectedWeekId}
                  onChange={(event) => {
                    setSelectedWeekId(event.target.value);
                    setEditingBatchId(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                >
                  {weekOptions.map((week) => {
  const isEditingThisWeek =
    editingBatchId !== null && week.id === selectedWeekId;

  const disabled = isSavedWeek(week.startDate) && !isEditingThisWeek;

  return (
    <option key={week.id} value={week.id} disabled={disabled}>
      {disabled ? `${week.label} - 이미 저장됨` : week.label}
    </option>
  );
})}
                </select>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-[#E5E5E5]">
                  <p className="text-xs font-bold text-gray-500">예약 제목</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {selectedWeek.title}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-[#E5E5E5]">
                  <p className="text-xs font-bold text-gray-500">예약 기간</p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {selectedWeek.startDate} ~ {selectedWeek.endDate}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-[#E5E5E5]">
                  <p className="text-xs font-bold text-gray-500">
                    자동 오픈 시간
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {selectedWeek.openLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
              <h2 className="text-2xl font-bold text-gray-900">
                코트 배정 수정
              </h2>

              <div className="mt-5 space-y-5">
                {courtGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-[#E5E5E5] p-4"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#8B0029]">
                          {group.day}
                        </p>

                        <h3 className="text-xl font-bold text-gray-900">
                          {group.courtName}
                        </h3>
                      </div>

                      <button
                        onClick={() => addSegment(group.id)}
                        className="mt-3 w-full rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-700 sm:mt-0 sm:w-auto"
                      >
                        구간 추가
                      </button>
                    </div>

                    {group.segments.length === 0 ? (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">
                        등록된 구간이 없습니다. 이 코트는 이번 예약에 표시되지 않습니다.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {group.segments.map((segment, index) => (
                          <div
                            key={segment.id}
                            className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-[70px_1fr_120px_90px] sm:items-center"
                          >
                            <div className="text-sm font-bold text-gray-500">
                              구간 {index + 1}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                              <select
                                value={segment.startTime}
                                onChange={(event) =>
                                  updateSegment(
                                    group.id,
                                    segment.id,
                                    "startTime",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                              >
                                {hourOptions.map((hour) => (
                                  <option key={hour} value={hour}>
                                    {hour}
                                  </option>
                                ))}
                              </select>

                              <span className="text-center text-sm font-bold text-gray-500">
                                ~
                              </span>

                              <select
                                value={segment.endTime}
                                onChange={(event) =>
                                  updateSegment(
                                    group.id,
                                    segment.id,
                                    "endTime",
                                    event.target.value
                                  )
                                }
                                className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                              >
                                {hourOptions.map((hour) => (
                                  <option key={hour} value={hour}>
                                    {hour}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <select
                              value={segment.courtCount}
                              onChange={(event) =>
                                updateSegment(
                                  group.id,
                                  segment.id,
                                  "courtCount",
                                  event.target.value
                                )
                              }
                              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold outline-none transition focus:border-[#8B0029] focus:ring-2 focus:ring-[#8B0029]/20"
                            >
                              <option value={1}>1면</option>
                              <option value={2}>2면</option>
                            </select>

                            <button
                              onClick={() => deleteSegment(group.id, segment.id)}
                              className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-100"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
              <button
                onClick={handleSaveAll}
                className="w-full rounded-xl bg-[#8B0029] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021] sm:w-auto"
              >
                전체 저장하기
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}