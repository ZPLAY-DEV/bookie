import type { DataProvider } from "@refinedev/core";
import { supabaseClient } from "./supabase-client";

// 모든 읽기/쓰기는 Hono API(wrangler)를 경유한다. Supabase Data API·RLS는 쓰지 않는다.
// 목록 응답 컨벤션: { data: T[], total: number } — docs/CONSOLE.md
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

async function apiFetch(path: string, init?: RequestInit) {
  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(
      (body as { error?: string }).error ?? `API error (${res.status})`
    );
    Object.assign(error, { statusCode: res.status });
    throw error;
  }
  return res.json();
}

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, pagination, sorters, filters }) => {
    const params = new URLSearchParams();
    params.set("page", String(pagination?.currentPage ?? 1));
    params.set("pageSize", String(pagination?.pageSize ?? 10));
    const sorter = sorters?.[0];
    if (sorter) {
      params.set("sortField", sorter.field);
      params.set("sortOrder", sorter.order);
    }
    // 지원 필터: lessons의 weekId (eq)
    for (const filter of filters ?? []) {
      if ("field" in filter && filter.operator === "eq" && filter.value != null) {
        params.set(filter.field, String(filter.value));
      }
    }
    return apiFetch(`/${resource}?${params}`);
  },

  getOne: async ({ resource, id }) => {
    return { data: await apiFetch(`/${resource}/${id}`) };
  },

  getMany: async ({ resource, ids }) => {
    const data = await Promise.all(ids.map((id) => apiFetch(`/${resource}/${id}`)));
    return { data };
  },

  create: async ({ resource, variables }) => {
    return {
      data: await apiFetch(`/${resource}`, {
        method: "POST",
        body: JSON.stringify(variables),
      }),
    };
  },

  update: async ({ resource, id, variables }) => {
    return {
      data: await apiFetch(`/${resource}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(variables),
      }),
    };
  },

  deleteOne: async ({ resource, id }) => {
    return { data: await apiFetch(`/${resource}/${id}`, { method: "DELETE" }) };
  },
};
