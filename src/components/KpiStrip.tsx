type Props = {
  total: number;
  criticalCount: number;
  affectedUsersCount: number;
  servicesCount: number;
  loading?: boolean;
  subline?: string;
};

export function KpiStrip({
  total,
  criticalCount,
  affectedUsersCount,
  servicesCount,
  loading,
  subline,
}: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {/* Card 1: Total Events */}
      <div className="glass relative overflow-hidden rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Event Logs
          </p>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {total.toLocaleString()}
              </span>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide border border-emerald-100 dark:border-emerald-900/60">
                Live
              </span>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {subline || "All tracked event records"}
          </p>
        </div>
      </div>

      {/* Card 2: Critical Issues */}
      <div className="glass relative overflow-hidden rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Critical Events
          </p>
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/60 p-2 text-rose-600 dark:text-rose-400 animate-severity-critical">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {criticalCount.toLocaleString()}
              </span>
              {criticalCount > 0 && (
                <span className="rounded-full bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60">
                  Action required
                </span>
              )}
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {criticalCount > 0 ? "Crash & Out-of-memory logs" : "System running stable"}
          </p>
        </div>
      </div>

      {/* Card 3: Users Impacted */}
      <div className="glass relative overflow-hidden rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Impacted Clients
          </p>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-600 dark:text-amber-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {affectedUsersCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">unique IPs</span>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {affectedUsersCount > 0 ? "Users affected by errors" : "No client impact"}
          </p>
        </div>
      </div>

      {/* Card 4: Services Online */}
      <div className="glass relative overflow-hidden rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/40 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Reporting Services
          </p>
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/60 p-2 text-purple-600 dark:text-purple-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="8" rx="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {servicesCount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">active microservices</span>
            </div>
          )}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {servicesCount > 0 ? "Reporting telemetry data" : "No services configured"}
          </p>
        </div>
      </div>
    </section>
  );
}
