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
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
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
}: {
  severity: "critical" | "warning" | "info";
}) {
  const cfg: Record<
    "critical" | "warning" | "info",
    { label: string; dot: string; pill: string; text: string }
  > = {
    info: {
      label: "Info",
      dot: "bg-blue-500",
      pill: "bg-blue-50 border-blue-200/60",
      text: "text-blue-700",
    },
    warning: {
      label: "Warning",
      dot: "bg-amber-500 animate-severity-warning",
      pill: "bg-amber-50 border-amber-200/70",
      text: "text-amber-800",
    },
    critical: {
      label: "Error",
      dot: "bg-red-500 animate-severity-critical",
      pill: "bg-red-50 border-red-200/70",
      text: "text-red-700",
    },
  };
  const c = cfg[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${c.pill} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden />
      {c.label}
    </span>
  );
}

function EnvBadge({ role }: { role: DisplayRole }) {
  const styles: Record<DisplayRole, string> = {
    dev: "border border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
    stage: "border border-[#ddd6fe] bg-[#f5f3ff] text-[#6d28d9]",
    prod: "border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c]",
  };
  const label = role === "dev" ? "DEV" : role === "stage" ? "STAGE" : "PROD";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${styles[role]}`}
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
    <section className="glass w-full overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-base font-semibold tracking-tight text-gray-900">
            Events
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs tabular-nums text-gray-600">
            {visibleEvents.length}
            {allEventsCount !== visibleEvents.length
              ? ` / ${allEventsCount.toLocaleString()}`
              : ""}
          </span>
        </div>
        <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) =>
                onSeverityFilter(e.target.value as SeverityFilter)
              }
              className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm outline-none transition duration-150 ease-in-out focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Error</option>
            </select>
          </div>

          <label className="relative block w-full min-w-0 lg:max-w-md">
            <span className="sr-only">Search events ({scopeLabel})</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Message, route, URL, stack, user agent, JSON…"
              autoComplete="off"
              spellCheck={false}
              className="h-11 w-full rounded-xl border border-white/55 bg-white/45 py-2.5 pl-11 pr-3 text-sm text-gray-900 outline-none shadow-sm transition duration-200 ease-in-out placeholder:text-gray-400 focus:border-[#4F46E5]/45 focus:bg-white/70 focus:ring-2 focus:ring-[#4F46E5]/20 backdrop-blur-xl"
            />
          </label>
        </div>
      </div>

      <div>
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: "55%" }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr>
              {["Issue", "Last Seen", "Events", "User Count", "Actions"].map(
                (label, i) => (
                  <th
                    key={i}
                    scope="col"
                    className={`border-b border-gray-200/70 bg-white/35 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 whitespace-nowrap backdrop-blur-xl ${i === 0 ? "pl-4" : ""} ${i === 2 ? "text-center" : "text-left"}`}
                  >
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="[&_td]:border-b [&_td]:border-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className={i % 2 ? "bg-white/35" : "bg-white/15"}>
                  <td className="px-4 py-3">
                    <div
                      className="h-4 w-3/4 rounded bg-gray-100 mb-2"
                      aria-hidden
                    />
                    <div className="flex gap-2">
                      <div
                        className="h-4 w-10 rounded bg-gray-100"
                        aria-hidden
                      />
                      <div
                        className="h-4 w-14 rounded bg-gray-100"
                        aria-hidden
                      />
                      <div
                        className="h-4 w-32 rounded bg-gray-100"
                        aria-hidden
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-14 rounded bg-gray-100" aria-hidden />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-4 w-8 rounded bg-gray-100" aria-hidden />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <div
                        className="h-6 w-6 rounded bg-gray-100"
                        aria-hidden
                      />
                      <div
                        className="h-6 w-6 rounded bg-gray-100"
                        aria-hidden
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : visibleEvents.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-14 text-center text-sm text-gray-600"
                >
                  {hasActiveQuery
                    ? "No events match the current environment filter or search."
                    : "No events match this filter."}
                </td>
              </tr>
            ) : (
              visibleEvents.map((ev) => {
                const where = whereFrom(ev);
                const severity = deriveSeverity(ev);
                // When user selects Dev/Stage/Prod tab, force the environment tag to match the tab.
                // This avoids relying on older log records that might be missing `extra.environment`.
                const env =
                  roleFilter === "all" ? getDisplayRole(ev) : roleFilter;
                const lastSeenLabel = (() => {
                  const t = Date.parse(ev.createdAt);
                  if (!Number.isFinite(t)) return "—";
                  const diffMs = Date.now() - t;
                  const sec = Math.floor(diffMs / 1000);
                  const min = Math.floor(sec / 60);
                  const hr = Math.floor(min / 60);
                  const day = Math.floor(hr / 24);
                  if (day > 0) return day === 1 ? "1d ago" : `${day}d ago`;
                  if (hr > 0) return hr === 1 ? "1h ago" : `${hr}h ago`;
                  if (min > 0) return min === 1 ? "1m ago" : `${min}m ago`;
                  return "Now";
                })();
                const expanded = expandedId === ev._id;
                const occ =
                  typeof ev.occurrences === "number" && ev.occurrences > 0
                    ? ev.occurrences
                    : 1;
                return (
                  <Fragment key={ev._id}>
                    <tr
                      className={`group cursor-pointer transition duration-150 ease-in-out hover:bg-white/55 ${
                        expanded ? "bg-white/55" : ""
                      }`}
                      onClick={() =>
                        setExpandedId((cur) => (cur === ev._id ? null : ev._id))
                      }
                    >
                      {/* ---- Issue (merged column) ---- */}
                      <td className="min-w-0 px-4 py-2.5 align-top">
                        <p
                          className="truncate text-[13px] font-medium text-gray-900"
                          title={ev.message}
                        >
                          {ev.message.length > 80
                            ? ev.message.slice(0, 80) + "…"
                            : ev.message}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {ev.service && (
                            <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600">
                              {ev.service}
                            </span>
                          )}
                          <EnvBadge role={env} />
                          <SeverityBadge severity={severity} />
                          <span
                            className="truncate font-mono text-[10px] text-gray-500"
                            title={where}
                          >
                            {where.length > 40
                              ? where.slice(0, 40) + "…"
                              : where}
                          </span>
                        </div>
                      </td>

                      {/* ---- Last Seen ---- */}
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle font-mono text-[11px] text-gray-600">
                        {lastSeenLabel}
                      </td>

                      {/* ---- Events (occ count) ---- */}
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-center font-mono text-xs font-semibold text-gray-700">
                        {occ.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-center font-mono text-xs font-semibold text-gray-700">
                        {ev.affectedIpCount || "-"}
                      </td>

                      {/* ---- Actions ---- */}
                      <td className="whitespace-nowrap px-2 py-2.5 align-middle">
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onDetail(ev)}
                            className="rounded bg-[#4F46E5] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#4338CA]"
                            title="View details"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(ev._id)}
                            className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-500 transition hover:bg-red-500 hover:text-white"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr id={`row-${ev._id}`} className="bg-white/30">
                        <td colSpan={4} className="px-4 pb-5 pt-2">
                          <div className="grid gap-4 rounded-2xl border border-white/55 bg-white/55 p-4 shadow-sm backdrop-blur-xl sm:grid-cols-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Context
                              </p>
                              <dl className="mt-2 space-y-1.5 text-sm text-gray-800">
                                <div className="flex gap-2">
                                  <dt className="w-20 shrink-0 text-gray-500 text-xs">
                                    Route/URL
                                  </dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-gray-800">
                                    {ev.data?.route ?? ev.url ?? "—"}
                                  </dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="w-20 shrink-0 text-gray-500 text-xs">
                                    Source
                                  </dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-gray-800">
                                    {ev.data?.source || "—"}
                                  </dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="w-20 shrink-0 text-gray-500 text-xs">
                                    User agent
                                  </dt>
                                  <dd className="min-w-0 break-words font-mono text-[11px] text-gray-800">
                                    {ev.data?.user_agent ?? "—"}
                                  </dd>
                                </div>
                              </dl>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                Stack / Extra
                              </p>
                              <pre className="mt-2 max-h-40 overflow-auto rounded-xl border border-white/55 bg-white/50 p-3 font-mono text-[11px] leading-relaxed text-gray-800 backdrop-blur-xl">
                                {ev.stack
                                  ? ev.stack
                                  : ev.data?.extra
                                    ? JSON.stringify(ev.data?.extra, null, 2)
                                    : "—"}
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

        <div className="flex items-center justify-center gap-2 flex-wrap m-10">
          {/* Previous */}
          <button
            onClick={() => changePage(paginationData.currentPage - 1)}
            disabled={paginationData.currentPage === 1}
            className="px-4 h-10 rounded-lg border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ← Prev
          </button>

          {getPagination().map((item, index) =>
            item === "..." ? (
              <span
                key={`dots-${index}`}
                className="px-2 text-gray-500 font-semibold"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                onClick={() => changePage(item as number)}
                className={`w-10 h-10 rounded-lg font-medium transition-all duration-200
          ${
            paginationData.currentPage === item
              ? "bg-blue-600 text-white shadow-lg scale-105"
              : "bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50"
          }`}
              >
                {item}
              </button>
            ),
          )}

          {/* Next */}
          <button
            onClick={() => changePage(paginationData.currentPage + 1)}
            disabled={paginationData.currentPage === totalPages}
            className="px-4 h-10 rounded-lg border border-gray-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
