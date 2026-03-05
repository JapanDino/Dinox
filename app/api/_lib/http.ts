import { NextResponse } from "next/server";
import { DomainError } from "@/src/domain/services";

export function serializeDates<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeDates(entry)) as T;
  }

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const entries = Object.entries(objectValue).map(([key, entry]) => [
      key,
      serializeDates(entry),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function jsonResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json(serializeDates(data), { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    const statusByCode: Record<string, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
    };

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: statusByCode[error.code] ?? 400 }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error.",
      },
    },
    { status: 500 }
  );
}
