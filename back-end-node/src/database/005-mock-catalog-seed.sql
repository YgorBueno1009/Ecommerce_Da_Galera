-- Dados de desenvolvimento espelhados do mock do front-end Angular
-- (CATEGORIAS / PRODUTOS_MOCK em catalogo.service e SKUs extras em pedidos.service).
-- Idempotente: pode ser reaplicado após schema.db e migrações 001–004.
-- Fotos demo: attributes.imagemUrl (ver também 006-product-imagem-urls.sql).
-- Textos da vitrine: products.description (ver também 007-product-descriptions.sql).
--
-- Uso (PowerShell, ajuste usuário/senha/banco):
--   psql -h localhost -U postgres -d ecommerce -f back-end-node/src/database/005-mock-catalog-seed.sql

BEGIN;

SET search_path TO ecommerce, public;

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------

INSERT INTO ecommerce.categories (name, slug, parent_id)
VALUES ('Eletroportáteis', 'eletroportateis', NULL)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      is_active = TRUE;

INSERT INTO ecommerce.categories (name, slug, parent_id)
SELECT v.name, v.slug, parent.id
FROM (VALUES
  ('Cozinha', 'cozinha', 'eletroportateis'),
  ('Climatização', 'climatizacao', 'eletroportateis')
) AS v(name, slug, parent_slug)
JOIN ecommerce.categories parent ON parent.slug = v.parent_slug
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      is_active = TRUE;

INSERT INTO ecommerce.categories (name, slug, parent_id)
VALUES
  ('Ferramentas', 'ferramentas', NULL),
  ('Limpeza', 'limpeza', NULL),
  ('Iluminação', 'iluminacao', NULL)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Produtos (IDs fixos para ambiente de dev)
-- ---------------------------------------------------------------------------

