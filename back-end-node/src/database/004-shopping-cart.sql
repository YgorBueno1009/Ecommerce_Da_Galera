BEGIN;

CREATE TABLE IF NOT EXISTS ecommerce.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES ecommerce.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecommerce.cart_items (
    cart_id UUID NOT NULL REFERENCES ecommerce.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ecommerce.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
    ON ecommerce.cart_items(product_id);

GRANT SELECT, INSERT, UPDATE ON ecommerce.carts, ecommerce.cart_items
    TO ecommerce_app_group;
GRANT DELETE ON ecommerce.cart_items TO ecommerce_app_group;

COMMIT;
