-- URLs públicas de stock photos (Pexels / Unsplash) para o catálogo demo.
-- Grava em products.attributes.imagemUrl — idempotente; pode reaplicar.
--
-- Uso:
--   psql -h localhost -U postgres -d ecommerce -f back-end-node/src/database/006-product-imagem-urls.sql

BEGIN;

SET search_path TO ecommerce, public;

WITH imagens (slug, url) AS (
  VALUES
    (
      'furadeira-de-impacto-650w'::citext,
      'https://images.pexels.com/photos/30486981/pexels-photo-30486981.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'liquidificador-1200w',
      'https://images.pexels.com/photos/30946794/pexels-photo-30946794.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'ventilador-de-coluna-40cm',
      'https://images.pexels.com/photos/13983948/pexels-photo-13983948.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'air-fryer-4l',
      'https://images.pexels.com/photos/35285814/pexels-photo-35285814.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'parafusadeira-12v',
      'https://images.pexels.com/photos/8811530/pexels-photo-8811530.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'cafeteira-eletrica-30-xicaras',
      'https://images.pexels.com/photos/10278414/pexels-photo-10278414.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'aspirador-vertical-2-em-1',
      'https://images.pexels.com/photos/9462316/pexels-photo-9462316.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'chaleira-eletrica-1-7l',
      'https://images.pexels.com/photos/8879615/pexels-photo-8879615.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'trena-a-laser-40m',
      'https://images.pexels.com/photos/3143082/pexels-photo-3143082.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'luminaria-de-mesa-led',
      'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'jogo-chaves-combinadas-12-pecas',
      'https://images.pexels.com/photos/9607054/pexels-photo-9607054.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'esmerilhadeira-angular-115',
      'https://images.pexels.com/photos/8985617/pexels-photo-8985617.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'serra-tico-tico-500w',
      'https://images.pexels.com/photos/1094766/pexels-photo-1094766.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'kit-laminas-madeira',
      'https://images.pexels.com/photos/209251/pexels-photo-209251.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'nivel-bolha-60-cm',
      'https://images.pexels.com/photos/585389/pexels-photo-585389.jpeg?auto=compress&cs=tinysrgb&w=800'
    ),
    (
      'caixa-brocas-30-pecas',
      'https://images.pexels.com/photos/5853932/pexels-photo-5853932.jpeg?auto=compress&cs=tinysrgb&w=800'
    )
)
UPDATE ecommerce.products p
SET attributes = COALESCE(p.attributes, '{}'::jsonb) || jsonb_build_object('imagemUrl', i.url)
FROM imagens i
WHERE p.slug = i.slug;

COMMIT;