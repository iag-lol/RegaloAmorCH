-- =====================================================
-- REGALO AMOR - Esquema de Base de Datos Supabase
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. CATEGORIAS
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),
    position INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    discount INTEGER DEFAULT 0,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    sales_count INTEGER DEFAULT 0,
    stock INTEGER DEFAULT -1, -- -1 = sin limite
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. IMAGENES DE PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(200),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. DESCUENTOS POR CANTIDAD
-- =====================================================
CREATE TABLE IF NOT EXISTS product_quantity_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    discount_percentage INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PEDIDOS
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_rut VARCHAR(15),
    shipping_address TEXT NOT NULL,
    shipping_comuna VARCHAR(100) NOT NULL,
    shipping_city VARCHAR(100) DEFAULT 'Santiago',
    subtotal INTEGER NOT NULL,
    shipping_cost INTEGER NOT NULL,
    total INTEGER NOT NULL,
    iva INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    payment_method VARCHAR(50),
    payment_confirmed BOOLEAN DEFAULT false,
    payment_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estados: pending, confirmed, preparing, ready, shipped, delivered, cancelled

-- =====================================================
-- 6. ITEMS DE PEDIDO
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    customization_text TEXT,
    customization_image_url TEXT,
    customization_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. HISTORIAL DE ESTADOS DE PEDIDO
-- =====================================================
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(200)
);

-- =====================================================
-- 8. RESENAS/VALORACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    customer_name VARCHAR(200) NOT NULL,
    customer_email VARCHAR(200) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(200)
);

-- =====================================================
-- 9. CLIENTES (para seguimiento)
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) NOT NULL UNIQUE,
    name VARCHAR(200),
    phone VARCHAR(20),
    rut VARCHAR(15),
    total_orders INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_order_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. MENSAJES DE CONTACTO
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. CONFIGURACION DE LA TIENDA
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. TARIFAS DE ENVIO POR COMUNA
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comuna VARCHAR(100) NOT NULL UNIQUE,
    price INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Funcion para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funcion para incrementar ventas de producto
CREATE OR REPLACE FUNCTION increment_sales(product_id UUID, qty INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE products SET sales_count = sales_count + qty WHERE id = product_id;
END;
$$ language 'plpgsql';

-- Funcion para actualizar cliente despues de un pedido
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customers (email, name, phone, rut, total_orders, total_spent, last_order_at)
    VALUES (NEW.customer_email, NEW.customer_name, NEW.customer_phone, NEW.customer_rut, 1, NEW.total, NOW())
    ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        total_orders = customers.total_orders + 1,
        total_spent = customers.total_spent + EXCLUDED.total_spent,
        last_order_at = NOW(),
        updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_on_order AFTER INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_quantity_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

-- Politicas publicas (lectura)
CREATE POLICY "Categorias visibles publicamente" ON categories
    FOR SELECT USING (active = true);

CREATE POLICY "Productos visibles publicamente" ON products
    FOR SELECT USING (active = true);

CREATE POLICY "Imagenes visibles publicamente" ON product_images
    FOR SELECT USING (true);

CREATE POLICY "Descuentos visibles publicamente" ON product_quantity_discounts
    FOR SELECT USING (true);

CREATE POLICY "Reviews aprobadas visibles" ON reviews
    FOR SELECT USING (approved = true);

CREATE POLICY "Tarifas de envio visibles" ON shipping_zones
    FOR SELECT USING (active = true);

-- Politicas para insertar (anon)
CREATE POLICY "Permitir crear pedidos" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir crear items de pedido" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir crear reviews" ON reviews
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir crear contactos" ON contacts
    FOR INSERT WITH CHECK (true);

-- Politicas para admin (authenticated)
CREATE POLICY "Admin full access categories" ON categories
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access orders" ON orders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin full access reviews" ON reviews
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar categorias iniciales
INSERT INTO categories (name, slug, image, position) VALUES
('Tazas', 'tazas', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400', 1),
('Cojines', 'cojines', 'https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=400', 2),
('Poleras', 'poleras', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 3),
('Cuadros', 'cuadros', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=400', 4),
('Puzzles', 'puzzles', 'https://images.unsplash.com/photo-1606503153255-59d7b7e29768?w=400', 5),
('Accesorios', 'accesorios', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', 6),
('Hogar', 'hogar', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', 7)
ON CONFLICT (slug) DO NOTHING;

-- Insertar tarifas de envio
INSERT INTO shipping_zones (comuna, price) VALUES
('Santiago', 3990),
('Providencia', 3990),
('Las Condes', 4490),
('Vitacura', 4990),
('Nunoa', 3990),
('La Reina', 4490),
('Macul', 3990),
('Penalolen', 4490),
('La Florida', 4490),
('Maipu', 4990),
('Puente Alto', 5490),
('San Bernardo', 5490),
('Quilicura', 4990),
('Huechuraba', 4490),
('Recoleta', 3990),
('Independencia', 3990),
('Estacion Central', 3990),
('Quinta Normal', 3990)
ON CONFLICT (comuna) DO NOTHING;

-- Insertar configuracion inicial
INSERT INTO settings (key, value) VALUES
('store_name', '"Regalo Amor"'),
('store_phone', '"+56984752936"'),
('store_email', '"contacto@regaloamor.cl"'),
('free_shipping_threshold', '50000'),
('default_shipping', '4990'),
('tax_rate', '0.19')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- INDICES PARA OPTIMIZACION
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =====================================================
-- 13. DEVICE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS device_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_agent TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE device_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access device_tracking" ON device_tracking
    FOR ALL USING (auth.role() = 'authenticated');

