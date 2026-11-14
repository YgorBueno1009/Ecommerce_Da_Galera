import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

try {
  const r1 = await pool.query(
    `SELECT to_regclass('ecommerce.password_reset_tokens')::text AS t`,
  );
  const r2 = await pool.query(
    `SELECT has_table_privilege(
       'svc_node_js',
       'ecommerce.password_reset_tokens',
       'SELECT, INSERT, UPDATE'
     ) AS ok`,
  );
  const r3 = await pool.query(
    `SELECT email, is_active::text
     FROM ecommerce.users
     WHERE email = 'cliente.demo@exemplo.com'
     LIMIT 1`,
  );
  console.log(
    JSON.stringify(
      {
        table: r1.rows[0]?.t ?? null,
        svc_node_js_privilege: r2.rows[0]?.ok ?? null,
        demo_user: r3.rows[0] ?? null,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
