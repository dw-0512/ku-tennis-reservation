import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type LoadBatchRequest = {
  adminPassword: string;
  batchId: string;
};

type RawSegment = {
  id: string;
  start_time: string;
  end_time: string;
  court_count: number;
};

type RawCourtGroup = {
  id: string;
  day_name: string;
  court_name: string;
  display_order: number;
  court_segments: RawSegment[];
};

type RawBatch = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  court_groups: RawCourtGroup[];
};

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

export async function POST(request: Request) {
  const body = (await request.json()) as LoadBatchRequest;

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
        message: "불러올 예약 주차가 없습니다.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select(
      `
      id,
      title,
      start_date,
      end_date,
      court_groups (
        id,
        day_name,
        court_name,
        display_order,
        court_segments (
          id,
          start_time,
          end_time,
          court_count
        )
      )
    `
    )
    .eq("id", body.batchId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        ok: false,
        message: "예약 주차를 불러오지 못했습니다.",
        error: error?.message,
      },
      { status: 500 }
    );
  }

  const batch = data as unknown as RawBatch;

  const courtGroups = batch.court_groups
    .sort((a, b) => a.display_order - b.display_order)
    .map((group, groupIndex) => ({
      id: groupIndex + 1,
      day: group.day_name,
      courtName: group.court_name,
      segments: group.court_segments.map((segment, segmentIndex) => ({
        id: (groupIndex + 1) * 1000 + segmentIndex + 1,
        startTime: normalizeTime(segment.start_time),
        endTime: normalizeTime(segment.end_time),
        courtCount: segment.court_count,
      })),
    }));

  return NextResponse.json({
    ok: true,
    batch: {
      id: batch.id,
      title: batch.title,
      startDate: batch.start_date,
      endDate: batch.end_date,
      courtGroups,
    },
  });
}