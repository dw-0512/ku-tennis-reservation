import { isScheduleDate } from "@/lib/booking/schedule";
import {
  isAdminPasswordValid,
  readJsonBody,
  cleanText,
} from "@/lib/server-request";
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
  isPinned?: boolean;
  pinnedUntil?: string | null;
  page?: number;
};

type ExistingNoticeForPin = {
  is_pinned: boolean;
  pinned_at: string | null;
};

export async function POST(request: Request) {
  const body = await readJsonBody<NoticeRequest>(request);
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
    const page = Math.max(1, Number.isInteger(body.page) ? body.page! : 1);
    const from = (page - 1) * 5;
    const { data, error, count } = await supabaseAdmin
      .from("kutc_notices")
      .select(
        "id, title, content, is_published, is_pinned, pinned_at, pinned_until, created_at, updated_at",
        { count: "exact" },
      )
      .order("is_pinned", { ascending: false })
      .order("pinned_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 4);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 목록을 불러오지 못했습니다.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      notices: data ?? [],
      totalPages: Math.max(1, Math.ceil((count ?? 0) / 5)),
    });
  }

  if (action === "create") {
    const title = cleanText(body.title ?? "");
    const content = cleanText(body.content ?? "");
    const isPublished = body.isPublished ?? true;
    const isPinned = body.isPinned ?? false;
    const pinnedUntil = isPinned ? (body.pinnedUntil ?? null) : null;

    if (pinnedUntil !== null && !isScheduleDate(pinnedUntil)) {
      return NextResponse.json(
        { ok: false, message: "고정 종료 날짜가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        {
          ok: false,
          message: "제목과 내용을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("notices").insert({
      title,
      content,
      is_published: isPublished,
      is_pinned: isPinned,
      pinned_until: pinnedUntil,
      pinned_at: isPinned ? new Date().toISOString() : null,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "공지사항 저장에 실패했습니다.",
          error: error.message,
        },
        { status: 500 },
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
    const isPinned = body.isPinned ?? false;
    const pinnedUntil = isPinned ? (body.pinnedUntil ?? null) : null;

    if (pinnedUntil !== null && !isScheduleDate(pinnedUntil)) {
      return NextResponse.json(
        { ok: false, message: "고정 종료 날짜가 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (!noticeId) {
      return NextResponse.json(
        {
          ok: false,
          message: "수정할 공지사항을 찾을 수 없습니다.",
        },
        { status: 400 },
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        {
          ok: false,
          message: "제목과 내용을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const { data: existingNotice, error: existingNoticeError } =
      await supabaseAdmin
        .from("kutc_notices")
        .select("is_pinned, pinned_at")
        .eq("id", noticeId)
        .single<ExistingNoticeForPin>();

    if (existingNoticeError || !existingNotice) {
      return NextResponse.json(
        {
          ok: false,
          message: "수정할 공지사항을 찾을 수 없습니다.",
          error: existingNoticeError?.message,
        },
        { status: 404 },
      );
    }

    const pinnedAt = isPinned
      ? (existingNotice.pinned_at ?? new Date().toISOString())
      : null;

    const { error } = await supabaseAdmin
      .from("notices")
      .update({
        title,
        content,
        is_published: isPublished,
        is_pinned: isPinned,
        pinned_until: pinnedUntil,
        pinned_at: pinnedAt,
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
        { status: 500 },
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
        { status: 400 },
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
        { status: 500 },
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
    { status: 400 },
  );
}
