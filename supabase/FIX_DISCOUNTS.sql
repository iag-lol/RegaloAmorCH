-- =====================================================
-- FIX: Políticas para Descuentos por Cantidad
-- =====================================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para permitir que el admin guarde descuentos

-- =====================================================
-- NOTA: La política de SELECT ya existe, solo agregamos las que faltan
-- =====================================================

-- Eliminar políticas existentes si hay conflictos
DROP POLICY IF EXISTS "Admin can insert discounts" ON product_quantity_discounts;
DROP POLICY IF EXISTS "Admin can update discounts" ON product_quantity_discounts;
DROP POLICY IF EXISTS "Admin can delete discounts" ON product_quantity_discounts;
DROP POLICY IF EXISTS "Admin full access discounts" ON product_quantity_discounts;

-- =====================================================
-- Crear políticas para que ADMIN pueda gestionar descuentos
-- =====================================================

-- Permitir a AUTENTICADOS (admin) INSERTAR descuentos
CREATE POLICY "allow_authenticated_insert_discounts"
ON product_quantity_discounts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir a AUTENTICADOS (admin) ACTUALIZAR descuentos
CREATE POLICY "allow_authenticated_update_discounts"
ON product_quantity_discounts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir a AUTENTICADOS (admin) ELIMINAR descuentos
CREATE POLICY "allow_authenticated_delete_discounts"
ON product_quantity_discounts
FOR DELETE
TO authenticated
USING (true);

-- =====================================================
-- Verificación
-- =====================================================

-- Ejecuta esto para ver todas las políticas de descuentos:
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'product_quantity_discounts'
ORDER BY policyname;

-- Deberías ver:
-- 1. "Descuentos visibles publicamente" - SELECT - {public}
-- 2. "allow_authenticated_insert_discounts" - INSERT - {authenticated}
-- 3. "allow_authenticated_update_discounts" - UPDATE - {authenticated}
-- 4. "allow_authenticated_delete_discounts" - DELETE - {authenticated}
