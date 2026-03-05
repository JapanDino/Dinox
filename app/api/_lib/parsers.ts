export function readMultiValue(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key);

  if (values.length > 0) {
    return values;
  }

  const csv = params.get(key);
  if (!csv) {
    return [];
  }

  return csv
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function readOptionalString(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value;
}
