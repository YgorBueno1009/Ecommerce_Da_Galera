import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { pool } from "../../../database/pool.js";
import {
  getBearerToken,
  verifySessionToken,
} from "./session-token.js";

export async function requireStoreUser(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<string | null> {
  const token = getBearerToken(request.get("authorization"));
  const session = token ? verifySessionToken(token, env.JWT_SECRET) : null;
  if (!session) {
    response.status(401).json({ error: "Autenticação necessária" });
    return null;
  }

  if (
    (session.role !== "CLIENTE" && session.role !== "ADMIN") ||
    session.context !== "STORE"
  ) {
    response.status(403).json({ error: "Acesso permitido somente no contexto da loja" });
    return null;
  }

  try {
    const result = await pool.query(
      `SELECT 1
       FROM ecommerce.users u
       WHERE u.id = $1
         AND u.role = $2::ecommerce.user_role
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM ecommerce.revoked_tokens r
           WHERE r.jti = $3
             AND r.expires_at > NOW()
         )
       LIMIT 1`,
      [session.sub, session.role, session.jti],
    );

    if (!result.rowCount) {
      response.status(401).json({ error: "Sessão inválida ou encerrada" });
      return null;
    }

    return session.sub;
  } catch (error) {
    next(error);
    return null;
  }
}
