import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "007-product-descriptions.sql");
const sql = readFileSync(sqlPath, "utf8");

try {
  await pool.query(sql);
  console.log("Descrições de produto aplicadas (007-product-descriptions.sql).");
} finally {
  await pool.end();
}