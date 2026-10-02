import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DbSegment = {
  id: string;
  start_time: string;
  end_time: string;
  court_count: number;
};

type DbCourtGroup = {
  id: string;
  day_name: string;
  court_name: string;
  display_order: number;
  is_archived: boolean;
  court_segments: DbSegment[];
};

type DbReservationBatch = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  open_at: string;
  close_at: string;
  display_until: string;
  court_groups: DbCourtGroup[];
};

type DbReservation = {
  id: string;
  batch_id: string;
  group_id: string;
  segment_id: string;
  slot_start_time: string;
  slot_end_time: string;
  court_number: number;
  reserver_name: string;
};

type NoticePreview = {
  id: string;
  title: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_until: string | null;
  created_at: string;
};

async function getVisibleBatches() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select(
      `
      id,
      title,
      start_date,
      end_date,
      open_at,
      close_at,
      display_until,
      court_groups (
        id,
        day_name,
        court_name,
        display_order,
        is_archived,
        court_segments (
          id,
          start_time,
          end_time,
          court_count
        )
      )
    `,
    )
    .lte("open_at", new Date(Date.parse(now) + 172800000).toISOString())
    .gte("display_until", now)
    .order("start_date", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as DbReservationBatch[];
}

async function getNextOpenAt() {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("reservation_batches")
    .select("open_at")
    .gt("open_at", now)
    .gte("display_until", now)
    .order("open_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.open_at ?? null;
}

async function getNoticePreviews() {
  const { data, error } = await supabaseAdmin
    .from("kutc_notices")
    .select("id, title, is_pinned, pinned_at, pinned_until, created_at")
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("pinned_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    return [];
  }

  return (data ?? []) as NoticePreview[];
}

async function getActiveReservations(batchIds: string[]) {
  if (batchIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      batch_id,
      group_id,
      segment_id,
      slot_start_time,
      slot_end_time,
      court_number,
      reserver_name
    `,
    )
    .in("batch_id", batchIds)
    .is("cancelled_at", null);

  if (error) {
    return [];
  }

  return (data ?? []) as DbReservation[];
}

export type HomeData = {
  batches: DbReservationBatch[];
  nextOpenAt: string | null;
  noticePreviews: NoticePreview[];
  activeReservations: DbReservation[];
  serverNow: string;
};

export default async function getHomeData(): Promise<HomeData> {
  const [batches, nextOpenAt, noticePreviews] = await Promise.all([
    getVisibleBatches(),
    getNextOpenAt(),
    getNoticePreviews(),
  ]);

  const serverNow = new Date().toISOString();

  const batchIds = batches.map((batch) => batch.id);
  const activeReservations = await getActiveReservations(batchIds);

  return { batches, nextOpenAt, noticePreviews, activeReservations, serverNow };
}
