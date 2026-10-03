import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createMemberSession } from "@/lib/member-session";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "이름과 학번을 입력해주세요." },
      { status: 400 },
    );
  }
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const studentId =
    typeof body?.studentId === "string"
      ? body.studentId.replace(/\s/g, "")
      : "";
  if (!name || !studentId)
    return NextResponse.json(
      { ok: false, message: "이름과 학번을 모두 입력해주세요." },
      { status: 400 },
    );
  const { data, error } = await supabaseAdmin
    .from("club_members")
    .select("name, student_id")
    .eq("name", name)
    .eq("student_id", studentId)
    .eq("is_active", true)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { ok: false, message: "동아리원 확인 중 오류가 발생했습니다." },
      { status: 500 },
    );
  if (!data)
    return NextResponse.json(
      { ok: false, message: "동아리원 정보가 확인되지 않았습니다." },
      { status: 403 },
    );
  return NextResponse.json({
    ok: true,
    token: createMemberSession(data.name, data.student_id),
  });
}
