import { BottomNav, SideRail } from "@/components/BottomNav";
import { TimeZoneSync } from "@/components/TimeZoneSync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <TimeZoneSync />
      <SideRail />
      <main className="mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col gap-5 px-4 pt-[max(1.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-32 lg:max-w-[1320px] lg:px-8 lg:pt-7 lg:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
