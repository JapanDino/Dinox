import { z } from "zod";
import { colorSchema, idSchema, nullableStringSchema } from "./common";

export const createTagSchema = z.object({
  name: z.string().min(1).max(120),
  color: colorSchema,
  externalSource: nullableStringSchema,
  externalId: nullableStringSchema,
});

export const updateTagSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120).optional(),
  color: colorSchema.optional(),
  externalSource: nullableStringSchema.optional(),
  externalId: nullableStringSchema.optional(),
});
