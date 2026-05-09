import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type NoticeAction = "list" | "create" | "update" | "delete";

type NoticeRequest = {
  adminPassword: string;
  action: NoticeAction;
  noticeId?: string;
  title?: string;
  content?: string;
  isPublished?: boolean;
};

function cleanText(value: string) {
  return value.trim();
}

function isAdminPasswordValid(adminPassword: string) {
  return adminPassword === process.env.ADMIN_PASSWORD;
}

export async function POST(request: Request) {
  const body = (await request.json()) as NoticeRequest;

  const adminPassword = body.adminPassword ?? "";
  const action = body.action;

  if (!isAdminPasswordValid(adminPassword)) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("notices")
      .select("id, title, content, is_published, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 목록을 불러오지 못했습니다.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      notices: data ?? [],
    });
  }

  if (action === "create") {
    const title = cleanText(body.title ?? "");
    const content = cleanText(body.content ?? "");
    const isPublished = body.isPublished ?? true;

    if (!title || !content) {
      return NextResponse.json(
        {
          ok: false,
          message: "제목과 내용을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("notices").insert({
      title,
      content,
      is_published: isPublished,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 저장에 실패했습니다.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "공지사항이 저장되었습니다.",
    });
  }

  if (action === "update") {
    const noticeId = cleanText(body.noticeId ?? "");
    const title = cleanText(body.title ?? "");
    const content = cleanText(body.content ?? "");
    const isPublished = body.isPublished ?? true;

    if (!noticeId) {
      return NextResponse.json(
        {
          ok: false,
          message: "수정할 공지사항을 찾을 수 없습니다.",
        },
        { status: 400 }
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        {
          ok: false,
          message: "제목과 내용을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("notices")
      .update({
        title,
        content,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noticeId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 수정에 실패했습니다.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "공지사항이 수정되었습니다.",
    });
  }

  if (action === "delete") {
    const noticeId = cleanText(body.noticeId ?? "");

    if (!noticeId) {
      return NextResponse.json(
        {
          ok: false,
          message: "삭제할 공지사항을 찾을 수 없습니다.",
        },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("notices")
      .delete()
      .eq("id", noticeId);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 삭제에 실패했습니다.",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "공지사항이 삭제되었습니다.",
    });
  }

  return NextResponse.json(
    {
      ok: false,
      message: "올바르지 않은 요청입니다.",
    },
    { status: 400 }
  );
}