import Link from "next/link"

type EndOfDropProps = {
  count: number
}

export function EndOfDrop({ count }: EndOfDropProps) {
  return (
    <section
      className="relative flex h-svh w-full snap-start snap-always flex-col items-start justify-end gap-8 overflow-hidden bg-background px-6 pb-12 pt-16"
      aria-label="End of today's drop"
    >
      <div
        aria-hidden
        className="absolute left-6 top-16 h-px w-12 bg-primary"
      />
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-foreground/55">
          End of today&apos;s drop
        </p>
        <h2 className="max-w-[20ch] text-balance text-4xl font-semibold leading-[1.05] tracking-tight">
          {count} reels.
          <br />
          <span className="text-foreground/55">That&apos;s the whole drop.</span>
        </h2>
      </div>

      <p className="max-w-[34ch] text-sm leading-relaxed text-foreground/65">
        Tomorrow at 06:00 a fresh ten will be ready, generated overnight from your
        sources. Until then, the feed is finite by design.
      </p>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/settings"
          className="rounded-full border border-border px-4 py-2 font-medium text-foreground/85 transition-colors hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
        >
          Tune the next drop
        </Link>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          }}
          className="rounded-full px-4 py-2 font-medium text-foreground/55 transition-colors hover:text-foreground"
        >
          Back to the top
        </button>
      </div>
    </section>
  )
}
