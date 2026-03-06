const BASE_URL = process.env.DINOX_SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

function log(message) {
  process.stdout.write(`[qa:smoke:api] ${message}\n`);
}

async function requestJson(method, path, body, expectedStatuses = [200]) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${method} ${path} failed with ${response.status}. Body: ${JSON.stringify(parsed)}`
    );
  }

  return parsed;
}

async function requestDelete(path, expectedStatuses = [200]) {
  const response = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
  const text = await response.text();
  let parsed;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `DELETE ${path} failed with ${response.status}. Body: ${JSON.stringify(parsed)}`
    );
  }

  return parsed;
}

async function runSmoke() {
  const suffix = Date.now();
  const startAt = new Date(Date.now() + 5 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  /** @type {{ projectId?: string; tagId?: string; itemId?: string }} */
  const cleanup = {};

  log(`Creating smoke entities against ${BASE_URL} (suffix=${suffix})`);

  try {
    const projectResponse = await requestJson(
      "POST",
      "/api/projects",
      { name: `SMOKE Project ${suffix}`, color: "#3b82f6" },
      [201]
    );
    cleanup.projectId = projectResponse?.data?.id;

    const tagResponse = await requestJson(
      "POST",
      "/api/tags",
      { name: `SMOKE-Tag-${suffix}`, color: "#22c55e" },
      [201]
    );
    cleanup.tagId = tagResponse?.data?.id;

    const itemResponse = await requestJson(
      "POST",
      "/api/items",
      {
        title: `SMOKE Item ${suffix}`,
        description: "Automated API smoke item",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        status: "TODO",
        projectId: cleanup.projectId ?? null,
        tagIds: cleanup.tagId ? [cleanup.tagId] : [],
      },
      [201]
    );
    cleanup.itemId = itemResponse?.data?.id;

    await requestJson(
      "PATCH",
      `/api/items/${cleanup.itemId}`,
      {
        title: `SMOKE Item ${suffix} Updated`,
        status: "DONE",
        tagIds: cleanup.tagId ? [cleanup.tagId] : [],
      },
      [200]
    );

    const fetched = await requestJson("GET", `/api/items/${cleanup.itemId}`, undefined, [200]);
    const fetchedTitle = fetched?.data?.title;
    if (fetchedTitle !== `SMOKE Item ${suffix} Updated`) {
      throw new Error(`Updated item title mismatch. Got: ${String(fetchedTitle)}`);
    }

    log("CRUD assertions passed");
  } finally {
    log("Cleaning up smoke entities");

    if (cleanup.itemId) {
      await requestDelete(`/api/items/${cleanup.itemId}`, [200, 404]);
    }
    if (cleanup.tagId) {
      await requestDelete(`/api/tags/${cleanup.tagId}`, [200, 404]);
    }
    if (cleanup.projectId) {
      await requestDelete(`/api/projects/${cleanup.projectId}`, [200, 404]);
    }
  }
}

try {
  await runSmoke();
  log("Smoke completed successfully");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  log(`FAILED: ${message}`);
  process.exitCode = 1;
}
