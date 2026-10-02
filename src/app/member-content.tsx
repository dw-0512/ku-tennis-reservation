"use server";

import { getMemberSession } from "@/lib/member-session";
import getHomeData from "@/lib/member-pages/home";
import getNoticesData from "@/lib/member-pages/notices";
import getNoticeDetail from "@/lib/member-pages/notice-detail";

export async function loadMemberContent(
  token: string,
  path: string,
  page: string,
) {
  if (!(await getMemberSession(token))) return { ok: false as const };
  if (path === "/")
    return {
      ok: true as const,
      kind: "home" as const,
      data: await getHomeData(),
    };
  if (path === "/my") return { ok: true as const, kind: "my" as const };
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
