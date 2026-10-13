"use client";

/**
 * Client-side shim that intercepts `/api/*` fetches and serves them from
 * in-memory server actions. The app has no backend or database anymore,
 * but every view keeps calling the same endpoints transparently.
 */

import * as api from "./server-api";
import type { ApiResult } from "./api-types";

function toResponse(res: ApiResult): Response {
  return new Response(JSON.stringify(res.body), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

type Body = Record<string, unknown> | undefined;

function parseBody(init?: RequestInit): Body {
  if (!init?.body) return undefined;
  try {
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function dispatch(pathname: string, method: string, body: Body, query: URLSearchParams): Promise<ApiResult> | null {
  switch (pathname) {
    case "/api/health":
      return api.health();
    case "/api/search":
      return api.searchGet(query.get("q") ?? "");
    case "/api/profile":
      return method === "PATCH" ? api.profilePatch(body ?? {}) : Promise.resolve({ status: 404, body: { error: "Unknown method" } });
    case "/api/accounts":
      return api.accountsOp(method, body ?? {});
    case "/api/assets":
      return api.assetsOp(method, body ?? {});
    case "/api/liabilities":
      return api.liabilitiesOp(method, body ?? {});
    case "/api/notifications":
      return api.notificationsOp(method, body ?? {});
    case "/api/ai":
      return method === "POST" ? api.aiPost(String((body ?? {}).question ?? "")) : api.aiDelete();
    case "/api/assumptions":
      return method === "PATCH" ? api.assumptionsPatch(body ?? {}) : Promise.resolve({ status: 404, body: { error: "Unknown method" } });
    case "/api/goals":
      return api.goalsOp(method, body ?? {});
    case "/api/scenarios":
      return api.scenariosOp(method, body ?? {});
    case "/api/simulations":
      return api.simulationsOp(method, body ?? {});
    case "/api/reports":
      return api.reportsOp(method, body ?? {});
    case "/api/transactions":
      if (method === "GET") return api.transactionsGet({ type: query.get("type") ?? undefined, q: query.get("q") ?? undefined, limit: Number(query.get("limit") ?? 200) });
      return api.transactionsOp(method, body ?? {});
    case "/api/onboarding":
      return method === "POST" ? api.onboardingPost(body ?? {}) : Promise.resolve({ status: 404, body: { error: "Unknown method" } });
    case "/api/data":
      return method === "DELETE" ? api.dataDelete(String((body ?? {}).scope ?? "")) : Promise.resolve({ status: 404, body: { error: "Unknown method" } });
    default:
      if (pathname.startsWith("/api/auth/")) {
        const action = pathname.slice("/api/auth/".length);
        return api.authPost(action, body ?? {});
      }
      return null;
  }
}

if (typeof window !== "undefined" && !(window as unknown as { __ftApiPatched?: boolean }).__ftApiPatched) {
  const w = window as typeof window & { __ftApiPatched?: boolean };
  w.__ftApiPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : String(input);
    if (!url.startsWith("/api/")) return original(input, init);
    let pathname = url;
    let query = new URLSearchParams();
    try {
      const u = new URL(url, window.location.origin);
      pathname = u.pathname;
      query = u.searchParams;
    } catch {
      /* keep raw url */
    }
    if (!pathname.startsWith("/api/")) return original(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const handler = dispatch(pathname, method, parseBody(init), query);
    if (!handler) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    try {
      return toResponse(await handler);
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: "Something went wrong." }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  };
}

/** Trigger a browser download from text content. */
function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Download the full data export (replaces the old /api/data GET anchor). */
export async function exportAllData() {
  const r = await api.dataExport();
  const d = r.body as { filename: string; mime: string; body: string };
  triggerDownload(d.filename, d.body, d.mime);
}

/** Download the CSV/Excel twin report (replaces /api/reports?format= links). */
export async function exportReport(format: "csv" | "excel" = "csv") {
  const r = await api.reportsExport(format);
  const d = r.body as { filename: string; mime: string; body: string };
  triggerDownload(d.filename, d.body, d.mime);
}
