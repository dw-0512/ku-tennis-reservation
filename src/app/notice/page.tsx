import MemberNotices from "@/components/MemberNotices";
import getNoticesData from "@/lib/member-pages/notices";

export const dynamic = "force-dynamic";

export default async function NoticePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const data = await getNoticesData({ searchParams });

  return <MemberNotices data={data} />;
}
