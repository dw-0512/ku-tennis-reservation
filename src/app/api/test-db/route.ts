import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Supabase 연결 실패",
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Supabase 연결 성공",
    data,
  });
}