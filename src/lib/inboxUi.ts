import type { InboxEvent } from "@/types/inbox";

/** Environment bucket for filters: dev | stage | prod */
export type DisplayRole = "dev" | "stage" | "prod";

export function deriveSeverity(ev: InboxEvent): "critical" | "warning" | "info" {
  const blob = `${ev.message || ""} ${ev.stack || ""}`.toLowerCase();
  if (/fatal|crash|critical|panic|econnrefused|out of memory|uncaught exception/i.test(blob)) {
    return "critical";
  }
  if (/warn|deprecated|timeout|\b429\b|\b503\b|\b502\b|\b401\b|\b403\b/i.test(blob)) {
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
  const ex = ev.extra;
  if (ex && typeof ex === "object") {
    const fromEnv = normalizeEnv(String(ex.environment ?? ex.env ?? ""));
    if (fromEnv) return fromEnv;

    const legacy = String(ex.role || "").toLowerCase();
    if (legacy === "buyer") return "dev";
    if (legacy === "seller") return "stage";
    if (legacy === "admin") return "prod";

    if (ex.edge === true || String(ex.runtime || "").toLowerCase() === "edge") return "stage";
  }
  if (ev.source === "client") return "dev";
  return "prod";
}

export function filterEventsByRole(
  events: InboxEvent[],
  filter: "all" | DisplayRole,
): InboxEvent[] {
  if (filter === "all") return events;
  return events.filter((e) => getDisplayRole(e) === filter);
}
