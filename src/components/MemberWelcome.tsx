import MemberHeader from "./MemberHeader";
import MemberLogin from "./MemberLogin";
import NoticePreviewBlock from "./NoticePreviewBlock";
import NoticePinExpiry from "./NoticePinExpiry";
import type { NoticePreview } from "@/lib/notices/previews";
import { nextPinExpiry } from "@/lib/notices/title";

export default function MemberWelcome({
  noticePreviews,
}: {
  noticePreviews: NoticePreview[];
}) {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <MemberHeader />

      <NoticePreviewBlock notices={noticePreviews} />
      <MemberLogin />
      <NoticePinExpiry expiresAt={nextPinExpiry(noticePreviews)} />
    </main>
  );
}
