import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NoticeDetailPageProps = {
  params: Promise<{
    noticeId: string;
  }>;
};

export type NoticeDetail = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_until: string | null;
  created_at: string;
  updated_at: string;
};

export default async function getNoticeDetail({
  params,
}: NoticeDetailPageProps): Promise<NoticeDetail | null> {
  const { noticeId } = await params;

  const { data, error } = await supabaseAdmin
    .from("kutc_notices")
    .select(
      "id, title, content, is_pinned, pinned_at, pinned_until, created_at, updated_at",
    )
    .eq("id", noticeId)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as NoticeDetail) : null;
}
