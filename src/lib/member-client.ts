"use client";

export const MEMBER_STORAGE_KEY = "kutcMemberSession";
export const MEMBER_CHANGE_EVENT = "kutc-member-change";
export const MEMBER_DATA_CHANGE_EVENT = "kutc-member-data-change";

export function saveMemberToken(token: string) {
  window.sessionStorage.setItem(MEMBER_STORAGE_KEY, token);
  window.dispatchEvent(new Event(MEMBER_CHANGE_EVENT));
}

export function clearMemberToken() {
  window.sessionStorage.removeItem(MEMBER_STORAGE_KEY);
  window.dispatchEvent(new Event(MEMBER_CHANGE_EVENT));
}

export function memberFetch(url: string, options: RequestInit) {
  const headers = new Headers(options.headers);
  const token = window.sessionStorage.getItem(MEMBER_STORAGE_KEY);
  if (token) headers.set("x-kutc-member-session", token);
  return fetch(url, { ...options, headers }).then((response) => {
    if (response.status === 401) clearMemberToken();
    if (
      response.ok &&
      (url === "/api/reservations/create" || url === "/api/reservations/cancel")
    ) {
      window.dispatchEvent(new Event(MEMBER_DATA_CHANGE_EVENT));
    }
    return response;
  });
}
