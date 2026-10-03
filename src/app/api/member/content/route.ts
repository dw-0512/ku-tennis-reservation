import { NextResponse } from "next/server";
import { loadMemberContent } from "@/lib/member-pages/content";
import { readJsonBody } from "@/lib/server-request";

export async function POST(request: Request) {
  const body = await readJsonBody<{ path?: unknown; page?: unknown }>(request);
  if (
    !body ||
    typeof body.path !== "string" ||
    (body.page !== undefined && typeof body.page !== "string")
  ) {
    return NextResponse.json(
      { ok: false, message: "요청 정보가 올바르지 않습니다." },
      { status: 400 },
    );
  }
  const token = request.headers.get("x-kutc-member-session");
  try {
    const content = await loadMemberContent(
      token ?? "",
      body.path,
      typeof body.page === "string" ? body.page : "",
    );
    return NextResponse.json(content, {
      status: content.ok ? 200 : 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "불러오기에 실패했습니다." },
      { status: 500 },
    );
  }
}
