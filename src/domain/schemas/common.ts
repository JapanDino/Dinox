import { z } from "zod";

export const idSchema = z.string().cuid();

export const colorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u, "Color must be a valid HEX value");

export const nullableStringSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (value === undefined ? null : value));

export const dateInputSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return value;
}, z.date());
