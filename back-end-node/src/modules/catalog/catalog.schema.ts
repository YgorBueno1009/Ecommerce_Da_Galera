import { z } from "zod";

const voltageFilterSchema = z
  .union([
    z.enum(["110v", "220v", "Bivolt"]),
    z.array(z.enum(["110v", "220v", "Bivolt"])).max(3),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));
const sizeFilterSchema = z
  .union([
    z.enum(["Compacto", "Médio", "Grande"]),
    z.array(z.enum(["Compacto", "Médio", "Grande"])).max(3),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]));
const colorFilterSchema = z
  .union([z.string().trim().min(1).max(40), z.array(z.string().trim().min(1).max(40)).max(20)])
  .transform((value) => (Array.isArray(value) ? value : [value]));

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  voltage: voltageFilterSchema.optional(),
  color: colorFilterSchema.optional(),
  size: sizeFilterSchema.optional(),
  sort: z.enum(["relevance", "price-asc", "price-desc"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});

export const productSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
