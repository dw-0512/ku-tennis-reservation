import { notFound } from "next/navigation";
import MemberNoticeDetail from "@/components/MemberNoticeDetail";
import getNoticeDetail from "@/lib/member-pages/notice-detail";
import { PUBLIC_GUIDE_NOTICE_ID } from "@/lib/notices/public-guide";

export const dynamic = "force-dynamic";

export default async function CourtGuidePage() {
  const notice = await getNoticeDetail({
    params: Promise.resolve({ noticeId: PUBLIC_GUIDE_NOTICE_ID }),
  });

  if (!notice) notFound();

  return (
    <MemberNoticeDetail
      notice={notice}
      backHref="/"
      backLabel="로그인 화면으로"
    />
  );
}