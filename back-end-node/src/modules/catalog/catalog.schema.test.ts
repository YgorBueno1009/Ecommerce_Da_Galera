import assert from "node:assert/strict";
import test from "node:test";
import { catalogQuerySchema, productSlugSchema } from "./catalog.schema.js";

test("validates catalog filters and supplies defaults", () => {
  assert.deepEqual(catalogQuerySchema.parse({ q: " furadeira ", limit: "20" }), {
    q: "furadeira",
    sort: "relevance",
    limit: 20,
    offset: 0,
  });
  assert.equal(
    catalogQuerySchema.safeParse({ voltage: "380v" }).success,
    false,
  );
  assert.equal(catalogQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(catalogQuerySchema.safeParse({ offset: "-1" }).success, false);
  assert.deepEqual(
    catalogQuerySchema.parse({ voltage: ["110v", "220v"], color: ["Preto", "Inox"] })
      .voltage,
    ["110v", "220v"],
  );
});

test("accepts only URL-safe product slugs", () => {
  assert.equal(productSlugSchema.safeParse("liquidificador-1200w").success, true);
  assert.equal(productSlugSchema.safeParse("../products").success, false);
});
