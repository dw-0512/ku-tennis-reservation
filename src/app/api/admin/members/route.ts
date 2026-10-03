import {
  isAdminPasswordValid,
  readJsonBody,
  cleanText,
} from "@/lib/server-request";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type MemberAction = "list" | "create" | "update" | "delete";

type MemberRequest = {
  adminPassword: string;
  action: MemberAction;
  memberId?: string;
  name?: string;
  studentId?: string;
  isActive?: boolean;
  memo?: string | null;
};

function cleanStudentId(value: string) {
  return cleanText(value).replace(/\s/g, "");
}

export async function POST(request: Request) {
  const body = await readJsonBody<MemberRequest>(request);
  if (!body)
    return NextResponse.json(
      { ok: false, message: "요청 정보가 올바르지 않습니다." },
      { status: 400 },
    );

  const adminPassword = body.adminPassword ?? "";
  const action = body.action;

  if (!isAdminPasswordValid(adminPassword)) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 },
    );
  }

  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("club_members")
      .select("id, name, student_id, is_active, memo, created_at, updated_at")
      .order("student_id", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "동아리원 명단을 불러오지 못했습니다.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      members: data ?? [],
    });
  }

  if (action === "create") {
    const name = cleanText(body.name ?? "");
    const studentId = cleanStudentId(body.studentId ?? "");
    const isActive = body.isActive ?? true;
    const memo = cleanText(body.memo ?? "");

    if (!name || !studentId) {
      return NextResponse.json(
        {
          ok: false,
          message: "이름과 학번을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("club_members").insert({
      name,
      student_id: studentId,
      is_active: isActive,
      memo: memo || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            message: "이미 등록된 학번입니다.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "동아리원 추가에 실패했습니다.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "동아리원이 추가되었습니다.",
    });
  }

  if (action === "update") {
    const memberId = cleanText(body.memberId ?? "");
    const name = cleanText(body.name ?? "");
    const studentId = cleanStudentId(body.studentId ?? "");
    const isActive = body.isActive ?? true;
    const memo = cleanText(body.memo ?? "");

    if (!memberId) {
      return NextResponse.json(
        {
          ok: false,
          message: "수정할 동아리원을 찾을 수 없습니다.",
        },
        { status: 400 },
      );
    }

    if (!name || !studentId) {
      return NextResponse.json(
        {
          ok: false,
          message: "이름과 학번을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("club_members")
      .update({
        name,
        student_id: studentId,
        is_active: isActive,
        memo: memo || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            message: "이미 등록된 학번입니다.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          message: "동아리원 수정에 실패했습니다.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "동아리원 정보가 수정되었습니다.",
    });
  }

  if (action === "delete") {
    const memberId = cleanText(body.memberId ?? "");

    if (!memberId) {
      return NextResponse.json(
        {
          ok: false,
          message: "삭제할 동아리원을 찾을 수 없습니다.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("club_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "동아리원 삭제에 실패했습니다.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "동아리원이 삭제되었습니다.",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      message: "올바르지 않은 요청입니다.",
    },
    { status: 400 },
  );
}
