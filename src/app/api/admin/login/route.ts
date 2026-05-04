import { NextResponse } from "next/server";

type AdminLoginRequest = {
  adminPassword: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AdminLoginRequest;

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "관리자 인증 성공",
  });
}