import {
  ApiCalendarSubscription,
  ApiItem,
  ApiItemMutationInput,
  ApiProject,
  ApiProjectMutationInput,
  ApiResponse,
  ApiTag,
  ApiTagMutationInput,
} from "./types";

async function request<TData>(url: string, init?: RequestInit): Promise<TData> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  // Read body as text first so we can give a clean error when the server
  // returns an HTML error page (e.g. Next.js 500/404) instead of JSON.
  // Calling response.json() on HTML causes the confusing
  // "Unexpected token '<', '<!DOCTYPE'... is not valid JSON" crash.
  const text = await response.text();

  if (!response.ok) {
    // Try to extract a structured message from JSON error responses.
    // If the body isn't JSON (e.g. an HTML error page), fall back to a
    // generic message with the HTTP status so the user sees something useful.
    // NOTE: the parse and the throw are intentionally separated so that the
    // catch only covers JSON.parse failures, not the throw itself.
    let message: string | undefined;
    try {
      const payload = JSON.parse(text) as { error?: { message?: string } };
      message = payload.error?.message;
    } catch {
      // body was not JSON (e.g. an HTML error page) — message stays undefined
    }
    throw new Error(message ?? `Request failed (${response.status}).`);
  }

  const payload = JSON.parse(text) as ApiResponse<TData>;
  return payload.data;
}

export async function fetchProjects(): Promise<ApiProject[]> {
  return request<ApiProject[]>("/api/projects");
}

export async function fetchProject(id: string): Promise<ApiProject> {
  return request<ApiProject>(`/api/projects/${id}`);
}

export async function createProject(input: ApiProjectMutationInput): Promise<ApiProject> {
  return request<ApiProject>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProject(
  id: string,
  input: Partial<ApiProjectMutationInput> & { archived?: boolean }
): Promise<ApiProject> {
  return request<ApiProject>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTags(): Promise<ApiTag[]> {
  return request<ApiTag[]>("/api/tags");
}

export async function createTag(input: ApiTagMutationInput): Promise<ApiTag> {
  return request<ApiTag>("/api/tags", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTag(id: string, input: Partial<ApiTagMutationInput>): Promise<ApiTag> {
  return request<ApiTag>(`/api/tags/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTag(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/tags/${id}`, {
    method: "DELETE",
  });
}

export async function fetchItems(): Promise<ApiItem[]> {
  return request<ApiItem[]>("/api/items");
}

export async function createItem(input: ApiItemMutationInput): Promise<ApiItem> {
  return request<ApiItem>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateItem(id: string, input: Partial<ApiItemMutationInput>): Promise<ApiItem> {
  return request<ApiItem>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteItem(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/items/${id}`, {
    method: "DELETE",
  });
}

export async function deleteItemSeries(seriesId: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/items/series/${seriesId}`, {
    method: "DELETE",
  });
}

export async function updateItemSeries(
  seriesId: string,
  input: Partial<ApiItemMutationInput>
): Promise<void> {
  await request<{ ok: boolean }>(`/api/items/series/${seriesId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ---- ICS export / import ----

export async function exportIcs(): Promise<void> {
  const response = await fetch("/api/ics/export", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("ICS export failed.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "dinox-export.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importIcs(icsText: string): Promise<{ created: number; errors: string[] }> {
  return request<{ created: number; errors: string[] }>("/api/ics/import", {
    method: "POST",
    body: JSON.stringify({ icsText }),
  });
}

// ---- Calendar subscriptions ----

export async function fetchSubscriptions(): Promise<ApiCalendarSubscription[]> {
  return request<ApiCalendarSubscription[]>("/api/subscriptions");
}

export async function createSubscription(input: {
  name: string;
  url: string;
  color?: string;
  enabled?: boolean;
}): Promise<ApiCalendarSubscription> {
  return request<ApiCalendarSubscription>("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/subscriptions/${id}`, {
    method: "DELETE",
  });
}

export async function updateSubscription(
  id: string,
  input: Partial<{ name: string; url: string; color: string; enabled: boolean }>
): Promise<ApiCalendarSubscription> {
  return request<ApiCalendarSubscription>(`/api/subscriptions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function syncSubscription(
  id: string
): Promise<{ synced: number; created: number; updated: number; deleted: number }> {
  return request<{ synced: number; created: number; updated: number; deleted: number }>(
    `/api/subscriptions/${id}/sync`,
    { method: "POST" }
  );
}
