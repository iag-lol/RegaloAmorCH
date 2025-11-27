# Regalo Amor - Tienda de Personalizados

Tienda online completa para productos personalizados con panel administrativo, carrito de compra, sistema de valoraciones y conexion a WhatsApp.

## Caracteristicas

### Frontend Publico
- Diseno responsive mobile-first
- Hero con carrusel de imagenes
- Catalogo de productos con filtros
- Carrito de compra con personalizacion (texto + imagen)
- Sistema de valoraciones 1-5 estrellas
- Formulario de contacto
- Integracion WhatsApp para pedidos
- SEO optimizado para Chile/Santiago

### Panel Administrativo
- Dashboard con metricas
- Gestion de productos (CRUD)
- Gestion de categorias
- Control de pedidos con estados
- Aprobacion de resenas
- Gestion de clientes
- Analiticas de ventas
- Control SII/IVA
- Configuracion de la tienda

## Configuracion

### 1. Supabase

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Ir a SQL Editor y ejecutar el script `supabase/schema.sql`
4. Copiar URL y Anon Key desde Settings > API

### 2. Configurar credenciales

Editar `js/config.js`:

```javascript
supabase: {
    url: 'TU_URL_DE_SUPABASE',
    anonKey: 'TU_ANON_KEY_DE_SUPABASE'
}
```

### 3. Configurar WhatsApp

En `js/config.js`, cambiar el numero:

```javascript
store: {
    whatsapp: '56984752936', // Tu numero sin +
    // ...
}
```

### 4. Personalizar

- Cambiar logo y favicon en `assets/images/`
- Modificar colores en `css/styles.css` (variables CSS)
- Actualizar redes sociales en `index.html`
- Configurar dominio en las meta tags SEO

## Despliegue en GitHub Pages

1. Crear repositorio en GitHub
2. Subir archivos:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

3. Ir a Settings > Pages
4. Seleccionar branch `main` y carpeta `/ (root)`
5. Tu sitio estara en: `https://TU_USUARIO.github.io/TU_REPO/`

## Estructura del Proyecto

```
nueva regalo amor/
├── index.html          # Pagina principal
├── admin.html          # Panel administrativo
├── manifest.json       # PWA manifest
├── css/
│   ├── styles.css      # Estilos principales
│   └── admin.css       # Estilos del admin
├── js/
│   ├── config.js       # Configuracion
│   ├── supabase-client.js
│   ├── utils.js        # Utilidades
│   ├── cart.js         # Carrito
│   ├── products.js     # Productos
│   ├── reviews.js      # Valoraciones
│   ├── app.js          # App principal
│   └── admin.js        # Panel admin
├── assets/
│   └── images/         # Imagenes
└── supabase/
    └── schema.sql      # Esquema BD
```

## Acceso Admin

- URL: `/admin.html`
- Demo: `admin@regaloamor.cl` / `admin123`

## Flujo de Pedidos

1. Cliente agrega productos al carrito
2. Personaliza cada producto (texto/imagen)
3. Completa datos de envio
4. Se redirige a WhatsApp con el pedido
5. Admin confirma y cambia estados
6. Sistema envia emails automaticos (requiere configurar)

## Estados de Pedido

- **Pendiente**: Pedido recibido
- **Confirmado**: Pago verificado
- **En Preparacion**: Produciendo
- **Listo**: Terminado
- **Despachado**: En camino
- **Entregado**: Completado
- **Cancelado**: Anulado

## Emails Automaticos

Para habilitar emails automaticos, configurar:
1. Supabase Edge Functions, o
2. Servicio externo (SendGrid, Resend)

## Control SII/IVA

El panel admin incluye seccion para:
- Ver ventas por mes
- Calcular IVA (19%)
- Generar informes para declaracion

## Tecnologias

- HTML5, CSS3, JavaScript ES6+
- Supabase (PostgreSQL + Auth)
- Swiper.js (carruseles)
- Font Awesome (iconos)
- Google Fonts (tipografias)

## Soporte

WhatsApp: +56 9 8475 2936
Email: contacto@regaloamor.cl

---

Desarrollado con amor para emprendedores chilenos
