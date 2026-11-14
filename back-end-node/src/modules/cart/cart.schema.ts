import { z } from "zod";

export const cartItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(999),
  })
  .strict();

export const cartQuantitySchema = z
  .object({
    quantity: z.number().int().min(1).max(999),
  })
  .strict();
