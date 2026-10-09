import { NextResponse } from "next/server";
import getNoticeDetail from "@/lib/member-pages/notice-detail";
import { PUBLIC_GUIDE_NOTICE_ID } from "@/lib/notices/public-guide";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notice = await getNoticeDetail({
      params: Promise.resolve({ noticeId: PUBLIC_GUIDE_NOTICE_ID }),
    });

    return NextResponse.json(
      {
        notice: notice
          ? {
              id: notice.id,
              title: notice.title,
              is_pinned: notice.is_pinned,
              created_at: notice.created_at,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { notice: null },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}