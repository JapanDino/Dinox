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

  const payload = (await response.json()) as ApiResponse<TData> | { error?: { message?: string } };

  if (!response.ok) {
    const message = "error" in payload ? payload.error?.message : "Request failed.";
    throw new Error(message ?? "Request failed.");
  }

  return (payload as ApiResponse<TData>).data;
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
