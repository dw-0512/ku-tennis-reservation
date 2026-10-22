import MemberTabGate from "@/components/ServerMemberTabGate";

export const dynamic = "force-dynamic";

export default function MemberPage() {
  return <MemberTabGate path="/" revision={new Date().toISOString()} />;
}
