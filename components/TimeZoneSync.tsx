"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TZ_COOKIE } from "@/lib/dates";

// Tells the server the phone's timezone, so "today" means today in India and
// not today on a Vercel server in the US. Refreshes once if it changed.
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie.match(new RegExp(`(?:^|; )${TZ_COOKIE}=([^;]*)`))?.[1];
    if (decodeURIComponent(current ?? "") !== tz) {
      document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [router]);

  return null;
}
