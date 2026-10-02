import MemberTabGate from "@/components/MemberTabGate";

export const dynamic = "force-dynamic";

export default async function NoticePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  return (
    <MemberTabGate
      path="/notice"
      page={query.page ?? ""}
      revision={new Date().toISOString()}
    />
  );
}
