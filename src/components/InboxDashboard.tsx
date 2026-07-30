"use client";

import { getApiBaseForRole, getDashboardApiKey } from "@/lib/api";
import { deriveSeverity, type DisplayRole } from "@/lib/inboxUi";
import { ErrorType, PaginationData, type InboxEvent } from "@/types/inbox";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EventDetailModal } from "./EventDetailModal";
import { EventsTable } from "./EventsTable";
import { HeaderBar } from "./HeaderBar";
import { KpiStrip } from "./KpiStrip";

type SeverityFilter = "all" | "info" | "warning" | "critical";
function whereFrom(ev: InboxEvent) {
  if (ev.data?.route) return `route: ${ev.data.route}`;

  if (ev.stack) {
    const lines = ev.stack.split("\n");
    // Look for first app frame
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("at ")) continue;

      const parenMatch = trimmed.match(/^at\s+(?:async\s+)?([^\s(]+)\s+\((.+):(\d+):(\d+)\)$/);
      if (parenMatch) {
        const [, , filePath, lineNo] = parenMatch;
        const isApp = !(
          filePath.includes("node_modules") ||
          filePath.includes("node:") ||
          filePath.includes("next/dist") ||
          filePath.includes("webpack:") ||
          filePath.includes("<anonymous>")
        );
        if (isApp) {
          const fileName = filePath.split(/[/\\]/).pop();
          return `${fileName}:${lineNo}`;
        }
      }

      const noParenMatch = trimmed.match(/^at\s+(?:async\s+)?(.+):(\d+):(\d+)$/);
      if (noParenMatch) {
        const [, filePath, lineNo] = noParenMatch;
        const isApp = !(
          filePath.includes("node_modules") ||
          filePath.includes("node:") ||
          filePath.includes("next/dist") ||
          filePath.includes("webpack:") ||
          filePath.includes("<anonymous>")
        );
        if (isApp) {
          const fileName = filePath.split(/[/\\]/).pop();
          return `${fileName}:${lineNo}`;
        }
      }
    }

    // If no app frame, fallback to first frame overall
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("at ")) continue;

      const parenMatch = trimmed.match(/^at\s+(?:async\s+)?([^\s(]+)\s+\((.+):(\d+):(\d+)\)$/);
      if (parenMatch) {
        const [, , filePath, lineNo] = parenMatch;
        const fileName = filePath.split(/[/\\]/).pop();
        return `${fileName}:${lineNo}`;
      }

      const noParenMatch = trimmed.match(/^at\s+(?:async\s+)?(.+):(\d+):(\d+)$/);
      if (noParenMatch) {
        const [, filePath, lineNo] = noParenMatch;
        const fileName = filePath.split(/[/\\]/).pop();
        return `${fileName}:${lineNo}`;
      }
    }
  }

  if (ev.url) return `url: ${ev.url}`;
  return "—";
}

