"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseForRole, getDashboardApiKey } from "@/lib/api";
import type { DisplayRole } from "@/lib/inboxUi";
import { ErrorType, PaginationData, type InboxEvent } from "@/types/inbox";
import { EventDetailModal } from "./EventDetailModal";
import { EventsTable } from "./EventsTable";
import { HeaderBar } from "./HeaderBar";
import { KpiStrip } from "./KpiStrip";

type SeverityFilter = "all" | "info" | "warning" | "critical";
function whereFrom(ev: InboxEvent) {
  if (ev.data?.route) return `route: ${ev.data.route}`;
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
  const [selectedEvent, setSelectedEvent] = useState<InboxEvent | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | DisplayRole>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [errorType, setErrorType] = useState<ErrorType>(ErrorType.all);
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
    const demoEvents: InboxEvent[] = [
      {
        _id: "demo-error-1",
        message:
          "TypeError: Cannot read properties of undefined (reading 'split')",
        stack: `TypeError: Cannot read properties of undefined (reading 'split')
    at serverErrorResponse (d:\\Vin\\Custom Error Logger v2\\server\\response.js:25:20)
    at async d:\\Vin\\Custom Error Logger v2\\server\\index.js:50:5
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async parsePayload (d:\\Vin\\Custom Error Logger v2\\server\\parser.js:12:8)
    at async next (node_modules/express/lib/router/index.js:335:12)`,
        url: "https://core.pipex.ai/api/v1/users/parse?id=123",
        service: "pipex-client-service",
        errorCode: "SERVER_ERROR_RESPONSE",
        isOperational: false,
        occurrences: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        data: {
          source: "server",
          route: "/api/v1/users/parse",
          url: "https://core.pipex.ai/api/v1/users/parse?id=123",
          ip: "192.168.1.45",
          user_agent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          userId: "usr_9j2k1l8m",
          query: {
            id: "123",
            format: "json",
          },
          params: {
            userId: "123",
          },
          body: {
            name: "John Doe",
            email: "john.doe@example.com",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
          errorName: "TypeError",
          extra: {
            environment: "production",
            service: "pipex-client-service",
            method: "POST",
            errorCode: "SERVER_ERROR_RESPONSE",
            httpStatus: 500,
            helper: "userHandler",
            cron: "api",
          },
        },
      },
      {
        _id: "demo-warn-2",
        message: "MongoNetworkError: connection timed out",
        stack: `MongoNetworkError: connection timed out
    at connectionFailure (node_modules/mongodb/lib/cmap/connection.js:290:15)
    at TLSSocket.<anonymous> (node_modules/mongodb/lib/cmap/connection.js:115:20)`,
        url: null,
        service: "pipex-database-service",
        errorCode: "DB_TIMEOUT",
        isOperational: true,
        occurrences: 3,
        createdAt: new Date(Date.now() - 300000).toISOString(),
        updatedAt: new Date(Date.now() - 300000).toISOString(),
        data: {
          extra: {
            environment: "staging",
            service: "pipex-database-service",
            method: "UNKNOWN",
            errorCode: "DB_TIMEOUT",
            httpStatus: 504,
            helper: "dbConnector",
            cron: "db-watchdog",
          },
        },
      },
      {
        _id: "demo-info-3",
        message: "User signed in successfully",
        stack: null,
        url: "https://backend.f10.co.in/api/v1/auth/login",
        service: "pipex-auth-service",
        errorCode: "SUCCESS",
        isOperational: true,
        occurrences: 1,
        createdAt: new Date(Date.now() - 900000).toISOString(),
        updatedAt: new Date(Date.now() - 900000).toISOString(),
        data: {
          ip: "192.168.1.100",
          userId: "usr_abc123xyz",
          user_agent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
          extra: {
            environment: "development",
            service: "pipex-auth-service",
            method: "POST",
            errorCode: "SUCCESS",
            httpStatus: 200,
            helper: "authHandler",
            cron: "api",
          },
        },
      },
    ];

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
    [debouncedSearch, roleFilter, errorType , paginationData],
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

  const showMain = view === "table" || view === "empty" || view === "loading";

  return (
    <div className="min-h-screen font-sans text-slate-900 antialiased">
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
                  debouncedSearch.length > 0 || roleFilter !== "all"
                }
                onDetail={setSelectedEvent}
                onDelete={handleDelete}
                whereFrom={whereFrom}
                roleFilter={roleFilter}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                severityFilter={severityFilter}
                onSeverityFilter={setSeverityFilter}
                loading={view === "loading"}
                paginationData={paginationData}
                setPaginationData ={setPaginationData}
              />
            )}
          </>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
