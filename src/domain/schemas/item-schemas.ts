import { z } from "zod";
import { ITEM_STATUS_VALUES } from "../models/types";
import { dateInputSchema, idSchema, nullableStringSchema } from "./common";

const statusSchema = z.enum(ITEM_STATUS_VALUES);

export const createItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: nullableStringSchema.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  startAt: dateInputSchema,
  endAt: dateInputSchema,
  allDay: z.boolean().optional(),
  status: statusSchema.optional(),
  projectId: z.union([idSchema, z.null(), z.undefined()]).transform((value) => (value === undefined ? null : value)),
  tagIds: z.array(idSchema).optional(),
  recurrenceRule: nullableStringSchema.optional(),
  seriesId: nullableStringSchema.optional(),
  parentId: nullableStringSchema.optional(),
  externalSource: nullableStringSchema.optional(),
  externalId: nullableStringSchema.optional(),
});

export const updateItemSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(200).optional(),
  description: nullableStringSchema.optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  startAt: dateInputSchema.optional(),
  endAt: dateInputSchema.optional(),
  allDay: z.boolean().optional(),
  status: statusSchema.optional(),
  projectId: z.union([idSchema, z.null()]).optional(),
  tagIds: z.array(idSchema).optional(),
  recurrenceRule: nullableStringSchema.optional(),
  seriesId: nullableStringSchema.optional(),
  parentId: nullableStringSchema.optional(),
  externalSource: nullableStringSchema.optional(),
  externalId: nullableStringSchema.optional(),
});

export const deleteItemSchema = z.object({
  id: idSchema,
});

export const listItemsSchema = z.object({
  projectIds: z.array(idSchema).optional(),
  tagIds: z.array(idSchema).optional(),
  query: z.string().optional(),
  rangeStart: dateInputSchema.optional(),
  rangeEnd: dateInputSchema.optional(),
  statuses: z.array(statusSchema).optional(),
});