INSERT INTO ecommerce.products (id, category_id, sku, name, slug, description, base_price, attributes)
SELECT v.id, c.id, v.sku, v.name, v.slug, v.name, v.base_price, v.attributes::jsonb
FROM (VALUES
  ('c1000001-0001-4001-8001-000000000001'::uuid, 'ferramentas', 'FUR-650-IMP', 'Furadeira de impacto 650W', 'furadeira-de-impacto-650w', 389.90, '{"imagemUrl":"https://images.pexels.com/photos/4889165/pexels-photo-4889165.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"220v","cor":"Azul","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"650 W"},{"rotulo":"Mandril","valor":"13 mm"},{"rotulo":"Cor","valor":"Azul"}]}'),
  ('c1000001-0001-4001-8001-000000000002'::uuid, 'cozinha', 'LIQ-1200-PR', 'Liquidificador 1200W', 'liquidificador-1200w', 249.90, '{"imagemUrl":"https://images.pexels.com/photos/30946794/pexels-photo-30946794.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":true,"voltagem":"220v","cor":"Preto","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"1200 W"},{"rotulo":"Capacidade","valor":"3 L"},{"rotulo":"Dimensões","valor":"22 × 20 × 42 cm"},{"rotulo":"Velocidades","valor":"12 + pulsar"},{"rotulo":"Cor","valor":"Preto"}]}'),
  ('c1000001-0001-4001-8001-000000000003'::uuid, 'climatizacao', 'VEN-40-COL', 'Ventilador de coluna 40cm', 'ventilador-de-coluna-40cm', 219.00, '{"imagemUrl":"https://images.pexels.com/photos/13983948/pexels-photo-13983948.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Branco","tamanho":"Grande","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Potência","valor":"140 W"},{"rotulo":"Velocidades","valor":"3"},{"rotulo":"Cor","valor":"Branco"}]}'),
  ('c1000001-0001-4001-8001-000000000004'::uuid, 'cozinha', 'AIR-4L-DIG', 'Air fryer 4L', 'air-fryer-4l', 429.90, '{"imagemUrl":"https://images.pexels.com/photos/35285814/pexels-photo-35285814.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":true,"voltagem":"220v","cor":"Preto","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"1500 W"},{"rotulo":"Capacidade","valor":"4 L"},{"rotulo":"Painel","valor":"Digital"},{"rotulo":"Cor","valor":"Preto"}]}'),
  ('c1000001-0001-4001-8001-000000000005'::uuid, 'ferramentas', 'PAR-12V-BIV', 'Parafusadeira 12V', 'parafusadeira-12v', 299.90, '{"imagemUrl":"https://images.pexels.com/photos/8811530/pexels-photo-8811530.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":true,"voltagem":"Bivolt","cor":"Preto","tamanho":"Compacto","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Bateria","valor":"12 V, íon-lítio"},{"rotulo":"Torque","valor":"20 Nm"},{"rotulo":"Cor","valor":"Preto"}]}'),
  ('c1000001-0001-4001-8001-000000000006'::uuid, 'cozinha', 'CAF-30-INOX', 'Cafeteira elétrica 30 xícaras', 'cafeteira-eletrica-30-xicaras', 179.90, '{"imagemUrl":"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80","oferta":false,"voltagem":"110v","cor":"Inox","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"110v"},{"rotulo":"Potência","valor":"800 W"},{"rotulo":"Capacidade","valor":"1,5 L"},{"rotulo":"Cor","valor":"Inox"}]}'),
  ('c1000001-0001-4001-8001-000000000007'::uuid, 'limpeza', 'ASP-2EM1-V', 'Aspirador vertical 2 em 1', 'aspirador-vertical-2-em-1', 359.00, '{"imagemUrl":"https://images.pexels.com/photos/9462316/pexels-photo-9462316.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"220v","cor":"Branco","tamanho":"Grande","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"1250 W"},{"rotulo":"Reservatório","valor":"0,8 L"},{"rotulo":"Cor","valor":"Branco"}]}'),
  ('c1000001-0001-4001-8001-000000000008'::uuid, 'cozinha', 'CHA-17-INOX', 'Chaleira elétrica 1,7L', 'chaleira-eletrica-1-7l', 139.90, '{"imagemUrl":"https://images.pexels.com/photos/4228994/pexels-photo-4228994.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"220v","cor":"Inox","tamanho":"Compacto","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"2200 W"},{"rotulo":"Capacidade","valor":"1,7 L"},{"rotulo":"Cor","valor":"Inox"}]}'),
  ('c1000001-0001-4001-8001-000000000009'::uuid, 'ferramentas', 'TRN-LSR-40', 'Trena a laser 40 m', 'trena-a-laser-40m', 289.90, '{"imagemUrl":"https://images.pexels.com/photos/1249659/pexels-photo-1249659.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Amarelo","tamanho":"Compacto","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Alcance","valor":"40 m"},{"rotulo":"Precisão","valor":"± 2 mm"},{"rotulo":"Cor","valor":"Amarelo"}]}'),
  ('c1000001-0001-4001-8001-000000000010'::uuid, 'iluminacao', 'LUM-LED-MESA', 'Luminária de mesa LED', 'luminaria-de-mesa-led', 119.90, '{"imagemUrl":"https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":true,"voltagem":"Bivolt","cor":"Branco","tamanho":"Compacto","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Potência","valor":"7 W"},{"rotulo":"Temperatura de cor","valor":"3000 K a 6500 K"},{"rotulo":"Cor","valor":"Branco"}]}'),
  ('c1000001-0001-4001-8001-000000000011'::uuid, 'ferramentas', 'CHV-COMB-12', 'Jogo de chaves combinadas 12 peças', 'jogo-chaves-combinadas-12-pecas', 189.90, '{"imagemUrl":"https://images.pexels.com/photos/1138418/pexels-photo-1138418.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Cromado","tamanho":"Kit","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Peças","valor":"12"},{"rotulo":"Cor","valor":"Cromado"}]}'),
  ('c1000001-0001-4001-8001-000000000012'::uuid, 'ferramentas', 'ESM-ANG-115', 'Esmerilhadeira angular 4½"', 'esmerilhadeira-angular-115', 289.90, '{"imagemUrl":"https://images.pexels.com/photos/8985617/pexels-photo-8985617.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"220v","cor":"Preto","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Disco","valor":"4½\""},{"rotulo":"Cor","valor":"Preto"}]}'),
  ('c1000001-0001-4001-8001-000000000013'::uuid, 'ferramentas', 'SRR-TT-500', 'Serra tico-tico 500W', 'serra-tico-tico-500w', 299.90, '{"imagemUrl":"https://images.pexels.com/photos/1094766/pexels-photo-1094766.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"220v","cor":"Verde","tamanho":"Médio","fichaTecnica":[{"rotulo":"Voltagem","valor":"220v"},{"rotulo":"Potência","valor":"500 W"},{"rotulo":"Cor","valor":"Verde"}]}'),
  ('c1000001-0001-4001-8001-000000000014'::uuid, 'ferramentas', 'LAM-MAD-KIT', 'Kit de lâminas para madeira', 'kit-laminas-madeira', 199.90, '{"imagemUrl":"https://images.pexels.com/photos/209251/pexels-photo-209251.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Aço","tamanho":"Kit","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Aplicação","valor":"Madeira"},{"rotulo":"Cor","valor":"Aço"}]}'),
  ('c1000001-0001-4001-8001-000000000015'::uuid, 'ferramentas', 'NVL-BOL-60', 'Nível de bolha 60 cm', 'nivel-bolha-60-cm', 199.00, '{"imagemUrl":"https://images.pexels.com/photos/585389/pexels-photo-585389.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Amarelo","tamanho":"60 cm","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Comprimento","valor":"60 cm"},{"rotulo":"Cor","valor":"Amarelo"}]}'),
  ('c1000001-0001-4001-8001-000000000016'::uuid, 'ferramentas', 'BRC-30', 'Caixa de brocas 30 peças', 'caixa-brocas-30-pecas', 121.40, '{"imagemUrl":"https://images.pexels.com/photos/5853932/pexels-photo-5853932.jpeg?auto=compress&cs=tinysrgb&w=800","oferta":false,"voltagem":"Bivolt","cor":"Aço","tamanho":"Kit","fichaTecnica":[{"rotulo":"Voltagem","valor":"Bivolt"},{"rotulo":"Peças","valor":"30"},{"rotulo":"Cor","valor":"Aço"}]}')
) AS v(id, category_slug, sku, name, slug, base_price, attributes)
JOIN ecommerce.categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO UPDATE
  SET category_id = EXCLUDED.category_id,
      sku = EXCLUDED.sku,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      base_price = EXCLUDED.base_price,
      attributes = EXCLUDED.attributes,
      is_active = TRUE,
      deleted_at = NULL;

