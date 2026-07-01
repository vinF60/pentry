"use client";

import Image from "next/image";

import type { DisplayRole } from "@/lib/inboxUi";
import { useState } from "react";
import { ErrorType } from "@/types/inbox";

const ROLE_TABS: { id: "all" | DisplayRole; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dev", label: "Dev" },
  { id: "stage", label: "Stage" },
  { id: "prod", label: "Prod" },
];

const TAB_ACTIVE: Record<"all" | DisplayRole, string> = {
  all: "border-[#4F46E5]/20 bg-[#4F46E5]/10 text-[#4F46E5]",
  dev: "border-[#fde68a] bg-[#fffbeb] text-[#d97706]",
  stage: "border-[#ddd6fe] bg-[#f5f3ff] text-[#7c3aed]",
  prod: "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]",
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
  { id: ErrorType.all, label: "All" },
  { id: ErrorType.caught, label: "Caught" },
  { id: ErrorType.uncaught, label: "Uncaught" },
];

export default function FilterSelector({
  setErrorType,
  errorType,
}: {
  setErrorType: (e: ErrorType) => void;
  errorType: ErrorType;
}) {
  return (
    <div className="flex gap-3">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => setErrorType(filter.id)}
          className={`rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200 ${
            errorType === filter.id
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
          }`}
        >
          {filter.label}
        </button>
      ))}
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
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/45">
      <div className="flex min-h-[72px] shrink-0 items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <h1 className="sr-only">PipexAI — Error inbox</h1>
          <div
            className="relative h-11 w-[min(220px,54vw)] shrink-0 scale-105 sm:h-[3.25rem] sm:w-[260px]"
            style={{ filter: "drop-shadow(0 1px 2px rgba(59,130,246,0.3))" }}
          >
            <Image
              // src="https://pipingproject.s3.ap-south-1.amazonaws.com/contactUsDevelopment/pipex-ai-logo_1775206126714.jpg"
              src="/pipex-error-system/pipex-ai-logo.png"
              alt="Pipex.ai"
              fill
              className="object-contain object-left"
              sizes="(max-width: 640px) 54vw, 260px"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Error inbox
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-3 py-1 text-xs font-semibold text-[#166534]">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22C55E] animate-live-dot"
                aria-hidden
              />
              LIVE
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          {/* <button
            type="button"
            onClick={onAddDemo}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-[#4F46E5] shadow-sm transition duration-200 ease-in-out hover:-translate-y-px hover:bg-indigo-600 hover:text-white hover:shadow-md sm:px-5 sm:text-base"
            title="Load dummy demo events for UI testing"
          >
            Add Demo Events
          </button> */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Reload events"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-5 text-sm font-semibold text-white shadow-sm transition duration-200 ease-in-out hover:-translate-y-px hover:bg-[#4338CA] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-[#4F46E5] sm:text-base"
          >
            <span
              className={`text-lg leading-none ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            >
              ↻
            </span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          {FilterSelector({ setErrorType, errorType })}
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                "Are you sure you want to delete all events?\n\nThis action cannot be undone.",
              );

              if (confirmed) {
                onClearAll();
              }
            }}
            className="h-11 rounded-lg border border-[#EF4444]/30 bg-white px-4 text-sm font-semibold text-[#EF4444] transition duration-200 ease-in-out hover:bg-[#EF4444] hover:text-white sm:px-5 sm:text-base"
          >
            Delete all
          </button>
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center gap-2 border-t border-white/40 bg-white/35 px-5 py-3 sm:px-8"
        aria-label="Filter by environment"
      >
        {ROLE_TABS.map((tab) => {
          const active = roleFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onRoleFilter(tab.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition sm:px-5 sm:text-base ${
                active
                  ? TAB_ACTIVE[tab.id]
                  : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-white/70"
              } duration-200 ease-in-out`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
