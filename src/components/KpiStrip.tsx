type Props = {
  total: number;
  subline: string;
  loading?: boolean;
};

export function KpiStrip({ total, subline, loading }: Props) {
  return (
    <section className="glass relative w-full overflow-hidden rounded-2xl">
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
              Event count
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              {loading ? (
                <div className="h-10 w-40 rounded-xl bg-gray-100" aria-hidden />
              ) : (
                <p className="text-[40px] font-bold leading-none tracking-tight text-gray-900 sm:text-[44px]">
                  {total.toLocaleString()}
                </p>
              )}
              <span className="rounded-full bg-[#22C55E]/12 px-3 py-1 text-xs font-semibold text-[#166534]">
                LIVE
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{loading ? "Loading activity…" : subline}</p>
          </div>

          <div className="hidden sm:block">
            <div className="rounded-2xl border border-white/55 bg-white/55 px-4 py-3 shadow-sm backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                Last 1 hour activity
              </p>
              {loading ? (
                <div className="mt-2 h-4 w-40 rounded bg-gray-100" aria-hidden />
              ) : (
                <p className="mt-2 font-mono text-sm text-gray-700">{subline}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
