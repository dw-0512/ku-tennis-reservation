import { isAdminPasswordValid, readJsonBody } from "@/lib/server-request";
import { NextResponse } from "next/server";

type AdminLoginRequest = {
  adminPassword: string;
};

export async function POST(request: Request) {
  const body = await readJsonBody<AdminLoginRequest>(request);
  if (!body)
    return NextResponse.json(
      { ok: false, message: "요청 정보가 올바르지 않습니다." },
      { status: 400 },
    );

  if (!isAdminPasswordValid(body.adminPassword)) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "관리자 인증 성공",
  });
}
