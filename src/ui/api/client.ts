import {
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
