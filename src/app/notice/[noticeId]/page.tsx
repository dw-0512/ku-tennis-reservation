import { notFound } from "next/navigation";
import MemberNoticeDetail from "@/components/MemberNoticeDetail";
import getNoticeDetail from "@/lib/member-pages/notice-detail";

export const dynamic = "force-dynamic";

export default async function NoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const notice = await getNoticeDetail({ params });

  if (!notice) notFound();

  return <MemberNoticeDetail notice={notice} />;
}
