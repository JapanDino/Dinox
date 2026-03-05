import { ApiItem, ApiProject, ApiResponse, ApiTag } from "./types";

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

export async function fetchTags(): Promise<ApiTag[]> {
  return request<ApiTag[]>("/api/tags");
}

export async function fetchItems(): Promise<ApiItem[]> {
  return request<ApiItem[]>("/api/items");
}
