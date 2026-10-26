import { BottomNav } from "@/components/BottomNav";
import { TimeZoneSync } from "@/components/TimeZoneSync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TimeZoneSync />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 pt-8 pb-32">{children}</main>
      <BottomNav />
    </>
  );
}