-- ---------------------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------------------

INSERT INTO ecommerce.inventory (product_id, quantity, reserved_quantity)
SELECT p.id, v.quantity, 0
FROM (VALUES
  ('furadeira-de-impacto-650w'::citext, 8),
  ('liquidificador-1200w', 12),
  ('ventilador-de-coluna-40cm', 5),
  ('air-fryer-4l', 3),
  ('parafusadeira-12v', 10),
  ('cafeteira-eletrica-30-xicaras', 0),
  ('aspirador-vertical-2-em-1', 6),
  ('chaleira-eletrica-1-7l', 20),
  ('trena-a-laser-40m', 4),
  ('luminaria-de-mesa-led', 15),
  ('jogo-chaves-combinadas-12-pecas', 12),
  ('esmerilhadeira-angular-115', 8),
  ('serra-tico-tico-500w', 7),
  ('kit-laminas-madeira', 10),
  ('nivel-bolha-60-cm', 14),
  ('caixa-brocas-30-pecas', 25)
) AS v(slug, quantity)
JOIN ecommerce.products p ON p.slug = v.slug
ON CONFLICT (product_id) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      reserved_quantity = 0;

-- ---------------------------------------------------------------------------
-- Cliente demo + endereços (mock de enderecos.service)
-- Senha: SenhaDemo123!
-- ---------------------------------------------------------------------------

INSERT INTO ecommerce.users (id, full_name, email, password_hash, document_number, phone, role)
VALUES (
  'b0000001-0001-4001-8001-000000000001'::uuid,
  'Cliente Demo',
  'cliente.demo@exemplo.com',
  '$2b$10$mdoVP93vZnA1rTu77./uD.jXjps6wlQ9.uHKDiMszUmSUdA4/TDZW',
  '52998224725',
  '+5561999887766',
  'CLIENTE'
)
ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      password_hash = EXCLUDED.password_hash,
      document_number = EXCLUDED.document_number,
      phone = EXCLUDED.phone,
      is_active = TRUE,
      deleted_at = NULL;

INSERT INTO ecommerce.addresses (
  id, user_id, zip_code, street, number, complement, neighborhood, city, state, is_default
)
VALUES
  (
    'd0000001-0001-4001-8001-000000000001'::uuid,
    'b0000001-0001-4001-8001-000000000001'::uuid,
    '72000000',
    'Rua das Acácias',
    '123',
    'Apto 45',
    'Centro',
    'Brasília',
    'DF',
    TRUE
  ),
  (
    'd0000001-0001-4001-8001-000000000002'::uuid,
    'b0000001-0001-4001-8001-000000000001'::uuid,
    '72870000',
    'Avenida Brasil',
    '1000',
    'Sala 210',
    'Jardim América',
    'Valparaíso de Goiás',
    'GO',
    FALSE
  )
ON CONFLICT (id) DO UPDATE
  SET zip_code = EXCLUDED.zip_code,
      street = EXCLUDED.street,
      number = EXCLUDED.number,
      complement = EXCLUDED.complement,
      neighborhood = EXCLUDED.neighborhood,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      is_default = EXCLUDED.is_default,
      deleted_at = NULL;

COMMIT;
