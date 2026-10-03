const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatKoreanDateTime(dateString: string) {
  return dateFormatter.format(new Date(dateString));
}

export function isNewNotice(dateString: string) {
  return Date.now() - new Date(dateString).getTime() <= 86400000;
}
