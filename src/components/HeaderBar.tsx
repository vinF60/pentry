"use client";

import Image from "next/image";
import type { DisplayRole } from "@/lib/inboxUi";
import { ErrorType } from "@/types/inbox";
import { useTheme } from "@/lib/theme";

const ROLE_TABS: { id: "all" | DisplayRole; label: string }[] = [
  { id: "dev", label: "Dev" },
  { id: "stage", label: "Stage" },
  { id: "prod", label: "Prod" },
];

const TAB_ACTIVE_THEMES: Record<"all" | DisplayRole, string> = {
  all: "bg-slate-900 text-white shadow-sm ring-1 ring-slate-950/5 dark:bg-slate-100 dark:text-slate-900",
  dev: "bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/10",
  stage: "bg-purple-600 text-white shadow-sm ring-1 ring-purple-700/10",
  prod: "bg-rose-600 text-white shadow-sm ring-1 ring-rose-700/10",
};

type Props = {
  onRefresh: () => void;
  onClearAll: () => void;
  refreshing: boolean;
  roleFilter: "all" | DisplayRole;
  onRoleFilter: (f: "all" | DisplayRole) => void;
  onAddDemo: () => void;
  setErrorType: (e: ErrorType) => void;
  errorType: ErrorType;
};

const filters = [
  { id: ErrorType.all, label: "All Logs" },
  { id: ErrorType.caught, label: "Caught" },
  { id: ErrorType.uncaught, label: "Uncaught" },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function FilterSelector({
  setErrorType,
  errorType,
}: {
  setErrorType: (e: ErrorType) => void;
  errorType: ErrorType;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/40 dark:border-slate-700/60">
      {filters.map((filter) => {
        const isActive = errorType === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => setErrorType(filter.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              isActive
                ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export function HeaderBar({
  onRefresh,
  onClearAll,
  refreshing,
  roleFilter,
  onRoleFilter,
  onAddDemo,
  setErrorType,
  errorType,
}: Props) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl transition-colors duration-300">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="flex min-h-[72px] items-center justify-between gap-4 py-3">
          {/* Logo & Brand Section */}
          <div className="flex min-w-0 items-center gap-4">
            <h1 className="sr-only">PipexAI — Error Inbox</h1>
            <div className="relative h-10 w-[180px] shrink-0 sm:h-12 sm:w-[220px]">
              <Image
                src="/pipex-ai-logo.png"
                alt="Pipex.ai Logo"
                fill
                className="object-contain object-left dark:brightness-0 dark:invert"
                sizes="(max-width: 640px) 180px, 220px"
                priority
              />
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Pentry Collector
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live-dot"
                  aria-hidden
                />
                LIVE INBOX
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white active:scale-90"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Fetch latest logged errors"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              <span
                className={`text-sm ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              >
                ↻
              </span>
              <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>

            {/* Error Type Segment Filter */}
            <FilterSelector setErrorType={setErrorType} errorType={errorType} />

            {/* Dangerous action - Clear All */}
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(
                  "Are you sure you want to delete all errors from the database?\n\nThis action cannot be undone.",
                );
                if (confirmed) {
                  onClearAll();
                }
              }}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-rose-950/30 px-3.5 text-xs font-bold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white hover:border-rose-500 dark:hover:border-rose-600 active:scale-95"
              title="Delete all logged events"
            >
              Clear DB
            </button>
          </div>
        </div>

        {/* Environment Filter Sub-navigation */}
        <nav
          className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 py-3"
          aria-label="Filter events by cloud environment"
        >
          {ROLE_TABS.map((tab) => {
            const active = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onRoleFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition duration-150 ease-in-out ${
                  active
                    ? TAB_ACTIVE_THEMES[tab.id]
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
