import MemberHeader from "./MemberHeader";
import MemberLogin from "./MemberLogin";

export default function MemberWelcome() {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <MemberHeader />

      <MemberLogin />
    </main>
  );
}
