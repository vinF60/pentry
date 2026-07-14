import type { InboxEvent } from "@/types/inbox";

/** Environment bucket for filters: dev | stage | prod */
export type DisplayRole = "dev" | "stage" | "prod";

export function deriveSeverity(
  ev: InboxEvent,
): "critical" | "warning" | "info" {
  const httpStatus = ev.data?.extra?.httpStatus;

  const type = ev.data?.type ?? ev.data?.extra?.type;

  const errorName = ev.data?.errorName;

  // Critical
  if (
    type === "uncaught" ||
    httpStatus === 500 ||
    (httpStatus !== undefined && httpStatus >= 500) ||
    ["ReferenceError", "TypeError", "RangeError", "SyntaxError"].includes(
      errorName ?? "",
    )
  ) {
    return "critical";
  }

  // Warning
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    httpStatus === 429 ||
    (httpStatus !== undefined && httpStatus >= 400)
  ) {
    return "warning";
  }

  // Text fallback
  const blob = [
    ev.message,
    ev.stack,
    ev.errorCode,
    ev.data?.errorName,
    ev.data?.type,
    ev.data?.extra?.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /fatal|crash|critical|panic|econnrefused|out of memory|uncaught/i.test(blob)
  ) {
    return "critical";
  }

  if (/warn|deprecated|timeout/i.test(blob)) {
    return "warning";
  }

  return "info";
}

function normalizeEnv(raw: string): DisplayRole | null {
  const s = raw.toLowerCase().trim();
  if (s === "dev" || s === "development") return "dev";
  if (s === "stage" || s === "staging") return "stage";
  if (s === "prod" || s === "production") return "prod";
  return null;
}

/**
 * Maps events to Dev / Stage / Prod.
 * Uses `extra.env` or `extra.environment`, then legacy `extra.role` (buyer→dev, seller→stage, admin→prod),
 * then source: client→dev, edge→stage, server→prod.
 */
export function getDisplayRole(ev: InboxEvent): DisplayRole {
  const ex = ev.data?.extra;
  if (ex && typeof ex === "object") {
    const fromEnv = normalizeEnv(String(ex.environment ?? ex.env ?? ""));
    if (fromEnv) return fromEnv;

    const legacy = String(ex.role || "").toLowerCase();
    if (legacy === "buyer") return "dev";
    if (legacy === "seller") return "stage";
    if (legacy === "admin") return "prod";

    if (ex.edge === true || String(ex.runtime || "").toLowerCase() === "edge")
      return "stage";
  }
  if (ev.data?.source === "client") return "dev";
  return "prod";
}

export function filterEventsByRole(
  events: InboxEvent[],
  filter: "all" | DisplayRole,
): InboxEvent[] {
  if (filter === "all") return events;
  return events.filter((e) => getDisplayRole(e) === filter);
}