function msFromCreated(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function InboxDashboard() {
  const [events, setEvents] = useState<InboxEvent[]>([]);
  const [status, setStatus] = useState("Loading…");
  const [statusError, setStatusError] = useState(false);
  const [view, setView] = useState<
    "loading" | "table" | "empty" | "error" | "config"
  >("loading");
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState<InboxEvent | null>(null);
  const initialEnv = (searchParams?.get("env") as "dev" | DisplayRole) ?? "dev";
  const initialError =
    (searchParams?.get("type") as ErrorType) ?? ErrorType.all;
  const initialResolved =
    (searchParams?.get("resolved") as "all" | "resolved" | "unresolved") ?? "all";
  const [roleFilter, setRoleFilter] = useState<"all" | DisplayRole>(initialEnv);
  const [errorType, setErrorType] = useState<ErrorType>(initialError);
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "resolved" | "unresolved">(initialResolved);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  // Sync filter state to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (roleFilter) params.set("env", roleFilter as string);
    if (errorType) params.set("type", errorType as string);
    if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [roleFilter, errorType, resolvedFilter, router]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [matchTotal, setMatchTotal] = useState(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  const [paginationData, setPaginationData] = useState<PaginationData>({
    dataPerPage: 10,
    offSet: 0,
    currentPage: 1,
  });

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300,
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const handleInjectDemoEvents = useCallback(() => {
    const demoEvents: InboxEvent[] = [];

    setEvents(demoEvents);
    setMatchTotal(demoEvents.length);
    setStatus(`${demoEvents.length} demo events loaded`);
    setStatusError(false);
    setView("table");
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const silent = opts.silent === true;
      const base = getApiBaseForRole(roleFilter);
      if (!base) {
        setStatus(
          "Set NEXT_PUBLIC_API_URL_DEV / _STAGE / _PROD in web/.env.local (e.g. https://backend.f10.co.in/client)",
        );
        setStatusError(true);
        setView("config");
        return;
      }

      if (!silent) {
        setStatus("Loading…");
        setStatusError(false);
        setView("loading");
      } else {
        setStatusError(false);
      }
      loadAbortRef.current?.abort();
      const ac = new AbortController();
      loadAbortRef.current = ac;

      // 6-second timeout to prevent the dashboard from staying stuck in loading
      const timeoutId = setTimeout(() => {
        ac.abort();
      }, 6000);

      try {
        const headers: HeadersInit = { Accept: "application/json" };
        const apiKey = getDashboardApiKey();
        if (apiKey) headers["X-API-Key"] = apiKey;
        const qs = new URLSearchParams();
        qs.set("limit", "10");
        qs.set("offset", `${paginationData.offSet}`);

        if (debouncedSearch) {
          qs.set("q", debouncedSearch);
        }

        if (errorType !== ErrorType.all) {
          qs.set("type", errorType);
        }
        if (resolvedFilter !== "all") {
          qs.set("resolved", resolvedFilter === "resolved" ? "true" : "false");
        }
        // IMPORTANT: we do NOT send `environment` here.
        // The Dev/Stage/Prod tab selects which backend (and therefore which DB) we query.
        // Sending `environment` would apply additional server-side filtering and hide errors.
        const url = `${base.replace(/\/$/, "")}/api/events?${qs.toString()}`;
        const r = await fetch(url, {
          headers,
          signal: ac.signal,
        });
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error(await r.text());
        const data = (await r.json()) as {
          total: number;
          events: InboxEvent[];
        };
        setEvents(data.events);
        setMatchTotal(data.total);
        const noSearch = debouncedSearch.length === 0;
        const envAll = roleFilter === "all";
        const globalEmpty = data.total === 0 && noSearch && envAll;
        setStatus(
          data.total === 0 && (!noSearch || !envAll)
            ? "No matching events"
            : data.total
              ? `${data.total} event${data.total === 1 ? "" : "s"}`
              : "0 events",
        );
        setView(globalEmpty ? "empty" : "table");
      } catch (e) {
        clearTimeout(timeoutId);
        if (
          (e instanceof DOMException || e instanceof Error) &&
          (e as { name?: string }).name === "AbortError"
        ) {
          // If aborted because of timeout, show a friendly warning and don't block the UI
          setStatus(
            "Connection timed out. You can click 'Add Demo Events' above to test the UI.",
          );
          setStatusError(true);
          if (!silent) setView("empty");
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        setStatus(`Error: ${msg}`);
        setStatusError(true);
        if (!silent) setView("error");
      }
    },
    [debouncedSearch, roleFilter, errorType, resolvedFilter, paginationData],
  );

  useEffect(() => {
    load();
    return () => {
      loadAbortRef.current?.abort();
    };
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await load({ silent: true });
    } finally {
      const elapsed = Date.now() - start;
      await new Promise((r) => setTimeout(r, Math.max(0, 800 - elapsed)));
      setRefreshing(false);
    }
  }, [load]);

  const eventsInLastHour = useMemo(() => {
    const cutoff = Date.now() - 3600000;
    return events.filter((e) => msFromCreated(e.createdAt) > cutoff).length;
  }, [events]);

  const kpiSubTotal =
    eventsInLastHour > 0
      ? `${eventsInLastHour.toLocaleString()} in the last hour`
      : "None in the last hour";

  const criticalCount = useMemo(() => {
    return events.filter((e) => deriveSeverity(e) === "critical").length;
  }, [events]);

  const affectedUsersCount = useMemo(() => {
    return events.reduce(
      (sum, e) => sum + (e.affectedIpCount || (e.data?.ip ? 1 : 0)),
      0,
    );
  }, [events]);

  const servicesCount = useMemo(() => {
    const unique = new Set(events.map((e) => e.service).filter(Boolean));
    return unique.size;
  }, [events]);

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete event #${id}?`)) return;
    const base = getApiBaseForRole(roleFilter);
    if (!base) return;
    const previous = events;
    const previousTotal = matchTotal;
    setEvents((prev) => prev.filter((x) => x._id !== id));
    setMatchTotal((t) => Math.max(0, t - 1));
    const nextTotal = Math.max(0, previousTotal - 1);
    const globalEmptyAfter =
      nextTotal === 0 && debouncedSearch.length === 0 && roleFilter === "all";
    setStatus(
      nextTotal === 0 && (debouncedSearch.length > 0 || roleFilter !== "all")
        ? "No matching events"
        : nextTotal
          ? `${nextTotal} event${nextTotal === 1 ? "" : "s"}`
          : "0 events",
    );
    if (globalEmptyAfter) setView("empty");
    else setView("table");
    try {
      const headers: HeadersInit = {};
      const apiKey = getDashboardApiKey();
      if (apiKey) headers["X-API-Key"] = apiKey;
      const url = `${base.replace(/\/$/, "")}/api/events/${id}?group=true`;
      const r = await fetch(url, { method: "DELETE", headers });
      if (!r.ok) throw new Error(await r.text());
    } catch (e) {
      setEvents(previous);
      setMatchTotal(previousTotal);
      setView(
        previousTotal === 0 &&
          debouncedSearch.length === 0 &&
          roleFilter === "all"
          ? "empty"
          : "table",
      );
      setStatus(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
      setStatusError(true);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Delete all events? This cannot be undone.")) return;
    const base = getApiBaseForRole(roleFilter);
    if (!base) return;
    try {
      const headers: HeadersInit = {};
      const apiKey = getDashboardApiKey();
      if (apiKey) headers["X-API-Key"] = apiKey;
      const url = `${base.replace(/\/$/, "")}/api/events?type=${errorType}`;
      const r = await fetch(url, { method: "DELETE", headers });
      if (!r.ok) throw new Error(await r.text());
      await load({ silent: true });
    } catch (e) {
      setStatus(
        `Delete all failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      setStatusError(true);
    }
  };

  const handleResolveToggle = async (id: string, currentResolved: boolean) => {
    if (currentResolved) {
      // Show warning that can't undo
      alert('This event is already resolved and cannot be undone.');
      return;
    }
    const base = getApiBaseForRole(roleFilter);
    if (!base) return;
    try {
      const headers: HeadersInit = {};
      const apiKey = getDashboardApiKey();
      if (apiKey) headers['X-API-Key'] = apiKey;
      // Confirm before marking as resolved to avoid accidental actions
      const confirmed = window.confirm('Are you sure you want to mark this event as resolved? This action cannot be undone.');
      if (!confirmed) return;

      const r = await fetch(`${base.replace(/\/$/, '')}/api/events/${id}/resolve?group=true`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });
      if (!r.ok) throw new Error(await r.text());
      // Optimistically update UI
      setEvents(prev =>
        prev.map(ev => (ev._id === id ? { ...ev, resolved: true, resolvedAt: new Date().toISOString() } : ev)),
      );
      // Show banner
      setResolveMessage('Event resolved – this action cannot be undone.');
    } catch (e) {
      setStatus(`Resolve failed: ${e instanceof Error ? e.message : String(e)}`);
      setStatusError(true);
    }
  };

  const showMain = view === "table" || view === "empty" || view === "loading";

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased">
      {resolveMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-white px-4 py-2 rounded shadow-lg animate-bounce">
          {resolveMessage}
          <button onClick={() => setResolveMessage(null)} className="ml-2 text-sm underline">Dismiss</button>
        </div>
      )}
      <HeaderBar
        onRefresh={handleRefresh}
        onClearAll={handleClearAll}
        refreshing={refreshing}
        roleFilter={roleFilter}
        onRoleFilter={setRoleFilter}
        onAddDemo={handleInjectDemoEvents}
        setErrorType={setErrorType}
        errorType={errorType}
      />

      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6">
        {showMain && (
          <KpiStrip
            total={matchTotal}
            criticalCount={criticalCount}
            affectedUsersCount={affectedUsersCount}
            servicesCount={servicesCount}
            subline={kpiSubTotal}
            loading={view === "loading"}
          />
        )}

        {(view === "error" || view === "config") && (
          <div
            className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-base shadow-sm sm:px-8 sm:text-lg"
            role="status"
          >
            <span
              className={
                statusError ? "font-medium text-red-600" : "text-slate-600"
              }
            >
              {status}
            </span>
          </div>
        )}

        {showMain && (
          <>
            {(statusError || view === "empty") && (
              <p
                className={`text-base font-medium sm:text-lg ${statusError ? "text-red-600" : "text-slate-600"}`}
                role="status"
              >
                {status}
              </p>
            )}

            {view === "empty" ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center shadow-md sm:py-20">
                <div className="mb-4 text-4xl text-[#4F46E5]/35" aria-hidden>
                  ◇
                </div>
                <p className="text-xl font-semibold text-gray-900">
                  No events yet
                </p>
                <p className="mx-auto mt-2 max-w-lg text-base text-gray-600">
                  When your app reports an event, it will show up here.
                </p>
              </div>
            ) : (
              <EventsTable
                events={events}
                allEventsCount={matchTotal}
                hasActiveQuery={
                  debouncedSearch.length > 0 || roleFilter !== "all" || resolvedFilter !== "all"
                }
                onDetail={setSelectedEvent}
                onDelete={handleDelete}
                whereFrom={whereFrom}
                roleFilter={roleFilter}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                severityFilter={severityFilter}
                onSeverityFilter={setSeverityFilter}
                resolvedFilter={resolvedFilter}
                onResolvedFilter={setResolvedFilter}
                onResolveToggle={handleResolveToggle}
                loading={view === "loading"}
                paginationData={paginationData}
                setPaginationData={setPaginationData}
              />
            )}
          </>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onResolveToggle={handleResolveToggle}
      />
    </div>
  );
}
