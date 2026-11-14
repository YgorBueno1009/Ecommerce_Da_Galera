import { Router } from "express";
import type { QueryResultRow } from "pg";
import { pool } from "../../database/pool.js";
import { catalogQuerySchema, productSlugSchema } from "./catalog.schema.js";

interface ProductRow extends QueryResultRow {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  price: string | number;
  category: string;
  attributes: Record<string, unknown>;
  availableStock: number;
}

interface CategoryRow extends QueryResultRow {
  slug: string;
  name: string;
  parentSlug: string | null;
}

interface ProductResponse {
  id: string;
  slug: string;
  sku: string;
  nome: string;
  descricao: string | null;
  preco: number;
  categoria: string;
  oferta: boolean;
  estoque: number;
  voltagem: string | null;
  cor: string | null;
  tamanho: string | null;
  fichaTecnica: { rotulo: string; valor: string }[];
  imagemUrl: string | null;
}

const productSelect = `
  SELECT
    p.id,
    p.slug::text AS slug,
    p.sku::text AS sku,
    p.name,
    p.description,
    p.base_price::text AS price,
    c.slug::text AS category,
    p.attributes,
    COALESCE(GREATEST(i.quantity - i.reserved_quantity, 0), 0)::int AS "availableStock"
  FROM ecommerce.products p
  JOIN ecommerce.categories c ON c.id = p.category_id
  LEFT JOIN ecommerce.inventory i ON i.product_id = p.id
`;

export const catalogRoutes = Router();

catalogRoutes.get("/categories", async (_request, response, next) => {
  try {
    const result = await pool.query<CategoryRow>(
      `SELECT
         category.slug::text AS slug,
         category.name,
         parent.slug::text AS "parentSlug"
       FROM ecommerce.categories category
       LEFT JOIN ecommerce.categories parent ON parent.id = category.parent_id
       WHERE category.is_active = TRUE
         AND (parent.id IS NULL OR parent.is_active = TRUE)
       ORDER BY parent.name NULLS FIRST, category.name`,
    );
    response.status(200).json(
      result.rows.map(({ slug, name, parentSlug }) => ({
        slug,
        nome: name,
        ...(parentSlug ? { pai: parentSlug } : {}),
      })),
    );
  } catch (error) {
    next(error);
  }
});

catalogRoutes.get("/products", async (request, response, next) => {
  const parsed = catalogQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({
      error: "Filtros de catálogo inválidos",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { q, category, voltage, color, size, sort, limit, offset } = parsed.data;
  const orderBy = {
    relevance: "p.name ASC, p.id ASC",
    "price-asc": "p.base_price ASC, p.name ASC",
    "price-desc": "p.base_price DESC, p.name ASC",
  }[sort];

  try {
    const result = await pool.query<ProductRow>(
      `WITH RECURSIVE category_tree AS (
         SELECT id
         FROM ecommerce.categories
         WHERE slug = $2 AND is_active = TRUE
         UNION
         SELECT child.id
         FROM ecommerce.categories child
         JOIN category_tree parent ON child.parent_id = parent.id
         WHERE child.is_active = TRUE
       )
       ${productSelect}
       WHERE p.is_active = TRUE
         AND p.deleted_at IS NULL
         AND c.is_active = TRUE
         AND ($1::text IS NULL OR
              translate(lower(p.name),
                'áàãâäéèêëíìîïóòõôöúùûüç',
                'aaaaaeeeeiiiiooooouuuuc')
                ILIKE translate('%' || lower($1) || '%',
                  'áàãâäéèêëíìîïóòõôöúùûüç',
                  'aaaaaeeeeiiiiooooouuuuc')
              OR p.sku::text ILIKE '%' || $1 || '%'
              OR c.name ILIKE '%' || $1 || '%'
              OR c.slug::text ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR p.category_id IN (SELECT id FROM category_tree))
         AND ($3::text[] IS NULL OR p.attributes->>'voltagem' = ANY($3))
         AND ($4::text[] IS NULL OR p.attributes->>'cor' = ANY($4))
         AND ($5::text[] IS NULL OR p.attributes->>'tamanho' = ANY($5))
       ORDER BY ${orderBy}
       LIMIT $6 OFFSET $7`,
      [
        q || null,
        category ?? null,
        voltage ?? null,
        color ?? null,
        size ?? null,
        limit,
        offset,
      ],
    );

    response.status(200).json(result.rows.map(toProductResponse));
  } catch (error) {
    next(error);
  }
});

catalogRoutes.get("/products/:slug", async (request, response, next) => {
  const parsedSlug = productSlugSchema.safeParse(request.params.slug);
  if (!parsedSlug.success) {
    response.status(400).json({ error: "Slug de produto inválido" });
    return;
  }

  try {
    const result = await pool.query<ProductRow>(
      `${productSelect}
       WHERE p.slug = $1
         AND p.is_active = TRUE
         AND p.deleted_at IS NULL
         AND c.is_active = TRUE
       LIMIT 1`,
      [parsedSlug.data],
    );
    const product = result.rows[0];
    if (!product) {
      response.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    response.status(200).json(toProductResponse(product));
  } catch (error) {
    next(error);
  }
});

function toProductResponse(row: ProductRow): ProductResponse {
  const attributes = row.attributes ?? {};
  const excludedAttributes = new Set([
    "oferta",
    "voltagem",
    "cor",
    "tamanho",
    "fichaTecnica",
    "imagemUrl",
  ]);
  const fichaTecnica = Array.isArray(attributes.fichaTecnica)
    ? attributes.fichaTecnica.flatMap((item) => {
        if (
          typeof item !== "object" ||
          item === null ||
          !("rotulo" in item) ||
          !("valor" in item) ||
          typeof item.rotulo !== "string" ||
          typeof item.valor !== "string"
        ) {
          return [];
        }
        return [{ rotulo: item.rotulo, valor: item.valor }];
      })
    : Object.entries(attributes)
        .filter(([key, value]) => !excludedAttributes.has(key) && value !== null)
        .map(([key, value]) => ({
          rotulo: key.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase()),
          valor: typeof value === "string" ? value : JSON.stringify(value),
        }));

  /** Coluna `ecommerce.products.description` (não vem de `attributes`). */
  const descricao =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : null;

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    nome: row.name,
    descricao,
    preco: Number(row.price),
    categoria: row.category,
    oferta: attributes.oferta === true || attributes.oferta === "true",
    estoque: Number(row.availableStock),
    voltagem: stringAttribute(attributes.voltagem),
    cor: stringAttribute(attributes.cor),
    tamanho: stringAttribute(attributes.tamanho),
    fichaTecnica,
    imagemUrl: stringAttribute(attributes.imagemUrl),
  };
}

function stringAttribute(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
