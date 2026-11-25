import { Suspense } from "react";
import WarRoomClientView from "./WarRoomClientView";

export default async function WarRoomPage({ params }) {
  const { warId } = await params;

  return (
    <Suspense fallback={<div className="arena-container py-16 font-mono text-xs text-[var(--color-muted)]">Loading battlefield telemetry...</div>}>
      <WarRoomClientView warId={warId} />
    </Suspense>
  );
}
