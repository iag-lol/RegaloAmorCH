/* =====================================================
   CONFIGURACION GENERAL DE LA TIENDA
   ===================================================== */

const CONFIG = {
    // Informacion de la tienda
    store: {
        name: 'Regalo Amor',
        slogan: 'Regalos que Enamoran',
        phone: '+56984752936',
        email: 'contacto@regaloamor.cl',
        whatsapp: '56984752936',
        address: 'Santiago, Region Metropolitana, Chile',
        currency: 'CLP',
        currencySymbol: '$',
        taxRate: 0.19, // IVA Chile 19%
        timezone: 'America/Santiago'
    },

    // Supabase - REEMPLAZAR con tus credenciales
    supabase: {
        url: 'https://oiaitmtnpwsstggiluep.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWl0bXRucHdzc3RnZ2lsdWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzQzNzAsImV4cCI6MjA3OTUxMDM3MH0.l-TgK4nKi3glLwVP1fIbWmOLTURmc9VOqATD7CBfZ4c'
    },

    // Configuracion de envio por comuna (Region Metropolitana)
    shipping: {
        default: 4990,
        free_threshold: 50000, // Envio gratis sobre este monto
        zones: {
            // Zona Centro
            'Santiago': 3990,
            'Providencia': 3990,
            'Las Condes': 4490,
            'Vitacura': 4990,
            'Nunoa': 3990,
            'La Reina': 4490,
            'Macul': 3990,
            'Penalolen': 4490,
            'La Florida': 4490,
            'San Joaquin': 3990,
            'San Miguel': 3990,
            'La Granja': 4490,
            'La Pintana': 4990,
            'El Bosque': 4490,
            'San Ramon': 4490,
            'La Cisterna': 3990,
            'Pedro Aguirre Cerda': 3990,
            'Lo Espejo': 4490,
            'Cerrillos': 4490,
            'Maipu': 4990,
            'Estacion Central': 3990,
            'Quinta Normal': 3990,
            'Lo Prado': 4490,
            'Pudahuel': 4990,
            'Cerro Navia': 4490,
            'Renca': 4490,
            'Conchali': 3990,
            'Huechuraba': 4490,
            'Recoleta': 3990,
            'Independencia': 3990,
            'Quilicura': 4990,
            // Zona Oriente
            'Lo Barnechea': 5490,
            // Zona Sur
            'Puente Alto': 5490,
            'San Bernardo': 5490,
            // Otras comunas
            'Otros': 5990
        }
    },

    // Configuracion de productos
    products: {
        perPage: 12,
        maxImages: 5,
        maxImageSize: 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp']
    },

    // Estados de pedidos
    orderStatus: {
        'pending': { label: 'Pendiente', color: '#ff9800', icon: 'clock' },
        'confirmed': { label: 'Confirmado', color: '#2196f3', icon: 'check-circle' },
        'preparing': { label: 'En Preparacion', color: '#9c27b0', icon: 'cog' },
        'ready': { label: 'Listo', color: '#4caf50', icon: 'box' },
        'shipped': { label: 'Despachado', color: '#00bcd4', icon: 'truck' },
        'delivered': { label: 'Entregado', color: '#4caf50', icon: 'check-double' },
        'cancelled': { label: 'Cancelado', color: '#f44336', icon: 'times-circle' }
    },

    // Plantillas de emails
    emailTemplates: {
        orderConfirmation: {
            subject: 'Pedido Confirmado! - Regalo Amor #{{orderNumber}}',
            template: 'order_confirmation'
        },
        orderPreparing: {
            subject: 'Tu pedido esta en preparacion - Regalo Amor #{{orderNumber}}',
            template: 'order_preparing'
        },
        orderReady: {
            subject: 'Tu pedido esta listo! - Regalo Amor #{{orderNumber}}',
            template: 'order_ready'
        },
        orderShipped: {
            subject: 'Tu pedido va en camino! - Regalo Amor #{{orderNumber}}',
            template: 'order_shipped'
        },
        orderDelivered: {
            subject: 'Pedido entregado! - Regalo Amor #{{orderNumber}}',
            template: 'order_delivered'
        },
        orderCancelled: {
            subject: 'Pedido cancelado - Regalo Amor #{{orderNumber}}',
            template: 'order_cancelled'
        }
    },

    // Comunas de Santiago (Region Metropolitana)
    comunas: [
        'Santiago', 'Providencia', 'Las Condes', 'Vitacura', 'Nunoa',
        'La Reina', 'Macul', 'Penalolen', 'La Florida', 'San Joaquin',
        'San Miguel', 'La Granja', 'La Pintana', 'El Bosque', 'San Ramon',
        'La Cisterna', 'Pedro Aguirre Cerda', 'Lo Espejo', 'Cerrillos',
        'Maipu', 'Estacion Central', 'Quinta Normal', 'Lo Prado',
        'Pudahuel', 'Cerro Navia', 'Renca', 'Conchali', 'Huechuraba',
        'Recoleta', 'Independencia', 'Quilicura', 'Lo Barnechea',
        'Puente Alto', 'San Bernardo', 'Colina', 'Lampa', 'Buin',
        'Paine', 'Calera de Tango', 'Talagante', 'Penaflor', 'El Monte',
        'Isla de Maipo', 'Padre Hurtado', 'Melipilla'
    ],

    // Informacion del modal informativo
    infoModals: {
        shipping: {
            title: 'Envios y Entregas',
            content: `
                <h4>Zonas de Envio</h4>
                <p>Realizamos envios a toda la Region Metropolitana de Santiago.</p>

                <h4>Costos de Envio</h4>
                <ul>
                    <li>Zona Centro: desde $3.990</li>
                    <li>Zona Periferica: desde $4.490</li>
                    <li>Comunas alejadas: desde $4.990</li>
                </ul>

                <h4>Envio Gratis</h4>
                <p>Envio gratis en compras sobre $50.000!</p>

                <h4>Tiempos de Entrega</h4>
                <ul>
                    <li>Elaboracion: 2-3 dias habiles</li>
                    <li>Envio: 1-2 dias habiles adicionales</li>
                </ul>

                <p><strong>Nota:</strong> Los tiempos pueden variar segun la personalizacion y la demanda.</p>
            `
        },
        payments: {
            title: 'Metodos de Pago',
            content: `
                <h4>Aceptamos</h4>
                <ul>
                    <li><strong>Transferencia Bancaria:</strong> Banco Estado, BCI, Santander</li>
                    <li><strong>WebPay:</strong> Tarjetas de debito y credito</li>
                    <li><strong>Mercado Pago:</strong> Todas las opciones disponibles</li>
                </ul>

                <h4>Proceso de Pago</h4>
                <ol>
                    <li>Realiza tu pedido por WhatsApp</li>
                    <li>Te enviamos los datos de pago</li>
                    <li>Confirmas el pago enviando el comprobante</li>
                    <li>Comenzamos a preparar tu regalo!</li>
                </ol>

                <p><strong>Seguridad:</strong> Todos los pagos son 100% seguros.</p>
            `
        },
        faq: {
            title: 'Preguntas Frecuentes',
            content: `
                <div class="faq-item">
                    <h4>Cuanto demora mi pedido?</h4>
                    <p>Los productos personalizados tardan entre 2-3 dias habiles en elaborarse, mas el tiempo de envio.</p>
                </div>

                <div class="faq-item">
                    <h4>Puedo ver un preview antes de producir?</h4>
                    <p>Si! Te enviamos una muestra digital por WhatsApp para tu aprobacion antes de comenzar.</p>
                </div>

                <div class="faq-item">
                    <h4>Que formato de imagen necesito?</h4>
                    <p>Preferimos imagenes en alta resolucion (JPG o PNG). Mientras mayor calidad, mejor resultado.</p>
                </div>

                <div class="faq-item">
                    <h4>Hacen envios a regiones?</h4>
                    <p>Actualmente solo despachamos en la Region Metropolitana. Pronto mas zonas.</p>
                </div>

                <div class="faq-item">
                    <h4>Puedo retirar personalmente?</h4>
                    <p>Si, coordinamos el retiro por WhatsApp sin costo adicional.</p>
                </div>
            `
        },
        terms: {
            title: 'Terminos y Condiciones',
            content: `
                <h4>1. Productos</h4>
                <p>Todos los productos son personalizados segun las indicaciones del cliente. Las imagenes referenciales pueden variar ligeramente del producto final.</p>

                <h4>2. Pedidos</h4>
                <p>Los pedidos se confirman una vez recibido el pago. No se aceptan cancelaciones una vez iniciada la produccion.</p>

                <h4>3. Entregas</h4>
                <p>Los plazos de entrega son estimados y pueden variar segun la demanda y ubicacion.</p>

                <h4>4. Cambios y Devoluciones</h4>
                <p>Por ser productos personalizados, no se aceptan devoluciones excepto por defectos de fabricacion.</p>

                <h4>5. Propiedad Intelectual</h4>
                <p>El cliente debe ser dueno o tener autorizacion de las imagenes proporcionadas.</p>
            `
        },
        privacy: {
            title: 'Politica de Privacidad',
            content: `
                <h4>Datos Recopilados</h4>
                <p>Recopilamos nombre, email, telefono y direccion necesarios para procesar tu pedido.</p>

                <h4>Uso de Datos</h4>
                <ul>
                    <li>Procesar y entregar pedidos</li>
                    <li>Comunicacion sobre estado del pedido</li>
                    <li>Mejorar nuestros servicios</li>
                </ul>

                <h4>Proteccion</h4>
                <p>Tus datos estan protegidos y no son compartidos con terceros, excepto para la entrega de pedidos.</p>

                <h4>Imagenes</h4>
                <p>Las imagenes proporcionadas son usadas exclusivamente para tu pedido y eliminadas despues de completado.</p>

                <h4>Contacto</h4>
                <p>Para consultas sobre privacidad: contacto@regaloamor.cl</p>
            `
        }
    }
};

// Congelar configuracion para evitar modificaciones accidentales
Object.freeze(CONFIG);
Object.freeze(CONFIG.store);
Object.freeze(CONFIG.supabase);
Object.freeze(CONFIG.shipping);
Object.freeze(CONFIG.products);
Object.freeze(CONFIG.orderStatus);
