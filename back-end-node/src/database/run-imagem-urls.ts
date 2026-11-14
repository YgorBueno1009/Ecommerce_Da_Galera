import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "006-product-imagem-urls.sql");
const sql = readFileSync(sqlPath, "utf8");

try {
  await pool.query(sql);
  console.log("URLs de imagem aplicadas (006-product-imagem-urls.sql).");
} finally {
  await pool.end();
}