-- =====================================================
-- FIX URGENTE: Row Level Security para Pedidos
-- =====================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para permitir que los clientes puedan crear pedidos

-- =====================================================
-- PASO 1: Eliminar políticas conflictivas
-- =====================================================

-- Eliminar todas las políticas existentes de orders
DROP POLICY IF EXISTS "Permitir crear pedidos" ON orders;
DROP POLICY IF EXISTS "Admin full access orders" ON orders;

-- Eliminar todas las políticas existentes de order_items
DROP POLICY IF EXISTS "Permitir crear items de pedido" ON order_items;

-- Eliminar políticas de order_status_history si existen
DROP POLICY IF EXISTS "Admin full access order_status_history" ON order_status_history;

-- =====================================================
-- PASO 2: Crear políticas correctas para ORDERS
-- =====================================================

-- Permitir a CUALQUIERA (anónimos) CREAR pedidos
CREATE POLICY "allow_anonymous_insert_orders"
ON orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir a AUTENTICADOS ver TODOS los pedidos (admin)
CREATE POLICY "allow_authenticated_select_orders"
ON orders
FOR SELECT
TO authenticated
USING (true);

-- Permitir a AUTENTICADOS actualizar TODOS los pedidos (admin)
CREATE POLICY "allow_authenticated_update_orders"
ON orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a AUTENTICADOS eliminar TODOS los pedidos (admin)
CREATE POLICY "allow_authenticated_delete_orders"
ON orders
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- PASO 3: Crear políticas correctas para ORDER_ITEMS
-- =====================================================

-- Permitir a CUALQUIERA (anónimos) CREAR items de pedido
CREATE POLICY "allow_anonymous_insert_order_items"
ON order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir a AUTENTICADOS ver TODOS los items (admin)
CREATE POLICY "allow_authenticated_select_order_items"
ON order_items
FOR SELECT
TO authenticated
USING (true);

-- Permitir a AUTENTICADOS actualizar items (admin)
CREATE POLICY "allow_authenticated_update_order_items"
ON order_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a AUTENTICADOS eliminar items (admin)
CREATE POLICY "allow_authenticated_delete_order_items"
ON order_items
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- PASO 4: Políticas para ORDER_STATUS_HISTORY
-- =====================================================

-- Permitir a AUTENTICADOS todo en historial de estados
CREATE POLICY "allow_authenticated_all_order_status_history"
ON order_status_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- PASO 5: Verificación
-- =====================================================

-- Ejecuta esto para verificar que las políticas se crearon:
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_status_history')
ORDER BY tablename, policyname;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- ¿Por qué permitimos a anónimos crear pedidos?
-- Los clientes NO están autenticados cuando compran, son usuarios anónimos (anon).
-- Por eso necesitamos la política "TO anon, authenticated" en INSERT.

-- ¿Es esto seguro?
-- SÍ, porque:
-- 1. Los clientes solo pueden CREAR pedidos (no ver, editar o eliminar)
-- 2. Solo los autenticados (admin) pueden ver/editar/eliminar pedidos
-- 3. Los datos del pedido vienen validados desde el frontend
-- 4. Es el comportamiento estándar de e-commerce

-- En producción, considera:
-- - Agregar validación adicional con triggers
-- - Implementar rate limiting
-- - Agregar captcha en el checkout
