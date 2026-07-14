import { InboxDashboard } from "@/components/InboxDashboard";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><span className="text-lg font-semibold">Loading dashboard...</span></div>}>
      <InboxDashboard />
    </Suspense>
  );
}
