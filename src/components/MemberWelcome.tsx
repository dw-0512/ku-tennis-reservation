import MemberHeader from "./MemberHeader";
import MemberLogin from "./MemberLogin";
import LoginGuideNotice from "./LoginGuideNotice";

export default function MemberWelcome() {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <MemberHeader />

      <LoginGuideNotice />
      <MemberLogin />
    </main>
  );
}