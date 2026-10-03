export type NoticePrefix = "" | "예약 안내" | "이용 안내";

export function splitNoticeTitle(value: string): {
  prefix: NoticePrefix;
  title: string;
} {
  const match = value.match(/^\[(예약 안내|이용 안내)\]\s*/);

  return {
    prefix: match ? (match[1] as NoticePrefix) : "",
    title: match ? value.slice(match[0].length) : value,
  };
}

export function joinNoticeTitle(prefix: NoticePrefix, value: string) {
  let title = value.trim();

  if (prefix) {
    let parts = splitNoticeTitle(title);

    while (parts.prefix) {
      title = parts.title.trim();
      parts = splitNoticeTitle(title);
    }
  }

  return prefix ? `[${prefix}] ${title}` : title;
}

export function pinExpiresAt(date: string) {
  return new Date(`${date}T00:00:00+09:00`).getTime() + 86400000;
}

export function nextPinExpiry(
  notices: { is_pinned: boolean; pinned_until: string | null }[],
) {
  const dates = notices
    .filter((notice) => notice.is_pinned && notice.pinned_until)
    .map((notice) => pinExpiresAt(notice.pinned_until!))
    .filter((time) => time > Date.now());

  return dates.length ? new Date(Math.min(...dates)).toISOString() : null;
}
