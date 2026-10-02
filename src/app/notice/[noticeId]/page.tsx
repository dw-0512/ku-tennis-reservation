import MemberTabGate from "@/components/MemberTabGate";

export const dynamic = "force-dynamic";

export default async function NoticePage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = await params;
  return (
    <MemberTabGate
      path={`/notice/${noticeId}`}
      revision={new Date().toISOString()}
    />
  );
}
