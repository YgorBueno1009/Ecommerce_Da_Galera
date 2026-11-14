import assert from "node:assert/strict";
import test from "node:test";
import { cartItemSchema, cartQuantitySchema } from "./cart.schema.js";

test("validates cart item identifiers and positive integer quantities", () => {
  assert.equal(
    cartItemSchema.safeParse({
      productId: "4f1cb85d-e578-4bc8-8d48-7711f33f5ef1",
      quantity: 2,
    }).success,
    true,
  );
  assert.equal(
    cartItemSchema.safeParse({
      productId: "not-a-uuid",
      quantity: 2,
    }).success,
    false,
  );
  assert.equal(cartQuantitySchema.safeParse({ quantity: 0 }).success, false);
});
