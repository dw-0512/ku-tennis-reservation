export type Segment = {
  id: string;
  start_time: string;
  end_time: string;
  court_count: number;
};
export type Booking = {
  id: string;
  group_id: string;
  slot_start_time: string;
  slot_end_time: string;
  court_number: number;
  reserver_name: string;
};
export type HourSlot = { hour: number; segments: (string | null)[] };
export type Selection = { face: number; hours: number[] } | null;
export function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}
export function courtLabel(name: string) {
  return name
    .replace(/기숙사\s*코트/g, "기숙사 코트")
    .replace(/의대\s*코트/g, "의대 코트");
}
export function makeHourlySlots(segments: Segment[]): HourSlot[] {
  const rows = new Map<number, HourSlot>();
  for (const segment of [...segments].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  )) {
    for (
      let h = Number(segment.start_time.slice(0, 2));
      h < Number(segment.end_time.slice(0, 2));
      h++
    ) {
      const row = rows.get(h) ?? { hour: h, segments: [null, null] };
      for (let f = 0; f < Math.min(2, segment.court_count); f++)
        row.segments[f] ??= segment.id;
      rows.set(h, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.hour - b.hour);
}
export function bookingAt(bookings: Booking[], hour: number, face: number) {
  return bookings.find(
    (b) =>
      b.court_number === face &&
      Number(b.slot_start_time.slice(0, 2)) <= hour &&
      Number(b.slot_end_time.slice(0, 2)) > hour,
  );
}
export function toggleHour(
  selected: Selection,
  hour: number,
  face: number,
): Selection {
  if (selected?.face === face && selected.hours.includes(hour)) {
    const hours = selected.hours.filter((h) => h !== hour);
    return hours.length ? { face, hours } : null;
  }
  if (
    selected?.face === face &&
    selected.hours.length === 1 &&
    Math.abs(selected.hours[0] - hour) === 1
  ) {
    return { face, hours: [...selected.hours, hour].sort((a, b) => a - b) };
  }
  return { face, hours: [hour] };
}
export function canExtend(selected: Selection, hour: number, face: number) {
  return (
    selected?.face === face &&
    selected.hours.length === 1 &&
    Math.abs(selected.hours[0] - hour) === 1
  );
}
export function hourEnded(date: string, hour: number, now: number) {
  return (
    new Date(`${date}T00:00:00+09:00`).getTime() + (hour + 1) * 3600000 <= now
  );
}
