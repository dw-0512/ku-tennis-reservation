type Segment = { startTime: string; endTime: string; courtCount: number };
type Group = { day: string; courtName: string; segments: Segment[] };

const days = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
];

export function validateScheduleGroups(value: unknown): string | null {
  if (!Array.isArray(value)) return "코트 배정 정보가 올바르지 않습니다.";
  const seen = new Set<string>();
  for (const group of value as Group[]) {
    if (
      !group ||
      !days.includes(group.day) ||
      typeof group.courtName !== "string" ||
      !group.courtName.trim() ||
      !Array.isArray(group.segments)
    )
      return "코트 배정 정보가 올바르지 않습니다.";
    const label = `${group.day} ${group.courtName}`;
    const key = `${group.day}:${group.courtName.replace(/\s/g, "")}`;
    if (seen.has(key)) return `${label}가 중복되어 있습니다.`;
    seen.add(key);
    for (const segment of group.segments) {
      if (
        !segment ||
        typeof segment.startTime !== "string" ||
        typeof segment.endTime !== "string" ||
        !/^(?:[01]\d|2[0-3]):00$/.test(segment.startTime) ||
        !/^(?:[01]\d|2[0-3]|24):00$/.test(segment.endTime) ||
        segment.startTime >= segment.endTime
      )
        return `${label}의 시간 구간이 올바르지 않습니다.`;
      if (![1, 2].includes(segment.courtCount))
        return `${label}의 면 수가 올바르지 않습니다.`;
    }
    const sorted = [...group.segments].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime)
        return `${label}의 시간 구간이 겹칩니다.`;
    }
  }
  return null;
}

export function isScheduleDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
