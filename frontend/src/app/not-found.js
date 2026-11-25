import Link from "next/link";

export default function NotFound() {
  return (
    <div className="arena-container py-24 flex flex-col items-center justify-center text-center space-y-8 min-h-[60vh]">
      {/* Glitchy 404 */}
      <div className="relative">
        <span
          className="text-[8rem] sm:text-[10rem] font-display font-extrabold leading-none select-none"
          style={{ color: "var(--color-paper-3)", WebkitTextStroke: "2px var(--color-accent)" }}
          aria-hidden="true"
        >
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-display text-[var(--color-ink)] uppercase">
          Base Not Found
        </h1>
        <p className="text-sm font-body text-[var(--color-muted)] max-w-sm">
          The enemy base you scouted does not exist. It may have been destroyed or relocated to another sector.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/" className="btn-primary !px-8">
          Return to Base Camp
        </Link>
        <Link href="/wars/demo_war" className="btn-secondary !px-8">
          Watch a War
        </Link>
      </div>
    </div>
  );
}

