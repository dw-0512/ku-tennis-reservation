"use client";

import type { loadMemberContent } from "@/lib/member-pages/content";
import {
  MEMBER_CHANGE_EVENT,
  MEMBER_DATA_CHANGE_EVENT,
} from "@/lib/member-client";

export type MemberContent = Extract<
  Awaited<ReturnType<typeof loadMemberContent>>,
  { ok: true }
>;
type Entry = { content: MemberContent; receivedAt: number };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<MemberContent | null>>();
const MAX_AGE = 120000;
let generation = 0;

export function memberContentKey(token: string, path: string, page = "") {
  return JSON.stringify([token, path, page]);
}

function clearCache() {
  generation += 1;
  cache.clear();
  pending.clear();
}

if (typeof window !== "undefined") {
  window.addEventListener(MEMBER_CHANGE_EVENT, clearCache);
  window.addEventListener(MEMBER_DATA_CHANGE_EVENT, clearCache);
}

export function getCachedMemberContent(key: string): MemberContent | null {
  const entry = cache.get(key);
  if (!entry || Date.now() - entry.receivedAt > MAX_AGE) return null;
  if (entry.content.kind !== "home") return entry.content;
  return {
    ...entry.content,
    data: {
      ...entry.content.data,
      serverNow: new Date(
        Date.parse(entry.content.data.serverNow) +
          Date.now() -
          entry.receivedAt,
      ).toISOString(),
    },
  };
}

export function fetchMemberContent(
  token: string,
  path: string,
  page = "",
  force = false,
) {
  const key = memberContentKey(token, path, page);
  if (!force) {
    const existing = pending.get(key);
    if (existing) return existing;
  }
  const requestGeneration = generation;
  const request = fetch("/api/member/content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-kutc-member-session": token,
    },
    body: JSON.stringify({ path, page }),
    cache: "no-store",
  })
    .then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("불러오기에 실패했습니다.");
      const content = (await response.json()) as MemberContent;
      if (!content.ok) throw new Error("불러오기에 실패했습니다.");
      if (requestGeneration === generation && pending.get(key) === request) {
        if (cache.size >= 20) cache.delete(cache.keys().next().value!);
        cache.set(key, { content, receivedAt: Date.now() });
      }
      return content;
    })
    .finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
  pending.set(key, request);
  return request;
}

export function prefetchMemberContent(token: string, currentPath: string) {
  for (const path of ["/", "/my", "/notice"]) {
    if (path === currentPath) continue;
    const key = memberContentKey(token, path);
    if (!getCachedMemberContent(key) && !pending.has(key)) {
      void fetchMemberContent(token, path).catch(() => undefined);
    }
  }
}
