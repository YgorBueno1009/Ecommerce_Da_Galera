import { Router } from "express";
import type { QueryResultRow } from "pg";
import { pool } from "../../database/pool.js";
import { requireStoreUser } from "../auth/session/store-session.js";
import { cartItemSchema, cartQuantitySchema } from "./cart.schema.js";

interface CartItemRow extends QueryResultRow {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  price: string | number;
  imagemUrl: string | null;
  quantity: number;
  availableStock: number;
}

interface CartItemResponse {
  produtoId: string;
  slug: string;
  nome: string;
  sku: string;
  imagemUrl: string | null;
  precoUnitario: number;
  quantidade: number;
  estoque: number;
}

class CartError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const cartRoutes = Router();

cartRoutes.get("/", async (request, response, next) => {
  const userId = await requireStoreUser(request, response, next);
  if (!userId) return;

  try {
    const result = await pool.query<CartItemRow>(
      `SELECT
         p.id AS "productId",
         p.slug::text AS slug,
         p.name,
         p.sku::text AS sku,
         p.base_price::text AS price,
         NULLIF(TRIM(p.attributes->>'imagemUrl'), '') AS "imagemUrl",
         ci.quantity,
         CASE
           WHEN p.is_active AND p.deleted_at IS NULL
             THEN COALESCE(GREATEST(i.quantity - i.reserved_quantity, 0), 0)
           ELSE 0
         END::int AS "availableStock"
       FROM ecommerce.carts c
       JOIN ecommerce.cart_items ci ON ci.cart_id = c.id
       JOIN ecommerce.products p ON p.id = ci.product_id
       LEFT JOIN ecommerce.inventory i ON i.product_id = p.id
       WHERE c.user_id = $1
       ORDER BY ci.created_at ASC`,
      [userId],
    );
    const items = result.rows.map(toCartItemResponse);
    response.status(200).json({
      itens: items,
      quantidadeItens: items.reduce((sum, item) => sum + item.quantidade, 0),
      subtotal: roundMoney(
        items.reduce((sum, item) => sum + item.precoUnitario * item.quantidade, 0),
      ),
    });
  } catch (error) {
    next(error);
  }
});

cartRoutes.post("/items", async (request, response, next) => {
  const userId = await requireStoreUser(request, response, next);
  if (!userId) return;

  const parsed = cartItemSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: "Item de carrinho inválido",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    await withLockedCart(userId, async (client, cartId) => {
      const product = await getAvailableProduct(client, parsed.data.productId);
      const existing = await client.query<{ quantity: number }>(
        `SELECT quantity
         FROM ecommerce.cart_items
         WHERE cart_id = $1 AND product_id = $2
         FOR UPDATE`,
        [cartId, parsed.data.productId],
      );
      const quantity = (existing.rows[0]?.quantity ?? 0) + parsed.data.quantity;
      if (quantity > product.availableStock) {
        throw new CartError(409, "Quantidade solicitada excede o estoque disponível");
      }

      await client.query(
        `INSERT INTO ecommerce.cart_items (cart_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (cart_id, product_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`,
        [cartId, parsed.data.productId, quantity],
      );
    });

    response.status(200).json({ message: "Item adicionado ao carrinho" });
  } catch (error) {
    respondCartError(error, response, next);
  }
});

cartRoutes.patch("/items/:productId", async (request, response, next) => {
  const userId = await requireStoreUser(request, response, next);
  if (!userId) return;

  const parsedQuantity = cartQuantitySchema.safeParse(request.body);
  const productId = request.params.productId;
  if (
    !parsedQuantity.success ||
    typeof productId !== "string" ||
    !isUuid(productId)
  ) {
    response.status(400).json({ error: "Produto ou quantidade inválidos" });
    return;
  }

  try {
    await withLockedCart(userId, async (client, cartId) => {
      const existing = await client.query(
        `SELECT 1
         FROM ecommerce.cart_items
         WHERE cart_id = $1 AND product_id = $2
         FOR UPDATE`,
        [cartId, productId],
      );
      if (!existing.rowCount) {
        throw new CartError(404, "Item não encontrado no carrinho");
      }

      const product = await getAvailableProduct(client, productId);
      if (parsedQuantity.data.quantity > product.availableStock) {
        throw new CartError(409, "Quantidade solicitada excede o estoque disponível");
      }

      await client.query(
        `UPDATE ecommerce.cart_items
         SET quantity = $3, updated_at = NOW()
         WHERE cart_id = $1 AND product_id = $2`,
        [cartId, productId, parsedQuantity.data.quantity],
      );
    });

    response.status(200).json({ message: "Quantidade atualizada" });
  } catch (error) {
    respondCartError(error, response, next);
  }
});

cartRoutes.delete("/items/:productId", async (request, response, next) => {
  const userId = await requireStoreUser(request, response, next);
  if (!userId) return;

  const productId = request.params.productId;
  if (typeof productId !== "string" || !isUuid(productId)) {
    response.status(400).json({ error: "Identificador de produto inválido" });
    return;
  }

  try {
    await withLockedCart(userId, async (client, cartId) => {
      await client.query(
        `DELETE FROM ecommerce.cart_items
         WHERE cart_id = $1 AND product_id = $2`,
        [cartId, productId],
      );
    });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

cartRoutes.delete("/", async (request, response, next) => {
  const userId = await requireStoreUser(request, response, next);
  if (!userId) return;

  try {
    await withLockedCart(userId, async (client, cartId) => {
      await client.query(
        "DELETE FROM ecommerce.cart_items WHERE cart_id = $1",
        [cartId],
      );
    });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function withLockedCart<T>(
  userId: string,
  action: (client: import("pg").PoolClient, cartId: string) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query(
      `INSERT INTO ecommerce.carts (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const cartResult = await client.query<{ id: string }>(
      `SELECT id
       FROM ecommerce.carts
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    );
    const result = await action(client, cartResult.rows[0].id);
    await client.query("COMMIT");
    transactionOpen = false;
    return result;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("[Carrinho] Falha ao reverter transação:", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function getAvailableProduct(
  client: import("pg").PoolClient,
  productId: string,
): Promise<{ availableStock: number }> {
  const product = await client.query(
    `SELECT id
     FROM ecommerce.products
     WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL
     FOR SHARE`,
    [productId],
  );
  if (!product.rowCount) {
    throw new CartError(404, "Produto não encontrado ou indisponível");
  }

  const inventory = await client.query<{ availableStock: number }>(
    `SELECT GREATEST(quantity - reserved_quantity, 0)::int AS "availableStock"
     FROM ecommerce.inventory
     WHERE product_id = $1
     FOR SHARE`,
    [productId],
  );
  const availableStock = inventory.rows[0]?.availableStock ?? 0;
  if (availableStock < 1) {
    throw new CartError(409, "Produto sem estoque disponível");
  }
  return { availableStock };
}

function toCartItemResponse(row: CartItemRow): CartItemResponse {
  return {
    produtoId: row.productId,
    slug: row.slug,
    nome: row.name,
    sku: row.sku,
    imagemUrl: row.imagemUrl,
    precoUnitario: Number(row.price),
    quantidade: Number(row.quantity),
    estoque: Number(row.availableStock),
  };
}

function respondCartError(
  error: unknown,
  response: import("express").Response,
  next: import("express").NextFunction,
): void {
  if (error instanceof CartError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  next(error);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
