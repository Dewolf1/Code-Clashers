import { Suspense } from "react";
import ProblemClientView from "./ProblemClientView";

export default async function ProblemDetailPage({ params }) {
  const { problemId } = await params;

  return (
    <div className="arena-container py-8">
      <Suspense fallback={<div className="font-mono text-xs text-[var(--color-muted)]">Loading combat challenge...</div>}>
        <ProblemClientView problemId={problemId} />
      </Suspense>
    </div>
  );
}
