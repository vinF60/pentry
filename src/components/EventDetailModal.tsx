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
      const [, funcName, filePath, lineNo, colNo] = parenMatch;
      const isApp = isAppFrame(filePath);
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
      frames.push({
        raw: trimmed,
        isApp,
        functionName: "anonymous",
        file: filePath,
        line: parseInt(lineNo, 10),
        col: parseInt(colNo, 10),
      });
      continue;
    }

    // If it's a native frame
    const nativeMatch = trimmed.match(/^at\s+(.+)\s+\((<anonymous>|native)\)$/);
    if (nativeMatch) {
      const [, funcName, file] = nativeMatch;
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
      bg: "bg-blue-50/80",
      border: "border-blue-100",
      badge: "bg-blue-50 border-blue-200 text-blue-700",
      text: "text-blue-900",
    },
    warning: {
      bg: "bg-amber-50/80",
      border: "border-amber-100",
      badge: "bg-amber-50 border-amber-200 text-amber-800",
      text: "text-amber-950",
    },
    critical: {
      bg: "bg-rose-50/80",
      border: "border-rose-100",
      badge: "bg-rose-50 border-rose-200 text-rose-700",
      text: "text-rose-950",
    },
  };

  const cStyle = bannerStyles[severity];

  return (
    <dialog
      ref={ref}
      className="fixed inset-0 z-50 m-auto max-h-[min(94vh,94%)] w-[min(96vw,56rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/35 backdrop:backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
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
      <div className="flex h-[min(94vh,48rem)] flex-col bg-slate-50">
        {/* --- MODAL HEADER --- */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="event-detail-title" className="text-base font-extrabold text-slate-800">
              Logged Event Diagnostics
            </h2>
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${cStyle.badge}`}>
                {severity}
              </span>
              {event.service && (
                <span className="inline-flex rounded border border-slate-200 bg-slate-100/50 px-2 py-0.5 font-mono text-[9px] font-bold text-slate-600">
                  {event.service}
                </span>
              )}
              <span className={`inline-flex rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                environment === "dev" ? "border-amber-200 bg-amber-50 text-amber-700" :
                environment === "stage" ? "border-purple-200 bg-purple-50 text-purple-700" :
                "border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                {environment}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-90"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* --- ERROR MESSAGE BANNER --- */}
        <div className="shrink-0 border-b border-slate-200/40 bg-white p-5">
          <div className={`flex flex-col gap-3 rounded-xl border ${cStyle.border} ${cStyle.bg} p-4 sm:flex-row sm:items-start sm:justify-between`}>
            <div className="min-w-0 flex-1">
              {requestContext.errorName && (
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {requestContext.errorName}
                </span>
              )}
              <h3 className={`mt-0.5 text-sm font-bold leading-relaxed break-all ${cStyle.text}`}>
                {event.message}
              </h3>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-400 font-semibold">
                <span>Logged: {new Date(event.createdAt).toLocaleString()}</span>
                {occurrencesCount > 1 && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="text-slate-500">{occurrencesCount} total occurrences</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(event.message, "banner-msg")}
              className="mt-1 shrink-0 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
              title="Copy error message to clipboard"
            >
              {copiedId === "banner-msg" ? (
                <>
                  <CheckIcon className="text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
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
        <div className="shrink-0 bg-white border-b border-slate-200">
          <nav className="flex px-6 gap-1" aria-label="Modal navigation tabs">
            {hasStack && (
              <button
                type="button"
                onClick={() => setActiveTab("stack")}
                className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                  activeTab === "stack"
                    ? "border-[#4F46E5] text-[#4F46E5]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
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
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              HTTP & Environment Context
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payloads")}
              className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                activeTab === "payloads"
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              Payloads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`border-b-2 px-4 py-3 text-xs font-bold tracking-wide transition ${
                activeTab === "raw"
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#4F46E5] animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Interactive Stack Viewer
                  </span>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showInternalFrames}
                    onChange={(e) => setShowInternalFrames(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#4F46E5] focus:ring-[#4F46E5]/20"
                  />
                  <span className="text-xs font-semibold text-slate-500 select-none">
                    Show node_modules & internal frames
                  </span>
                </label>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {parsedFrames.filter(frame => frame.isApp || showInternalFrames).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    Only system/framework frames found. Turn on &ldquo;Show node_modules &amp; internal frames&rdquo; to view them.
                  </div>
                ) : (
                  parsedFrames.map((frame, index) => {
                    const visible = frame.isApp || showInternalFrames;
                    if (!visible) return null;

                    return frame.isApp ? (
                      // Highlighted User/App Frame
                      <div key={index} className="group relative flex items-start justify-between gap-4 bg-indigo-50/15 px-4 py-3 transition hover:bg-indigo-50/25">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-indigo-700 uppercase tracking-wide">
                              Application Code
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-950 break-all">
                              {frame.functionName}
                            </span>
                          </div>
                          <div className="mt-1.5 font-mono text-[11px] text-slate-600 break-all leading-normal flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-400">{frame.file}</span>
                            {frame.line !== undefined && (
                              <span className="rounded border border-indigo-100 bg-indigo-50/60 px-1 py-0.5 text-[10px] font-bold text-indigo-700 tabular-nums">
                                line {frame.line}:{frame.col}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${frame.file}:${frame.line ?? 1}:${frame.col ?? 1}`, `frame-${index}`)}
                          className="shrink-0 rounded-lg border border-slate-200 bg-white p-1 text-slate-400 transition hover:border-slate-300 hover:text-[#4F46E5]"
                          title="Copy file path"
                        >
                          {copiedId === `frame-${index}` ? (
                            <CheckIcon className="text-emerald-600" />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    ) : (
                      // Muted System/Framework Frame
                      <div key={index} className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-50/50 font-mono text-[11px]">
                        <div className="min-w-0 truncate text-slate-400">
                          <span className="text-slate-500 font-semibold">{frame.functionName}</span>
                          <span className="mx-1.5 text-slate-300">|</span>
                          <span className="text-slate-400" title={frame.file}>
                            {frame.file?.split(/[/\\]/).pop() || frame.file || "internal"}
                            {frame.line !== undefined && `:${frame.line}`}
                          </span>
                        </div>
                        <span className="shrink-0 text-[8px] uppercase font-bold text-slate-300 tracking-wider">
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
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Request Metadata
                </h4>
                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Method</dt>
                    <dd className="mt-1">
                      {requestContext.method ? (
                        <span className={`inline-flex rounded px-1.5 py-0.5 font-mono font-bold text-[10px] uppercase ${
                          requestContext.method === "GET" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          requestContext.method === "POST" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                          "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {requestContext.method}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">UNKNOWN</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Route</dt>
                    <dd className="mt-1 font-mono text-slate-800 break-all select-all font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-100/50">
                      {requestContext.route || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Full URL</dt>
                    <dd className="mt-1 font-mono text-slate-600 break-all select-all text-[11px]">
                      {requestContext.url || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Client & System context */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Client & System Context
                </h4>
                <dl className="space-y-3.5 text-xs">
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">IP Address</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-700 select-all">
                      {requestContext.ip || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">User ID</dt>
                    <dd className="mt-1 font-mono font-semibold text-slate-700 select-all">
                      {requestContext.userId || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Cron name / watchdogs</dt>
                    <dd className="mt-1 font-mono text-slate-700 select-all">
                      {requestContext.cron || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 uppercase tracking-wider text-[9px] font-bold">Helper / Handler</dt>
                    <dd className="mt-1 font-mono text-slate-700 select-all">
                      {requestContext.helper || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* User Agent */}
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  User Agent String
                </h4>
                <p className="font-mono text-xs text-slate-600 break-all leading-normal bg-slate-50/50 p-2.5 rounded border border-slate-100/50 shadow-inner">
                  {requestContext.userAgent || "—"}
                </p>
              </div>
            </div>
          )}

          {/* 3. PAYLOADS TAB */}
          {activeTab === "payloads" && (
            <div className="space-y-5">
              {!requestContext.hasPayloads ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400 text-xs font-semibold">
                  No query, parameters, or body payloads are available for this event.
                </div>
              ) : (
                <>
                  {requestContext.params && Object.keys(requestContext.params).length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Route Parameters
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.params, null, 2), "params-copy")}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          {copiedId === "params-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 bg-slate-900 p-4.5 font-mono text-xs leading-relaxed text-slate-300 max-h-56 shadow-inner">
                        {JSON.stringify(requestContext.params, null, 2)}
                      </pre>
                    </div>
                  )}

                  {requestContext.query && Object.keys(requestContext.query).length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Query String Object
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.query, null, 2), "query-copy")}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          {copiedId === "query-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 bg-slate-900 p-4.5 font-mono text-xs leading-relaxed text-slate-300 max-h-56 shadow-inner">
                        {JSON.stringify(requestContext.query, null, 2)}
                      </pre>
                    </div>
                  )}

                  {requestContext.body && Object.keys(requestContext.body).length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          POST/PUT HTTP Body Payload
                        </h4>
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(requestContext.body, null, 2), "body-copy")}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          {copiedId === "body-copy" ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-auto rounded-lg border border-slate-100 bg-slate-900 p-4.5 font-mono text-xs leading-relaxed text-slate-300 max-h-72 shadow-inner">
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
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Raw Event JSON Payload
                </h4>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(event, null, 2), "raw-copy")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                >
                  {copiedId === "raw-copy" ? (
                    <>
                      <CheckIcon className="text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied JSON</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      <span>Copy Full JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4.5 font-mono text-[11px] leading-relaxed text-slate-300 max-h-[26rem] shadow-inner">
                {JSON.stringify(event, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
