"use server";

import { loadMemberContent as loadContent } from "@/lib/member-pages/content";

export async function loadMemberContent(
  token: string,
  path: string,
  page: string,
) {
  return loadContent(token, path, page);
}
