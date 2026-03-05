import { z } from "zod";
import { colorSchema, idSchema, nullableStringSchema } from "./common";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  color: colorSchema,
  archived: z.boolean().optional(),
  externalSource: nullableStringSchema,
  externalId: nullableStringSchema,
});

export const updateProjectSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120).optional(),
  color: colorSchema.optional(),
  archived: z.boolean().optional(),
  externalSource: nullableStringSchema.optional(),
  externalId: nullableStringSchema.optional(),
});

export const archiveProjectSchema = z.object({
  id: idSchema,
  archived: z.boolean(),
});
