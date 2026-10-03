"use client";

export async function requestAdmin(
  url: string,
  adminPassword: string,
  actionBody: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPassword, ...actionBody }),
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) {
    throw new Error(result?.error ?? result?.message ?? "요청에 실패했습니다.");
  }
  return result;
}
