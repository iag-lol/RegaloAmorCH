# Configuración de Supabase para Regalo Amor

## 1. Configurar Storage (Bucket de Imágenes)

### Crear el Bucket

1. Ve a tu proyecto de Supabase
2. En el menú lateral, selecciona **Storage**
3. Clic en **New bucket**
4. Configuración:
   ```
   Name: product-images
   Public bucket: ✅ YES (activado)
   ```
5. Clic en **Create bucket**

### Configurar Políticas de Acceso (RLS)

Después de crear el bucket, necesitas configurar las políticas:

1. Haz clic en el bucket `product-images`
2. Ve a la pestaña **Policies**
3. Crea las siguientes políticas:

#### Política 1: Lectura Pública
```
Policy name: Public Read Access
Allowed operation: SELECT
Target roles: public
USING expression: true
```

#### Política 2: Subida Pública (temporal para desarrollo)
```
Policy name: Public Insert Access
Allowed operation: INSERT
Target roles: public
WITH CHECK expression: true
```

**Nota:** En producción deberías restringir esto solo a usuarios autenticados.

### SQL Alternativo (Más Rápido)

Ejecuta esto en el **SQL Editor** de Supabase:

```sql
-- Crear bucket público si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política para lectura pública
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Política para subida pública
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );

-- Política para eliminar (solo autenticados)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-images' AND auth.role() = 'authenticated' );
```

## 2. Configurar Row Level Security (RLS) en Tablas

### Deshabilitar RLS temporalmente (Para desarrollo)

```sql
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_images DISABLE ROW LEVEL SECURITY;
```

### O Crear Políticas Públicas (Recomendado)

```sql
-- Habilitar RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Políticas para categories
CREATE POLICY "Allow public read access on categories"
ON categories FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on categories"
ON categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on categories"
ON categories FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on categories"
ON categories FOR DELETE USING (true);

-- Políticas para products
CREATE POLICY "Allow public read access on products"
ON products FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on products"
ON products FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on products"
ON products FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on products"
ON products FOR DELETE USING (true);

-- Políticas para product_images
CREATE POLICY "Allow public read access on product_images"
ON product_images FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on product_images"
ON product_images FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on product_images"
ON product_images FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on product_images"
ON product_images FOR DELETE USING (true);
```

## 3. Configurar CORS en Render

Cuando despliegues en Render, asegúrate de agregar la URL en Supabase:

1. Ve a **Settings** → **API**
2. En **Site URL**, agrega: `https://tu-sitio.onrender.com`
3. En **Redirect URLs**, agrega: `https://tu-sitio.onrender.com/**`

## 4. Verificar Configuración

### Prueba de Bucket
1. Ve a Storage → product-images
2. Intenta subir una imagen manualmente
3. Verifica que obtengas una URL pública como:
   ```
   https://abcdefghijk.supabase.co/storage/v1/object/public/product-images/test.jpg
   ```

### Prueba de Políticas
1. Abre la consola del navegador (F12)
2. Ejecuta:
   ```javascript
   const { data } = await supabase.from('products').select('*');
   console.log(data);
   ```
3. Si no da error 401, está bien configurado

## 5. Estructura de Imágenes en el Bucket

Las imágenes se organizan así:
```
product-images/
├── products/
│   ├── 1234567890-abc123.jpg    (imagen principal)
│   ├── 1234567891-def456.jpg    (imagen adicional 1)
│   └── 1234567892-ghi789.jpg    (imagen adicional 2)
```

## Troubleshooting

### Error: "new row violates row-level security policy"
→ Ejecuta los comandos de RLS de la sección 2

### Error: "The resource you are looking for could not be found"
→ Verifica que el bucket `product-images` exista y sea público

### Error: "Invalid API key"
→ Verifica que `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén correctos en `js/config.js`

### Las imágenes no cargan en la web
→ Verifica que las políticas de Storage permitan lectura pública
