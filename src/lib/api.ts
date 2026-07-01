/** API base for the Express collector (no trailing slash). */
export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

// Environment-specific API bases (no trailing slash).
const API_BASE_DEV = (process.env.NEXT_PUBLIC_API_URL_DEV || process.env.NEXT_PUBLIC_API_URL || "").replace(
  /\/$/,
  "",
);
const API_BASE_STAGE = (process.env.NEXT_PUBLIC_API_URL_STAGE || API_BASE_DEV).replace(/\/$/, "");
const API_BASE_PROD = (process.env.NEXT_PUBLIC_API_URL_PROD || API_BASE_STAGE).replace(/\/$/, "");

export type ApiEnvironment = "dev" | "stage" | "prod" | "all";

/** Returns API base URL for the selected environment tab. */
export function getApiBaseForRole(role: ApiEnvironment): string {
  if (role === "stage") return API_BASE_STAGE;
  if (role === "prod") return API_BASE_PROD;
  // "all" and "dev" both fall back to DEV cluster.
  return API_BASE_DEV;
}

/**
 * When the Express API has `LIGHT_SENTRY_KEY` set, the dashboard must send the same value
 * as `X-API-Key`. Set `NEXT_PUBLIC_LIGHT_SENTRY_KEY` in web/.env.local (same value as the server).
 * This is public to the browser—use only for trusted/internal deployments or leave the server key unset.
 */
export function getDashboardApiKey(): string {
  return (process.env.NEXT_PUBLIC_LIGHT_SENTRY_KEY || "").trim();
}

export function apiPath(suffix: string): string {
  const base = getApiBase();
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}${path}`;
}
