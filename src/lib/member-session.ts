import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export const MEMBER_SESSION_SECONDS = 60 * 60 * 24 * 7;

type MemberSession = { name: string; studentId: string; expiresAt: number };

function sign(payload: string) {
  const secret = process.env.RESERVATION_PASSWORD_SECRET;
  if (!secret) throw new Error("RESERVATION_PASSWORD_SECRET is missing");
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function createMemberSession(name: string, studentId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      name,
      studentId,
      expiresAt: Date.now() + MEMBER_SESSION_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeMemberSession(
  token: string | undefined,
): MemberSession | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const actual = Buffer.from(signature, "base64url");
    const expected = Buffer.from(sign(payload), "base64url");
    if (
      actual.length !== expected.length ||
      !crypto.timingSafeEqual(actual, expected)
    )
      return null;
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as MemberSession;
    if (
      typeof session.name !== "string" ||
      typeof session.studentId !== "string" ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

export async function getMemberSession(token?: string | null) {
  const session = decodeMemberSession(token ?? undefined);
  if (!session) return null;
  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select("name, student_id")
    .eq("student_id", session.studentId)
    .eq("name", session.name)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("동아리원 확인 중 오류가 발생했습니다.");
  return data
    ? { name: data.name as string, studentId: data.student_id as string }
    : null;
}
