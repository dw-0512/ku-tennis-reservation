import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type DeleteBatchRequest = {
  adminPassword: string;
  batchId: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DeleteBatchRequest;

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        message: "관리자 비밀번호가 올바르지 않습니다.",
      },
      { status: 401 }
    );
  }

  if (!body.batchId) {
    return NextResponse.json(
      {
        ok: false,
        message: "삭제할 예약 주차가 없습니다.",
      },
      { status: 400 }
    );
  }

  const { count, error: countError } = await supabaseAdmin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", body.batchId)
    .is("cancelled_at", null);

  if (countError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약자 수 확인에 실패했습니다.",
        error: countError.message,
      },
      { status: 500 }
    );
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약자가 있는 주차는 삭제할 수 없습니다.",
      },
      { status: 409 }
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("reservation_batches")
    .delete()
    .eq("id", body.batchId);

  if (deleteError) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 주차 삭제에 실패했습니다.",
        error: deleteError.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "예약 주차가 삭제되었습니다.",
  });
}