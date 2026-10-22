import MemberTabGate from "./MemberTabGate";
import getNoticePreviews from "@/lib/notices/previews";

export default async function ServerMemberTabGate({
  path,
  page,
  revision,
}: {
  path: string;
  page?: string;
  revision: string;
}) {
  const noticePreviews = await getNoticePreviews();

  return (
    <MemberTabGate
      path={path}
      page={page}
      revision={revision}
      noticePreviews={noticePreviews}
    />
  );
}
