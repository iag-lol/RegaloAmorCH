/* =====================================================
   CLIENTE SUPABASE
   ===================================================== */

// Inicializar Supabase
let supabase = null;

// Construye URL pública de storage si solo viene la ruta
function buildPublicUrl(path) {
    if (!path) return null;
    // Dejar intactas las data URLs o blobs generadas en el cliente
    if (/^(data:|blob:)/i.test(path)) return path;
    if (/^https?:\/\//i.test(path)) return path;
    const base = `${CONFIG.supabase.url}/storage/v1/object/public`.replace(/\/+$/, '');
    const cleanPath = String(path).replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
}

function initSupabase() {
    if (CONFIG.supabase.url === 'TU_SUPABASE_URL') {
        console.warn('Supabase no configurado. Usando datos de demostracion.');
        return null;
    }

    try {
        supabase = window.supabase.createClient(
            CONFIG.supabase.url,
            CONFIG.supabase.anonKey
        );
        return supabase;
    } catch (error) {
        console.error('Error inicializando Supabase:', error);
        return null;
    }
}

// =====================================================
// Funciones de Productos
// =====================================================

async function getProducts(options = {}) {
    const {
        category = null,
        limit = CONFIG.products.perPage,
        offset = 0,
        sort = 'newest',
        search = null,
        active = true
    } = options;

    // Si no hay Supabase, usar datos demo
    if (!supabase) {
        return getDemoProducts(options);
    }

    try {
        let query = supabase
            .from('products')
            .select(`
                *,
                category:categories(id, name, slug),
                images:product_images(id, url, position),
                reviews:reviews(rating),
                quantity_discounts:product_quantity_discounts(min_quantity, discount_percentage)
            `)
            .eq('active', active);

        if (category && category !== 'todos') {
            query = query.eq('category_id', category);
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Ordenamiento
        switch (sort) {
            case 'price-low':
                query = query.order('price', { ascending: true });
                break;
            case 'price-high':
                query = query.order('price', { ascending: false });
                break;
            case 'popular':
                query = query.order('sales_count', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        // Calcular rating promedio
        const productsWithRating = data.map(product => {
            const productImages = Array.isArray(product.images)
                ? product.images.map(img => ({ ...img, url: buildPublicUrl(img.url) }))
                : [];

            return {
                ...product,
                image: buildPublicUrl(product.image),
                images: productImages,
                avg_rating: product.reviews.length > 0
                    ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
                    : 0,
                review_count: product.reviews.length
            };
        });

        return { products: productsWithRating, total: count };
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        return getDemoProducts(options);
    }
}

async function getProductById(id) {
    if (!supabase) {
        return getDemoProducts().products.find(p => p.id === id) || null;
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                category:categories(id, name, slug),
                images:product_images(id, url, position),
                reviews:reviews(
                    id, rating, comment, customer_name, created_at, approved
                ),
                quantity_discounts:product_quantity_discounts(
                    id, min_quantity, discount_percentage
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Filtrar solo reviews aprobadas para publico
        data.reviews = data.reviews.filter(r => r.approved);

        // Normalizar URLs de imágenes
        data.image = buildPublicUrl(data.image);
        data.images = Array.isArray(data.images)
            ? data.images.map(img => ({ ...img, url: buildPublicUrl(img.url) }))
            : [];

        // Calcular rating promedio
        data.avg_rating = data.reviews.length > 0
            ? data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
            : 0;
        data.review_count = data.reviews.length;

        return data;
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        return null;
    }
}

// =====================================================
// Funciones de Categorias
// =====================================================

async function getCategories() {
    if (!supabase) {
        return getDemoCategories();
    }

    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*, products:products(count)')
            .eq('active', true)
            .order('position');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo categorias:', error);
        return getDemoCategories();
    }
}

// =====================================================
// Funciones de Reviews
// =====================================================

async function getApprovedReviews(limit = 10) {
    if (!supabase) {
        return getDemoReviews();
    }

    try {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                product:products(id, name)
            `)
            .eq('approved', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo reviews:', error);
        return getDemoReviews();
    }
}

async function submitReview(reviewData) {
    if (!supabase) {
        console.log('Review enviada (demo):', reviewData);
        return { success: true, message: 'Gracias por tu opinion. Sera revisada antes de publicarse.' };
    }

    try {
        const { error } = await supabase
            .from('reviews')
            .insert({
                product_id: reviewData.product_id,
                customer_name: reviewData.name,
                customer_email: reviewData.email,
                rating: reviewData.rating,
                comment: reviewData.comment,
                approved: false
            });

        if (error) throw error;
        return { success: true, message: 'Gracias por tu opinion. Sera revisada antes de publicarse.' };
    } catch (error) {
        console.error('Error enviando review:', error);
        return { success: false, message: 'Error al enviar tu opinion. Por favor intenta nuevamente.' };
    }
}

// =====================================================
// Funciones de Pedidos
// =====================================================

async function createOrder(orderData) {
    if (!supabase) {
        const orderNumber = 'RA-' + Date.now().toString().slice(-6);
        console.log('Pedido creado (demo):', { ...orderData, order_number: orderNumber });
        return { success: true, order_number: orderNumber };
    }

    try {
        // Generar numero de orden
        const orderNumber = 'RA-' + Date.now().toString().slice(-6);

        // Calcular totales
        const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = orderData.shipping_cost;
        const total = subtotal + shipping;
        const iva = Math.round(total * CONFIG.store.taxRate / (1 + CONFIG.store.taxRate));

        // Crear orden
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                customer_name: orderData.customer.name,
                customer_email: orderData.customer.email,
                customer_phone: orderData.customer.phone,
                customer_rut: orderData.customer.rut || null,
                shipping_address: orderData.customer.address,
                shipping_comuna: orderData.customer.comuna,
                shipping_city: orderData.customer.city,
                subtotal: subtotal,
                shipping_cost: shipping,
                total: total,
                iva: iva,
                status: 'pending',
                notes: orderData.notes || null
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // Crear items de la orden
        const orderItems = orderData.items.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            customization_text: item.customization?.text || null,
            customization_image_url: item.customization?.imageUrl || null,
            customization_notes: item.customization?.notes || null
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Actualizar contador de ventas de productos
        for (const item of orderData.items) {
            await supabase.rpc('increment_sales', { product_id: item.product_id, qty: item.quantity });
        }

        return { success: true, order_number: orderNumber, order_id: order.id };
    } catch (error) {
        console.error('Error creando orden:', error);
        return { success: false, message: 'Error al crear el pedido. Por favor intenta nuevamente.' };
    }
}

// =====================================================
// Funciones de Contacto
// =====================================================

async function submitContactForm(contactData) {
    if (!supabase) {
        console.log('Mensaje de contacto (demo):', contactData);
        return { success: true };
    }

    try {
        const { error } = await supabase
            .from('contacts')
            .insert({
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone || null,
                message: contactData.message,
                read: false
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error enviando contacto:', error);
        return { success: false };
    }
}

// =====================================================
// Funciones de Configuracion
// =====================================================

async function getStoreSettings() {
    if (!supabase) {
        return {
            hero_slides: [
                {
                    image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=1920',
                    title: 'Regalos que Enamoran',
                    subtitle: 'Creamos momentos unicos con productos personalizados hechos con amor en Santiago'
                }
            ],
            shipping_free_threshold: CONFIG.shipping.free_threshold
        };
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo configuracion:', error);
        return null;
    }
}

// =====================================================
// Funciones de Device Tracking
// =====================================================

async function getDeviceTracking(options = {}) {
    const {
        limit = 50,
        offset = 0,
        search = null,
    } = options;

    if (!supabase) {
        return { devices: [], total: 0 };
    }

    try {
        let query = supabase
            .from('device_tracking')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.ilike('user_agent', `%${search}%`);
        }

        query = query.order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return { devices: data, total: count };
    } catch (error) {
        console.error('Error obteniendo device tracking:', error);
        return { devices: [], total: 0 };
    }
}

async function addDeviceTracking() {
    if (!supabase) {
        console.log('Device tracking (demo):', { user_agent: navigator.userAgent });
        return { success: true };
    }

    try {
        const { error } = await supabase
            .from('device_tracking')
            .insert({
                user_agent: navigator.userAgent,
            });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error agregando device tracking:', error);
        return { success: false };
    }
}

// =====================================================
// Funciones de Storage
// =====================================================

async function uploadProductImage(file) {
    if (!supabase) {
        console.log('Subida de imagen (demo):', file.name);
        return { success: true, url: 'https://via.placeholder.com/300' };
    }

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error: uploadError } = await supabase
            .storage
            .from('product-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } , error: urlError } = supabase
            .storage
            .from('product-images')
            .getPublicUrl(filePath);

        if (urlError) {
            throw urlError;
        }

        return { success: true, url: publicUrl };
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        return { success: false, message: 'Error al subir la imagen. Por favor intenta nuevamente.' };
    }
}

// =====================================================
// Funciones de Analiticas
// =====================================================

async function getAnalyticsData(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);

        const fromISO = from.toISOString();
        const toISO = to.toISOString();

        const [
            { data: orders, error: ordersError },
            { data: customers, error: customersError }
        ] = await Promise.all([
            supabase.from('orders').select('total, created_at').gte('created_at', fromISO).lte('created_at', toISO),
            supabase.from('customers').select('created_at').gte('created_at', fromISO).lte('created_at', toISO)
        ]);

        if (ordersError) throw ordersError;
        if (customersError) throw customersError;

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const newCustomers = customers.length;

        return {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            newCustomers,
        };
    } catch (error) {
        console.error('Error obteniendo datos de analiticas:', error);
        return null;
    }
}

async function getSalesData(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const { data, error } = await supabase.from('orders').select('created_at, total').gte('created_at', from.toISOString()).lte('created_at', to.toISOString());
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo datos de ventas:', error);
        return [];
    }
}

async function getTopProducts(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const { data, error } = await supabase.from('order_items')
            .select('product_name, quantity')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString());

        if (error) throw error;
        
        const productSales = data.reduce((acc, item) => {
            acc[item.product_name] = (acc[item.product_name] || 0) + item.quantity;
            return acc;
        }, {});

        return Object.entries(productSales).sort(([, a], [, b]) => b - a).slice(0, 10);
    } catch (error) {
        console.error('Error obteniendo top productos:', error);
        return [];
    }
}

async function getSalesByCategory(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const { data, error } = await supabase
            .from('order_items')
            .select('total_price, products(categories(name))')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString());

        if (error) throw error;

        const categorySales = data.reduce((acc, item) => {
            const category = item.products?.categories?.name || 'Sin Categoria';
            acc[category] = (acc[category] || 0) + item.total_price;
            return acc;
        }, {});

        return Object.entries(categorySales);
    } catch (error) {
        console.error('Error obteniendo ventas por categoria:', error);
        return [];
    }
}

async function getCustomerGrowth(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const { data, error } = await supabase
            .from('customers')
            .select('created_at')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString());
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo crecimiento de clientes:', error);
        return [];
    }
}

async function getSalesByComuna(periodDays = 30) {
    try {
        const to = new Date();
        const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000);
        const { data, error } = await supabase
            .from('orders')
            .select('shipping_comuna, total')
            .gte('created_at', from.toISOString())
            .lte('created_at', to.toISOString());
        
        if (error) throw error;

        const comunaSales = data.reduce((acc, order) => {
            const comuna = order.shipping_comuna || 'Sin Comuna';
            acc[comuna] = (acc[comuna] || 0) + order.total;
            return acc;
        }, {});

        return Object.entries(comunaSales).sort(([, a], [, b]) => b - a).slice(0, 10);
    } catch (error) {
        console.error('Error obteniendo ventas por comuna:', error);
        return [];
    }
}

// =====================================================
// Datos Demo (cuando Supabase no esta configurado)
// =====================================================

function getDemoCategories() {
    // Intentar cargar categorias guardadas en localStorage
    const savedCategories = localStorage.getItem('demo_categories');
    if (savedCategories) {
        try {
            return JSON.parse(savedCategories);
        } catch (e) {
            console.error('Error parsing saved categories:', e);
        }
    }

    // Categorias por defecto
    const defaultCategories = [
        { id: 1, name: 'Tazas', slug: 'tazas', image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400', products: 0, active: true, position: 1 },
        { id: 2, name: 'Cojines', slug: 'cojines', image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400', products: 0, active: true, position: 2 },
        { id: 3, name: 'Poleras', slug: 'poleras', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', products: 0, active: true, position: 3 },
        { id: 4, name: 'Cuadros', slug: 'cuadros', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=400', products: 0, active: true, position: 4 },
        { id: 5, name: 'Puzzles', slug: 'puzzles', image: 'https://images.unsplash.com/photo-1494059980473-813e73ee784b?w=400', products: 0, active: true, position: 5 }
    ];

    // Guardar en localStorage
    localStorage.setItem('demo_categories', JSON.stringify(defaultCategories));
    return defaultCategories;
}

function saveDemoCategories(categories) {
    localStorage.setItem('demo_categories', JSON.stringify(categories));
}

function getDemoProducts(options = {}) {
    const { category = null, limit = 12, offset = 0 } = options;

    // Intentar cargar productos guardados en localStorage
    const savedProducts = localStorage.getItem('demo_products');
    let products = [];

    if (savedProducts) {
        try {
            products = JSON.parse(savedProducts);
        } catch (e) {
            console.error('Error parsing saved products:', e);
            products = [];
        }
    }

    // Filtrar por categoria si se especifica
    let filteredProducts = products;
    if (category && category !== 'todos') {
        filteredProducts = products.filter(p => p.category?.slug === category || p.category === category);
    }

    // Aplicar paginacion
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    return { products: paginatedProducts, total: filteredProducts.length };
}

function saveDemoProducts(products) {
    localStorage.setItem('demo_products', JSON.stringify(products));
}

function getDemoReviews() {
    return [
        {
            id: 1,
            customer_name: 'Maria Garcia',
            rating: 5,
            comment: 'Excelente calidad! La taza llego perfecta y el diseno quedo hermoso.',
            created_at: new Date().toISOString(),
            product: { name: 'Taza Personalizada' }
        },
        {
            id: 2,
            customer_name: 'Carlos Rodriguez',
            rating: 5,
            comment: 'Muy rapido el envio y el producto supero mis expectativas.',
            created_at: new Date().toISOString(),
            product: { name: 'Cojin Personalizado' }
        }
    ];
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', initSupabase);
