"use client";

import { Fragment, useMemo, useState } from "react";

import {
  deriveSeverity,
  getDisplayRole,
  type DisplayRole,
} from "@/lib/inboxUi";
import type { InboxEvent, PaginationData } from "@/types/inbox";

type SeverityFilter = "all" | "info" | "warning" | "critical";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function SeverityBadge({
  severity,
}: { severity: "critical" | "warning" | "info" }) {
  const cfg: Record<
    "critical" | "warning" | "info",
    { label: string; dot: string; pill: string; text: string }
  > = {
    info: {
      label: "Info",
      dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-severity-info",
      pill: "bg-blue-50/70 border-blue-200/50 hover:bg-blue-100/50",
      text: "text-blue-700",
    },
    warning: {
      label: "Warning",
      dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-severity-warning",
      pill: "bg-amber-50/70 border-amber-200/50 hover:bg-amber-100/50",
      text: "text-amber-700",
    },
    critical: {
      label: "Critical",
      dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-severity-critical",
      pill: "bg-rose-50/70 border-rose-200/50 hover:bg-rose-100/50",
      text: "text-rose-700",
    },
  };
  const c = cfg[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide transition-colors duration-150 ${c.pill} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {c.label}
    </span>
  );
}

function EnvBadge({ role }: { role: DisplayRole }) {
  const styles: Record<DisplayRole, string> = {
    dev: "border-amber-200/60 bg-amber-50/60 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
    stage: "border-purple-200/60 bg-purple-50/60 text-purple-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
    prod: "border-rose-200/60 bg-rose-50/60 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  };
  const label = role === "dev" ? "DEV" : role === "stage" ? "STAGE" : "PROD";
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${styles[role]}`}
    >
      {label}
    </span>
  );
}

type Props = {
  events: InboxEvent[];
  allEventsCount: number;
  /** True when environment filter is not "all" or a search query is active (server-scoped). */
  hasActiveQuery: boolean;
  onDetail: (ev: InboxEvent) => void;
  onDelete: (id: string) => void;
  whereFrom: (ev: InboxEvent) => string;
  roleFilter: "all" | DisplayRole;
  searchValue: string;
  onSearchChange: (v: string) => void;
  severityFilter: SeverityFilter;
  onSeverityFilter: (v: SeverityFilter) => void;
  loading?: boolean;
  paginationData: PaginationData;
  setPaginationData: React.Dispatch<React.SetStateAction<PaginationData>>;
};

export function EventsTable({
  events,
  allEventsCount,
  hasActiveQuery,
  onDetail,
  onDelete,
  whereFrom,
  roleFilter,
  searchValue,
  onSearchChange,
  severityFilter,
  onSeverityFilter,
  loading,
  paginationData,
  setPaginationData,
}: Props) {
  const scopeLabel = roleFilter === "all" ? "all environments" : roleFilter;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleEvents = useMemo(() => {
    if (severityFilter === "all") return events;
    return events.filter((e) => deriveSeverity(e) === severityFilter);
  }, [events, severityFilter]);

  const totalPages = Math.ceil(allEventsCount / paginationData.dataPerPage);

  const getPagination = () => {
    const current = paginationData.currentPage;
    const delta = 1;
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= current - delta && i <= current + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  const changePage = (page: number) => {
    setPaginationData((prev) => ({
      ...prev,
      currentPage: page,
      offSet: (page - 1) * prev.dataPerPage,
    }));
  };

  return (
    <section className="glass w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60 shadow-lg backdrop-blur-xl animate-in fade-in duration-300">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200/50 bg-white/40 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold tracking-tight text-slate-800">Recent Events</h2>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-slate-600">
            {visibleEvents.length}
            {allEventsCount !== visibleEvents.length ? ` / ${allEventsCount.toLocaleString()}` : ""}
          </span>
        </div>
        <div className="flex w-full flex-col gap-4 lg:max-w-3xl lg:flex-row lg:items-center lg:justify-end">
          {/* Severity Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Severity</span>
            <select
              value={severityFilter}
              onChange={(e) => onSeverityFilter(e.target.value as SeverityFilter)}
              className="h-9 rounded-xl border border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition duration-150 ease-in-out hover:border-slate-300 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/15"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical / Error</option>
            </select>
          </div>

          {/* Search Input */}
          <label className="relative block w-full min-w-0 lg:max-w-md">
            <span className="sr-only">Search events ({scopeLabel})</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by message, route, service, stack..."
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/70 py-2 pl-10 pr-12 text-sm text-slate-800 outline-none shadow-sm transition duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#4F46E5] focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/15"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400 shadow-sm select-none">
              /
            </div>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50/50">
              {[{ label: "Issue Details", align: "text-left pl-6" }, { label: "Last Seen", align: "text-left" }, { label: "Events", align: "text-center" }, { label: "Frequency", align: "text-center" }, { label: "Users Affected", align: "text-center" }, { label: "Actions", align: "text-right pr-6" }].map((th, i) => (
                <th
                  key={i}
                  scope="col"
                  className={`border-b border-slate-200/60 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap backdrop-blur-xl ${th.align}`}
                >
                  {th.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 bg-white/10 [&_td]:py-3.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className={i % 2 ? "bg-white/20" : "bg-white/5"}>
                  <td className="pl-6 pr-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 mb-2" />
                    <div className="flex gap-2">
                      <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-14 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                  </td>
                  <td className="px-3"><div className="h-4 w-16 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-3"><div className="mx-auto h-4 w-8 animate-pulse rounded bg-slate-100" /></td>
                  <td className="px-3"><div className="mx-auto h-4 w-8 animate-pulse rounded bg-slate-100" /></td>
                  <td className="pl-3 pr-6 text-right"><div className="ml-auto h-7 w-20 animate-pulse rounded-lg bg-slate-100" /></td>
                </tr>
              ))
            ) : visibleEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-500 text-sm font-medium">
                  {hasActiveQuery ? "No events found matching the environment filter or search query." : "No events recorded in this database."}
                </td>
              </tr>
            ) : (
              visibleEvents.map((ev) => {
                const where = whereFrom(ev);
                const severity = deriveSeverity(ev);
                const env = roleFilter === "all" ? getDisplayRole(ev) : roleFilter;
                const rawMessage = ev.message || "";
                let errorName = ev.data?.errorName || "";
                let displayMsg = rawMessage;
                if (!errorName) {
                  const regexMatch = rawMessage.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*(?:Error|Exception|Crash|Warning)):\s*(.*)$/);
                  if (regexMatch) {
                    errorName = regexMatch[1];
                    displayMsg = regexMatch[2];
                  }
                } else if (rawMessage.startsWith(errorName)) {
                  displayMsg = rawMessage.slice(errorName.length).replace(/^:\s*/, "");
                }
                const lastSeenLabel = (() => {
                  const t = Date.parse(ev.createdAt);
                  if (!Number.isFinite(t)) return "—";
                  const diffMs = Date.now() - t;
                  const sec = Math.floor(diffMs / 1000);
                  const min = Math.floor(sec / 60);
                  const hr = Math.floor(min / 60);
                  const day = Math.floor(hr / 24);
                  if (day > 0) return day === 1 ? "1 day ago" : `${day} days ago`;
                  if (hr > 0) return hr === 1 ? "1 hr ago" : `${hr} hrs ago`;
                  if (min > 0) return min === 1 ? "1 min ago" : `${min} mins ago`;
                  return "Just now";
                })();
                const expanded = expandedId === ev._id;
                const occurrencesCount = typeof ev.occurrences === "number" && ev.occurrences > 0 ? ev.occurrences : 1;
                const affectedUsers = typeof ev.affectedIpCount === "number" ? ev.affectedIpCount : 0;
                return (
                  <Fragment key={ev._id}>
                    <tr
                      className={`group cursor-pointer transition-all duration-150 hover:bg-slate-50/70 ${expanded ? "bg-slate-50/50" : ""}`}
                      onClick={() => setExpandedId((cur) => (cur === ev._id ? null : ev._id))}
                    >
                      {/* Issue Details */}
                      <td className="min-w-0 pl-6 pr-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-start gap-2 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-[#4F46E5] transition-colors leading-snug whitespace-nowrap truncate w-full" title={rawMessage}>
                              {displayMsg}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {ev.service && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#4F46E5]/6 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#4F46E5]">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <rect x="2" y="2" width="20" height="8" rx="2" />
                                  <rect x="2" y="14" width="20" height="8" rx="2" />
                                </svg>
                                {ev.service}
                              </span>
                            )}
                            <EnvBadge role={env} />
                            <SeverityBadge severity={severity} />
                            <span className="max-w-[200px] sm:max-w-[300px] truncate font-mono text-[10px] text-slate-400" title={where}>
                              {where}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="whitespace-nowrap pr-3 align-middle font-medium text-xs text-slate-500">{lastSeenLabel}</td>

                      {/* Events */}
                      <td className="whitespace-nowrap px-3 align-middle text-center">
                        <span className="inline-block rounded-md bg-slate-50 border border-slate-200/50 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 tabular-nums shadow-sm min-w-[36px]">{occurrencesCount.toLocaleString()}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 align-middle text-center text-xs text-slate-500">
                        <span className="inline-block rounded-md bg-slate-50 border border-slate-200/50 px-2.5 py-1 font-mono text-xs font-bold text-slate-700 tabular-nums shadow-sm">
                          {ev?.occurrenceDetails?.frequencyPerDay?.toFixed(2) ?? "—"}/d · {ev.occurrenceDetails?.frequencyPerHour?.toFixed(2) ?? "—"}/h
                        </span>
                      </td>

                      {/* Users Affected */}
                      <td className="whitespace-nowrap px-3 align-middle text-center">
                        {affectedUsers > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/50 border border-indigo-100/50 px-2 py-1 font-mono text-xs font-semibold text-indigo-700 tabular-nums">
                            <svg className="shrink-0" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {affectedUsers.toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap pl-3 pr-6 align-middle text-right">
                        <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onDetail(ev)}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#4F46E5] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4338CA] hover:scale-[1.02] active:scale-[0.98]"
                            title="View details"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(ev._id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                            title="Delete error group"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expandable Details */}
                    {expanded && (
                      <tr id={`row-${ev._id}`} className="bg-slate-50/25">
                        <td colSpan={6} className="px-6 pb-4 pt-2">
                          <div className="grid gap-4 rounded-xl border border-slate-200/50 bg-white p-4 shadow-sm sm:grid-cols-2">
                            <div className="min-w-0">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Context details</h4>
                              <dl className="mt-2.5 space-y-2 text-xs text-slate-700">
                                <div className="flex items-start gap-3">
                                  <dt className="w-20 shrink-0 font-semibold text-slate-400 text-[10px] uppercase mt-0.5">Path / Url</dt>
                                  <dd className="min-w-0 break-all font-mono text-[11px] text-slate-800 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{ev.data?.route ?? ev.url ?? "—"}</dd>
                                </div>
                                <div className="flex items-start gap-3">
                                  <dt className="w-20 shrink-0 font-semibold text-slate-400 text-[10px] uppercase mt-0.5">Source</dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-slate-800">{ev.data?.source || "—"}</dd>
                                </div>
                                <div className="flex items-start gap-3">
                                  <dt className="w-20 shrink-0 font-semibold text-slate-400 text-[10px] uppercase mt-0.5">IP Address</dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-slate-800">{ev.data?.ip ?? "—"}</dd>
                                </div>
                                <div className="flex items-start gap-3">
                                  <dt className="w-20 shrink-0 font-semibold text-slate-400 text-[10px] uppercase mt-0.5">User Agent</dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-slate-500 leading-normal">{ev.data?.user_agent ?? "—"}</dd>
                                </div>
                                <div className="flex items-start gap-3">
                                  <dt className="w-20 shrink-0 font-semibold text-slate-400 text-[10px] uppercase mt-0.5">Frequency</dt>
                                   <dd className="min-w-0 font-mono text-[11px] text-slate-800">{ev.occurrenceDetails?.frequencyPerDay?.toFixed(2) ?? "—"} per day • {ev.occurrenceDetails?.frequencyPerHour?.toFixed(2) ?? "—"} per hour</dd>
                                </div>
                              </dl>
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stack Trace snippet</h4>
                                <span className="text-[9px] font-medium text-slate-400">Click “Details” for full trace</span>
                              </div>
                              <pre className="mt-2.5 flex-1 overflow-auto rounded-xl border border-slate-200/60 bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-300 max-h-36 shadow-inner">
                                {ev.stack ? ev.stack : ev.data?.extra ? JSON.stringify(ev.data?.extra, null, 2) : "No stack trace available for this log."}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/50 bg-slate-50/30 px-6 py-4">
          <p className="text-xs text-slate-500 font-medium">
            Showing page <span className="font-semibold text-slate-700">{paginationData.currentPage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span> ({allEventsCount.toLocaleString()} events total)
          </p>
          <div className="flex items-center gap-1.5">
            {/* Prev Button */}
            <button
              onClick={() => changePage(paginationData.currentPage - 1)}
              disabled={paginationData.currentPage === 1}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition shadow-sm hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Prev
            </button>
            {getPagination().map((item, index) =>
              item === "..." ? (
                <span key={`dots-${index}`} className="px-2 text-slate-400 font-bold text-xs select-none">...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => changePage(item as number)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm ${paginationData.currentPage === item ? "bg-[#4F46E5] text-white ring-2 ring-[#4F46E5]/15" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  {item}
                </button>
              )
            )}
            {/* Next Button */}
            <button
              onClick={() => changePage(paginationData.currentPage + 1)}
              disabled={paginationData.currentPage === totalPages}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition shadow-sm hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
