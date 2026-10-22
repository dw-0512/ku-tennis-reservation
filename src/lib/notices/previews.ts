import { supabaseAdmin } from "@/lib/supabase/server";

export type NoticePreview = {
  id: string;
  title: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_until: string | null;
  created_at: string;
};

export default async function getNoticePreviews(): Promise<NoticePreview[]> {
  const { data, error } = await supabaseAdmin
    .from("kutc_notices")
    .select("id, title, is_pinned, pinned_at, pinned_until, created_at")
    .eq("is_published", true)
    .order("is_pinned", { ascending: false })
    .order("pinned_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NoticePreview[];
}
