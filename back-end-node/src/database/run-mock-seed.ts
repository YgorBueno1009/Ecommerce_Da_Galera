import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const baseDir = dirname(fileURLToPath(import.meta.url));

try {
  const seedSql = readFileSync(join(baseDir, "005-mock-catalog-seed.sql"), "utf8");
  await pool.query(seedSql);
  console.log("Seed do mock aplicado com sucesso (005-mock-catalog-seed.sql).");

  const descriptionsSql = readFileSync(join(baseDir, "007-product-descriptions.sql"), "utf8");
  await pool.query(descriptionsSql);
  console.log("Descrições aplicadas (007-product-descriptions.sql).");
} finally {
  await pool.end();
}
