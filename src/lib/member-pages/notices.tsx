import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Notice = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_until: string | null;
  created_at: string;
  updated_at: string;
};

type NoticePageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const NOTICES_PER_PAGE = 12;

function getPageNumber(page?: string) {
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return 1;
  }

  return pageNumber;
}

async function getPinnedNotices() {
  const { data, error } = await supabaseAdmin
    .from("kutc_notices")
    .select(
      "id, title, content, is_pinned, pinned_at, pinned_until, created_at, updated_at",
    )
    .eq("is_published", true)
    .eq("is_pinned", true)
    .order("pinned_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as Notice[];
}

async function getPublishedNotices(page: number) {
  const from = (page - 1) * NOTICES_PER_PAGE;
  const to = from + NOTICES_PER_PAGE - 1;

  const { data, error, count } = await supabaseAdmin
    .from("kutc_notices")
    .select(
      "id, title, content, is_pinned, pinned_at, pinned_until, created_at, updated_at",
      {
        count: "exact",
      },
    )
    .eq("is_published", true)
    .eq("is_pinned", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return {
      notices: [],
      totalCount: 0,
      totalPages: 1,
    };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / NOTICES_PER_PAGE), 1);

  return {
    notices: (data ?? []) as Notice[],
    totalCount,
    totalPages,
  };
}

export type NoticesData = {
  currentPage: number;
  pinnedNotices: Notice[];
  notices: Notice[];
  totalCount: number;
  totalPages: number;
  hasNoNotices: boolean;
};

export default async function getNoticesData({
  searchParams,
}: NoticePageProps): Promise<NoticesData> {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentPage = getPageNumber(resolvedSearchParams.page);

  const pinnedNotices = await getPinnedNotices();

  const { notices, totalCount, totalPages } =
    await getPublishedNotices(currentPage);

  const hasNoNotices = pinnedNotices.length === 0 && totalCount === 0;

  return {
    currentPage,
    pinnedNotices,
    notices,
    totalCount,
    totalPages,
    hasNoNotices,
  };
}
