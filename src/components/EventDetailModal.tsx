"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { InboxEvent } from "@/types/inbox";
import { deriveSeverity, getDisplayRole } from "@/lib/inboxUi";

type Props = {
  event: InboxEvent | null;
  onClose: () => void;
};

type StackFrame = {
  raw: string;
  isApp: boolean;
  functionName?: string;
  file?: string;
  line?: number;
  col?: number;
};

function parseStack(stackStr: string): StackFrame[] {
  if (!stackStr) return [];
  const lines = stackStr.split("\n");
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) {
      continue;
    }

    // Regex 1: with parentheses e.g. "at serverErrorResponse (d:\Vin\Custom Error Logger v2\server\response.js:25:20)"
    const parenMatch = trimmed.match(/^at\s+(?:async\s+)?([^\s(]+)\s+\((.+):(\d+):(\d+)\)$/);
    if (parenMatch) {
      const [, rawFuncName, filePath, lineNo, colNo] = parenMatch;
      const isApp = isAppFrame(filePath);
      let funcName = rawFuncName;
      if (funcName === "Object.<anonymous>" || funcName === "anonymous" || funcName === "(anonymous)") {
        const fileName = filePath.split(/[/\\]/).pop();
        if (fileName) {
          funcName = fileName;
        }
      }
      frames.push({
        raw: trimmed,
        isApp,
        functionName: funcName,
        file: filePath,
        line: parseInt(lineNo, 10),
        col: parseInt(colNo, 10),
      });
      continue;
    }

    // Regex 2: without parentheses e.g. "at d:\Vin\Custom Error Logger v2\server\index.js:50:5"
    const noParenMatch = trimmed.match(/^at\s+(?:async\s+)?(.+):(\d+):(\d+)$/);
    if (noParenMatch) {
      const [, filePath, lineNo, colNo] = noParenMatch;
      const isApp = isAppFrame(filePath);
      const fileName = filePath.split(/[/\\]/).pop();
      frames.push({
        raw: trimmed,
        isApp,
        functionName: fileName || "(anonymous)",
        file: filePath,
        line: parseInt(lineNo, 10),
        col: parseInt(colNo, 10),
      });
      continue;
    }

    // If it's a native frame
    const nativeMatch = trimmed.match(/^at\s+(.+)\s+\((<anonymous>|native)\)$/);
    if (nativeMatch) {
      const [, rawFuncName, file] = nativeMatch;
      let funcName = rawFuncName;
      if (funcName === "Object.<anonymous>" || funcName === "anonymous" || funcName === "(anonymous)") {
        if (file && file !== "<anonymous>") {
          funcName = file;
        } else {
          funcName = "(anonymous)";
        }
      }
      frames.push({
        raw: trimmed,
        isApp: false,
        functionName: funcName,
        file,
      });
      continue;
    }

    frames.push({
      raw: trimmed,
      isApp: false,
    });
  }

  return frames;
}

function isAppFrame(filePath: string): boolean {
  if (!filePath) return false;
  const lower = filePath.toLowerCase();
  if (
    lower.includes("node_modules") ||
    lower.includes("node:") ||
    lower.includes("next/dist") ||
    lower.includes("webpack:") ||
    lower.includes("<anonymous>")
  ) {
    return false;
  }
  return true;
}

// Custom Icons
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

