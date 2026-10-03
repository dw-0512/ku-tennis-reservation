import { getMemberReservations } from "@/lib/booking/my-reservations";
import { getMemberSession } from "@/lib/member-session";
import getHomeData from "@/lib/member-pages/home";
import getNoticesData from "@/lib/member-pages/notices";
import getNoticeDetail from "@/lib/member-pages/notice-detail";

export async function loadMemberContent(
  token: string,
  path: string,
  page: string,
) {
  const member = await getMemberSession(token);
  if (!member) return { ok: false as const };
  if (path === "/")
    return {
      ok: true as const,
      kind: "home" as const,
      data: await getHomeData(),
    };
  if (path === "/my")
    return {
      ok: true as const,
      kind: "my" as const,
      data: await getMemberReservations(member),
    };
  if (path === "/notice")
    return {
      ok: true as const,
      kind: "notices" as const,
      data: await getNoticesData({ searchParams: Promise.resolve({ page }) }),
    };
  const match = /^\/notice\/([^/]+)$/.exec(path);
  if (match)
    return {
      ok: true as const,
      kind: "detail" as const,
      data: await getNoticeDetail({
        params: Promise.resolve({ noticeId: match[1] }),
      }),
    };
  return { ok: false as const };
}