export function EventDetailModal({ event, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<"stack" | "http" | "payloads" | "raw">("stack");
  const [showInternalFrames, setShowInternalFrames] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (event) {
      el.showModal();
      if (event.stack) {
        setActiveTab("stack");
      } else {
        setActiveTab("http");
      }
    } else {
      el.close();
    }
  }, [event]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1800);
  };

  const parsedFrames = useMemo(() => {
    if (!event?.stack) return [];
    return parseStack(event.stack);
  }, [event?.stack]);

  const requestContext = useMemo(() => {
    if (!event) return null;
    const ex = event.data || {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataContainer = (ex.Data && typeof ex.Data === "object" ? ex.Data : ex) as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nestedExtra = (dataContainer.extra && typeof dataContainer.extra === "object" ? dataContainer.extra : {}) as Record<string, any>;

    const mergedQuery = dataContainer.query ?? ex.query ?? null;
    const mergedParams = dataContainer.params ?? ex.params ?? null;
    const mergedBody = dataContainer.body ?? ex.body ?? null;

    const ip = dataContainer.ip ?? ex.ip ?? null;
    const userAgent = dataContainer.user_agent ?? dataContainer.userAgent ?? event.data?.user_agent ?? null;
    const userId = dataContainer.userId ?? ex.userId ?? null;
    const method = dataContainer.method ?? nestedExtra.method ?? ex.method ?? null;
    const route = dataContainer.route ?? event.data?.route ?? null;
    const url = dataContainer.url ?? event.url ?? null;
    const errorName = dataContainer.errorName ?? nestedExtra.errorName ?? ex.errorName ?? null;
    const helper = nestedExtra.helper ?? ex.helper ?? null;
    const cron = nestedExtra.cron ?? ex.cron ?? null;
    const errorCode = nestedExtra.errorCode ?? ex.errorCode ?? null;
    const httpStatus = nestedExtra.httpStatus ?? ex.Error_code ?? null;
    const environment = nestedExtra.environment ?? ex.environment ?? null;

    const hasPayloads = !!(
      (mergedQuery && Object.keys(mergedQuery).length > 0) ||
      (mergedParams && Object.keys(mergedParams).length > 0) ||
      (mergedBody && Object.keys(mergedBody).length > 0)
    );

    return {
      ip,
      userAgent,
      userId,
      method,
      route,
      url,
      query: mergedQuery,
      params: mergedParams,
      body: mergedBody,
      errorName,
      helper,
      cron,
      errorCode,
      httpStatus,
      environment,
      hasPayloads,
    };
  }, [event]);

  if (!event || !requestContext) return null;

  const severity = deriveSeverity(event);
  const environment = requestContext.environment || getDisplayRole(event);
  const hasStack = !!event.stack;
  const occurrencesCount = typeof event.occurrences === "number" && event.occurrences > 0 ? event.occurrences : 1;

  const bannerStyles: Record<
    "critical" | "warning" | "info",
    { bg: string; border: string; badge: string; text: string }
  > = {
    info: {
      bg: "bg-blue-50/80 dark:bg-blue-950/40",
      border: "border-blue-100 dark:border-blue-900/60",
      badge: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400",
      text: "text-blue-900 dark:text-blue-200",
    },
    warning: {
      bg: "bg-amber-50/80 dark:bg-amber-950/40",
      border: "border-amber-100 dark:border-amber-900/60",
      badge: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400",
      text: "text-amber-950 dark:text-amber-200",
    },
    critical: {
      bg: "bg-rose-50/80 dark:bg-rose-950/40",
      border: "border-rose-100 dark:border-rose-900/60",
      badge: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400",
      text: "text-rose-950 dark:text-rose-200",
    },
  };

  const cStyle = bannerStyles[severity];

  return (
    <dialog
      ref={ref}
      className="fixed inset-0 z-50 m-auto max-h-[min(94vh,94%)] w-[min(96vw,56rem)] overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900 p-0 text-slate-800 dark:text-slate-200 shadow-2xl backdrop:bg-slate-900/35 dark:backdrop:bg-black/60 backdrop:backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="event-detail-title"
    >
      <div className="flex h-[min(94vh,48rem)] flex-col bg-slate-50 dark:bg-slate-900">
        {/* --- MODAL HEADER --- */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="event-detail-title" className="text-base font-extrabold text-slate-800 dark:text-slate-100">
              Logged Event Diagnostics
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${cStyle.badge}`}>
                {severity}
              </span>
              {event.service && (
                <span className="inline-flex rounded border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400">
                  {event.service}
                </span>
              )}
              <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                environment === "dev" ? "border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" :
                environment === "stage" ? "border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400" :
                "border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
              }`}>
                {environment}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-lg leading-none text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-200 active:scale-90"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* --- ERROR MESSAGE BANNER --- */}
        <div className="shrink-0 border-b border-slate-200/40 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
          <div className={`flex flex-col gap-3 rounded-xl border ${cStyle.border} ${cStyle.bg} p-4 sm:flex-row sm:items-start sm:justify-between`}>
            <div className="min-w-0 flex-1">
              {requestContext.errorName && (
                <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {requestContext.errorName}
                </span>
              )}
              <h3 className={`mt-0.5 text-sm font-bold leading-relaxed break-all ${cStyle.text}`}>
                {event.message}
              </h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                <span>Logged: {new Date(event.createdAt).toLocaleString()}</span>
                {occurrencesCount > 1 && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-slate-500 dark:text-slate-400">{occurrencesCount} total occurrences</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(event.message, "banner-msg")}
              className="mt-1 shrink-0 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
              title="Copy error message to clipboard"
            >
              {copiedId === "banner-msg" ? (
                <>
                  <CheckIcon className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* --- TABS --- */}
        <div className="shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <nav className="flex px-6 gap-1" aria-label="Modal navigation tabs">
            {hasStack && (
              <button
                type="button"
                onClick={() => setActiveTab("stack")}
                className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                  activeTab === "stack"
                    ? "border-[#4F46E5] dark:border-indigo-500 text-[#4F46E5] dark:text-indigo-400"
                    : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Stack Trace
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("http")}
              className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                activeTab === "http"
                  ? "border-[#4F46E5] dark:border-indigo-500 text-[#4F46E5] dark:text-indigo-400"
                  : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              HTTP & Environment Context
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payloads")}
              className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                activeTab === "payloads"
                  ? "border-[#4F46E5] dark:border-indigo-500 text-[#4F46E5] dark:text-indigo-400"
                  : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Payloads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                activeTab === "raw"
                  ? "border-[#4F46E5] dark:border-indigo-500 text-[#4F46E5] dark:text-indigo-400"
                  : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              Raw Event
            </button>
          </nav>
        </div>

        {/* --- TAB CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. STACK TRACE TAB */}
          {activeTab === "stack" && hasStack && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#4F46E5] dark:bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Interactive Stack Viewer
                  </span>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showInternalFrames}
                    onChange={(e) => setShowInternalFrames(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-[#4F46E5] dark:text-indigo-500 focus:ring-[#4F46E5]/20 dark:focus:ring-indigo-500/20"
                  />
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                    Show node_modules & internal frames
                  </span>
                </label>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                {parsedFrames.filter(frame => frame.isApp || showInternalFrames).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    Only system/framework frames found. Turn on &ldquo;Show node_modules &amp; internal frames&rdquo; to view them.
                  </div>
                ) : (
                  parsedFrames.map((frame, index) => {
                    const visible = frame.isApp || showInternalFrames;
                    if (!visible) return null;

                    return frame.isApp ? (
                      // Highlighted User/App Frame
                      <div key={index} className="group relative flex items-start justify-between gap-4 bg-indigo-50/15 dark:bg-indigo-950/10 px-4 py-3 transition hover:bg-indigo-50/25 dark:hover:bg-indigo-950/20">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                              Application Code
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-950 dark:text-indigo-200 break-all">
                              {frame.functionName}
                            </span>
                          </div>
                          <div className="mt-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all leading-normal flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-400 dark:text-slate-500">{frame.file}</span>
                            {frame.line !== undefined && (
                              <span className="rounded border border-indigo-100 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/50 px-1 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                                line {frame.line}:{frame.col}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${frame.file}:${frame.line ?? 1}:${frame.col ?? 1}`, `frame-${index}`)}
                          className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-slate-400 dark:text-slate-500 transition hover:border-slate-300 dark:hover:border-slate-700 hover:text-[#4F46E5] dark:hover:text-indigo-400"
                          title="Copy file path"
                        >
                          {copiedId === `frame-${index}` ? (
                            <CheckIcon className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    ) : (
                      // Muted System/Framework Frame
                      <div key={index} className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30 font-mono text-[11px]">
                        <div className="min-w-0 truncate text-slate-400 dark:text-slate-500">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold">{frame.functionName}</span>
                          <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                          <span className="text-slate-400 dark:text-slate-500" title={frame.file}>
                            {frame.file?.split(/[/\\]/).pop() || frame.file || "internal"}
                            {frame.line !== undefined && `:${frame.line}`}
                          </span>
                        </div>
                        <span className="shrink-0 text-[8px] uppercase font-bold text-slate-300 dark:text-slate-600 tracking-wider">
                          System Frame
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 2. HTTP & CONTEXT TAB */}
          {activeTab === "http" && (
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Request Metadata */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Request Metadata
                </h4>
                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Method</dt>
                    <dd className="mt-1">
                      {requestContext.method ? (
                        <span className={`inline-flex rounded px-1.5 py-0.5 font-mono font-bold text-[10px] uppercase ${
                          requestContext.method === "GET" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50" :
                          requestContext.method === "POST" ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50" :
                          "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50"
                        }`}>
                          {requestContext.method}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">UNKNOWN</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Route</dt>
                    <dd className="mt-1 font-mono text-slate-800 dark:text-slate-200 break-all select-all font-semibold bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {requestContext.route || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Full URL</dt>
                    <dd className="mt-1 font-mono text-slate-600 dark:text-slate-400 break-all select-all text-[11px]">
                      {requestContext.url || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Client & System context */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Client & System Context
                </h4>
                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">IP Address</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-700 dark:text-slate-300 select-all">
                      {requestContext.ip || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">User ID</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-700 dark:text-slate-300 select-all">
                      {requestContext.userId || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Cron name / watchdogs</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 select-all">
                      {requestContext.cron || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Helper / Handler</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 select-all">
                      {requestContext.helper || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Metrics & Occurrences */}
              <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  Metrics & Occurrences
                </h4>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Total Occurrences</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.occurrences ?? event.occurrenceDetails?.occurrences ?? 1}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">First Seen</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.occurrenceDetails?.firstSeen ? new Date(event.occurrenceDetails.firstSeen).toLocaleString() : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Last Seen</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.occurrenceDetails?.lastSeen ? new Date(event.occurrenceDetails.lastSeen).toLocaleString() : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Span (Duration)</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.occurrenceDetails?.spanMs ? `${(event.occurrenceDetails.spanMs / 1000).toFixed(1)}s` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Frequency (Day / Hour)</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.occurrenceDetails?.frequencyPerDay !== undefined ? `${event.occurrenceDetails.frequencyPerDay.toFixed(2)}/d` : "—"} · {event.occurrenceDetails?.frequencyPerHour !== undefined ? `${event.occurrenceDetails.frequencyPerHour.toFixed(2)}/h` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Affected IPs</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.affectedIpCount ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Affected URLs</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.affectedUrlCount ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] font-bold">Multi-User Event</dt>
                    <dd className="mt-1 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded border border-slate-100/50 dark:border-slate-800/50">
                      {event.multiUser !== undefined ? (event.multiUser ? "Yes" : "No") : "—"}
                    </dd>
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                  User Agent String
                </h4>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all leading-normal bg-slate-50/50 dark:bg-slate-900/50 p-2.5 rounded border border-slate-100/50 dark:border-slate-800/50 shadow-inner">
                  {requestContext.userAgent || "—"}
                </p>
              </div>
            </div>
          )}

          {/* 3. PAYLOADS TAB */}
          {activeTab === "payloads" && (
            <div className="space-y-5">
              {!requestContext.hasPayloads ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                  No query, parameters, or body payloads are available for this event.
                </div>
              ) : (
                <>
                  {requestContext.params && Object.keys(requestContext.params).length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Route Parameters
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.params, null, 2), "params-copy")}
                          className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {copiedId === "params-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 p-4.5 font-mono text-xs leading-relaxed text-slate-300 dark:text-slate-400 max-h-56 shadow-inner">
                        {JSON.stringify(requestContext.params, null, 2)}
                      </pre>
                    </div>
                  )}

                  {requestContext.query && Object.keys(requestContext.query).length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Query String Object
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.query, null, 2), "query-copy")}
                          className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {copiedId === "query-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 p-4.5 font-mono text-xs leading-relaxed text-slate-300 dark:text-slate-400 max-h-56 shadow-inner">
                        {JSON.stringify(requestContext.query, null, 2)}
                      </pre>
                    </div>
                  )}

                  {requestContext.body && Object.keys(requestContext.body).length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          POST/PUT HTTP Body Payload
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.body, null, 2), "body-copy")}
                          className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {copiedId === "body-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 p-4.5 font-mono text-xs leading-relaxed text-slate-300 dark:text-slate-400 max-h-72 shadow-inner">
                        {JSON.stringify(requestContext.body, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 4. RAW EVENT TAB */}
          {activeTab === "raw" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Raw Event JSON Payload
                </h4>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(event, null, 2), "raw-copy")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
                >
                  {copiedId === "raw-copy" ? (
                    <>
                      <CheckIcon className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      <span>Copy Full JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 p-4.5 font-mono text-[11px] leading-relaxed text-slate-300 dark:text-slate-400 max-h-[26rem] shadow-inner">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
