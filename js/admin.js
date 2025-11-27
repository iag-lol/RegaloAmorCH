/* =====================================================
   PANEL ADMINISTRATIVO - JavaScript
   ===================================================== */

// Estado global
const AdminState = {
    isAuthenticated: false,
    currentSection: 'dashboard',
    supabase: null,
    orders: [],
    products: [],
    categories: [],
    reviews: [],
    customers: [],
    devices: []
};

// Normaliza rutas de imágenes (soporta URLs absolutas o rutas de Supabase Storage)
function resolveAdminImage(path) {
    if (!path) return null;
    if (typeof path === 'object' && path.url) path = path.url;
    // Dejar data URLs o blobs intactos (subidas locales)
    if (/^(data:|blob:)/i.test(path)) return path;
    if (/^https?:\/\//i.test(path)) return path;
    // Usa helper global si existe
    if (typeof buildPublicUrl === 'function') {
        return buildPublicUrl(path);
    }
    const base = `${CONFIG.supabase.url}/storage/v1/object/public`.replace(/\/+$/, '');
    const cleanPath = String(path).replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
}

// =====================================================
// Inicializacion
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    initSupabaseAdmin();
    checkAuth();
    bindEvents();
});

function initSupabaseAdmin() {
    if (CONFIG.supabase.url !== 'TU_SUPABASE_URL') {
        AdminState.supabase = window.supabase.createClient(
            CONFIG.supabase.url,
            CONFIG.supabase.anonKey
        );
    }
}

// =====================================================
// Autenticacion
// =====================================================

function checkAuth() {
    const isAuth = localStorage.getItem('adminAuth');
    if (isAuth === 'true') {
        showAdmin();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminWrapper').style.display = 'none';
}

async function showAdmin() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminWrapper').style.display = 'flex';
    AdminState.isAuthenticated = true;
    // Cargar categorias al iniciar para tenerlas disponibles
    AdminState.categories = await getCategories();
    loadDashboard();
}

// =====================================================
// Eventos
// =====================================================

function bindEvents() {
    // Login
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Navegacion
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });

    // Sidebar toggle
    document.getElementById('mobileToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Goto links
    document.querySelectorAll('[data-goto]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.goto);
        });
    });

    // Productos
    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());
    document.getElementById('productForm')?.addEventListener('submit', handleProductSave);
    document.getElementById('addQuantityDiscount')?.addEventListener('click', addQuantityDiscountRow);

    // Categorias
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('categoryForm')?.addEventListener('submit', handleCategorySave);

    // Filtros
    document.getElementById('orderStatusFilter')?.addEventListener('change', filterOrders);
    document.getElementById('orderDateFilter')?.addEventListener('change', filterOrders);
    document.getElementById('reviewStatusFilter')?.addEventListener('change', filterReviews);
    document.getElementById('productSearch')?.addEventListener('input', debounce(searchProducts, 300));
    document.getElementById('deviceSearch')?.addEventListener('input', debounce(searchDevices, 300));

    // SII
    document.getElementById('siiMonth')?.addEventListener('change', loadSiiData);
    document.getElementById('siiYear')?.addEventListener('change', loadSiiData);
    document.getElementById('generateSiiReport')?.addEventListener('click', generateSiiReport);

    // Settings
    document.getElementById('storeSettingsForm')?.addEventListener('submit', saveStoreSettings);
    document.getElementById('shippingSettingsForm')?.addEventListener('submit', saveShippingSettings);
    document.getElementById('passwordForm')?.addEventListener('submit', changePassword);

    // Cerrar modals al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
}

// =====================================================
// Login/Logout
// =====================================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    // Demo login
    if (email === 'admin@regaloamor.cl' && password === 'admin123') {
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminEmail', email);
        showAdmin();
        showToast('Bienvenido al panel', 'success');
        return;
    }

    // Supabase login si esta configurado
    if (AdminState.supabase) {
        const { data, error } = await AdminState.supabase.auth.signInWithPassword({
            email, password
        });

        if (error) {
            showToast('Credenciales incorrectas', 'error');
            return;
        }

        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminEmail', email);
        showAdmin();
        showToast('Bienvenido al panel', 'success');
    } else {
        showToast('Credenciales incorrectas', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminEmail');
    if (AdminState.supabase) {
        AdminState.supabase.auth.signOut();
    }
    showLogin();
    showToast('Sesion cerrada', 'success');
}

// =====================================================
// Navegacion
// =====================================================

function navigateTo(section) {
    AdminState.currentSection = section;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${section}`);
    });

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        orders: 'Pedidos',
        products: 'Productos',
        categories: 'Categorias',
        reviews: 'Resenas',
        customers: 'Clientes',
        analytics: 'Analiticas',
        sii: 'Control SII / IVA',
        'device-tracking': 'Dispositivos',
        settings: 'Configuracion'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;

    // Load section data
    loadSectionData(section);

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('active');
}

function loadSectionData(section) {
    switch (section) {
        case 'dashboard': loadDashboard(); break;
        case 'orders': loadOrders(); break;
        case 'products': loadProducts(); break;
        case 'categories': loadCategories(); break;
        case 'reviews': loadReviews(); break;
        case 'customers': loadCustomers(); break;
        case 'analytics': loadAnalytics(); break;
        case 'sii': loadSiiData(); break;
        case 'device-tracking': loadDeviceTracking(); break;
    }
}

// =====================================================
// Dashboard
// =====================================================

async function loadDashboard() {
    const { totalRevenue, totalOrders, newCustomers } = await getAnalyticsData(1);
    const { products } = await getProducts({limit: 5, sort: 'popular'});
    
    document.getElementById('statOrders').textContent = totalOrders;
    document.getElementById('statRevenue').textContent = formatPrice(totalRevenue);
    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCustomers').textContent = newCustomers;

    // Resumen ventas
    const salesData = await getSalesData(7);
    const grossSales = salesData.reduce((sum, order) => sum + order.total, 0);
    const netSales = Math.round(grossSales / 1.19);
    const totalIva = grossSales - netSales;
    const totalOrdersWeek = salesData.length;

    document.getElementById('grossSales').textContent = formatPrice(grossSales);
    document.getElementById('netSales').textContent = formatPrice(netSales);
    document.getElementById('totalIva').textContent = formatPrice(totalIva);
    document.getElementById('totalOrders').textContent = totalOrdersWeek;

    // Pedidos recientes
    loadRecentOrders();
}

async function loadRecentOrders() {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) {
        console.error('Error fetching recent orders:', error);
        return;
    }

    const tbody = document.getElementById('recentOrdersTable');
    tbody.innerHTML = data.map(order => `
        <tr>
            <td><strong>${order.order_number}</strong></td>
            <td>${order.customer_name}</td>
            <td>${formatPrice(order.total)}</td>
            <td><span class="status status-${order.status}">${getStatusLabel(order.status)}</span></td>
        </tr>
    `).join('');
}

// =====================================================
// Pedidos
// =====================================================

async function loadOrders() {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }
    AdminState.orders = data;
    renderOrders(data);
}

function renderOrders(orders) {
    const tbody = document.getElementById('ordersTable');
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay pedidos</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td><strong>${order.number}</strong></td>
            <td>${order.date}</td>
            <td>${order.customer}<br><small>${order.email}</small></td>
            <td>${order.products} items</td>
            <td>${formatPrice(order.total)}</td>
            <td><span class="status status-${order.status}">${getStatusLabel(order.status)}</span></td>
            <td>
                <button class="action-btn view" onclick="viewOrder(${order.id})" title="Ver">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="updateOrderStatus(${order.id})" title="Cambiar Estado">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    const date = document.getElementById('orderDateFilter').value;

    let filtered = [...AdminState.orders];

    if (status) {
        filtered = filtered.filter(o => o.status === status);
    }
    if (date) {
        filtered = filtered.filter(o => o.date === date);
    }

    renderOrders(filtered);
}

function viewOrder(id) {
    const order = AdminState.orders.find(o => o.id === id);
    if (!order) return;

    const subtotal = Math.round(order.total * 0.89);
    const shipping = order.total - subtotal;
    const statusIcons = {
        pending: 'clock',
        confirmed: 'check-circle',
        preparing: 'cog',
        ready: 'box',
        shipped: 'truck',
        delivered: 'check-double',
        cancelled: 'times-circle'
    };

    const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.status);

    document.getElementById('orderModalContent').innerHTML = `
        <!-- Header con numero y estado -->
        <div class="order-detail-header">
            <div>
                <h3 class="order-number">${order.number}</h3>
                <p class="order-date"><i class="far fa-calendar-alt"></i> ${order.date}</p>
            </div>
            <div class="order-status-badge ${order.status}">
                <i class="fas fa-${statusIcons[order.status] || 'circle'}"></i>
                ${getStatusLabel(order.status)}
            </div>
        </div>

        <!-- Grid de informacion -->
        <div class="order-detail-grid">
            <!-- Cliente -->
            <div class="order-detail-card">
                <div class="order-detail-card-header">
                    <i class="fas fa-user"></i>
                    <h4>Datos del Cliente</h4>
                </div>
                <div class="order-detail-info">
                    <p><strong>${order.customer}</strong></p>
                    <p><i class="fas fa-envelope"></i> ${order.email}</p>
                    <p><i class="fas fa-phone"></i> ${order.phone}</p>
                </div>
            </div>

            <!-- Envio -->
            <div class="order-detail-card highlight">
                <div class="order-detail-card-header">
                    <i class="fas fa-map-marker-alt"></i>
                    <h4>Direccion de Envio</h4>
                </div>
                <div class="order-detail-info">
                    <p><strong>${order.address || 'Direccion no especificada'}</strong></p>
                    <p><i class="fas fa-city"></i> ${order.comuna || 'Santiago'}, Region Metropolitana</p>
                    <p><i class="fas fa-flag"></i> Chile</p>
                </div>
            </div>
        </div>

        <!-- Productos del pedido -->
        <div class="order-items-section">
            <div class="order-items-header">
                <i class="fas fa-box-open"></i>
                <h4>Productos del Pedido</h4>
            </div>
            ${order.items ? order.items.map((item, idx) => `
                <div class="order-item-row">
                    <div class="order-item-image">
                        <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    </div>
                    <div class="order-item-details">
                        <div class="order-item-name">${item.name}</div>
                        <div class="order-item-meta">Cantidad: ${item.quantity} | SKU: ${item.sku || 'N/A'}</div>
                        ${(item.customization_text || item.customization_image || item.customization_notes) ? `
                            <div class="order-item-customization-box">
                                <div class="customization-header">
                                    <i class="fas fa-paint-brush"></i>
                                    <span>Personalizacion</span>
                                </div>
                                ${item.customization_text ? `
                                    <div class="customization-field">
                                        <label><i class="fas fa-font"></i> Texto:</label>
                                        <span>"${item.customization_text}"</span>
                                    </div>
                                ` : ''}
                                ${item.customization_notes ? `
                                    <div class="customization-field">
                                        <label><i class="fas fa-sticky-note"></i> Notas:</label>
                                        <span>${item.customization_notes}</span>
                                    </div>
                                ` : ''}
                                ${item.customization_image ? `
                                    <div class="customization-image-section">
                                        <label><i class="fas fa-image"></i> Imagen del Cliente:</label>
                                        <div class="customer-image-container">
                                            <img src="${item.customization_image}" alt="Imagen del cliente" class="customer-image-preview" onclick="openImagePreview('${item.customization_image}')">
                                            <div class="customer-image-actions">
                                                <button type="button" class="btn-image-action" onclick="openImagePreview('${item.customization_image}')" title="Ver imagen">
                                                    <i class="fas fa-search-plus"></i> Ver
                                                </button>
                                                <button type="button" class="btn-image-action download" onclick="downloadCustomerImage('${item.customization_image}', '${order.number}_item${idx + 1}')" title="Descargar imagen">
                                                    <i class="fas fa-download"></i> Descargar
                                                </button>
                                                <a href="${item.customization_image}" target="_blank" class="btn-image-action external" title="Abrir en nueva pestana">
                                                    <i class="fas fa-external-link-alt"></i>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="order-item-price">
                        <div class="unit-price">${formatPrice(item.price)} c/u</div>
                        <div class="total-price">${formatPrice(item.price * item.quantity)}</div>
                    </div>
                </div>
            `).join('') : `
                <div class="order-item-row">
                    <div class="order-item-image">
                        <img src="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=60" alt="Producto">
                    </div>
                    <div class="order-item-details">
                        <div class="order-item-name">Producto Personalizado</div>
                        <div class="order-item-meta">Cantidad: 1</div>
                    </div>
                    <div class="order-item-price">
                        <div class="unit-price">${formatPrice(subtotal)} c/u</div>
                        <div class="total-price">${formatPrice(subtotal)}</div>
                    </div>
                </div>
            `}
        </div>

        <!-- Totales -->
        <div class="order-totals-section">
            <div class="order-totals-row">
                <span class="label">Subtotal</span>
                <span>${formatPrice(subtotal)}</span>
            </div>
            <div class="order-totals-row">
                <span class="label">Envio</span>
                <span>${formatPrice(shipping)}</span>
            </div>
            <div class="order-totals-row">
                <span class="label">IVA (incluido)</span>
                <span>${formatPrice(Math.round(order.total * 0.19 / 1.19))}</span>
            </div>
            <div class="order-totals-row total">
                <span>Total</span>
                <span>${formatPrice(order.total)}</span>
            </div>
        </div>

        <!-- Acciones -->
        <div class="order-actions-section">
            <div class="order-actions-header">
                <i class="fas fa-cogs"></i>
                <h4>Gestionar Pedido</h4>
            </div>
            <div class="order-actions-grid">
                <select id="newOrderStatus">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmado</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>En Preparacion</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Listo para Envio</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Despachado</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Entregado</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                </select>
                <button class="btn btn-primary" onclick="saveOrderStatus(${order.id})">
                    <i class="fas fa-paper-plane"></i> Actualizar y Notificar
                </button>
            </div>

            <!-- Timeline -->
            <div class="order-timeline">
                <div class="order-timeline-title">Progreso del Pedido</div>
                <div class="timeline-steps">
                    ${statusOrder.map((status, index) => `
                        <div class="timeline-step ${index < currentStatusIndex ? 'completed' : ''} ${index === currentStatusIndex ? 'active' : ''}">
                            <div class="timeline-step-icon">
                                <i class="fas fa-${index <= currentStatusIndex ? 'check' : statusIcons[status]}"></i>
                            </div>
                            <div class="timeline-step-label">${getStatusLabel(status)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    openModal('orderModal');
}

function saveOrderStatus(orderId) {
    const newStatus = document.getElementById('newOrderStatus').value;
    const order = AdminState.orders.find(o => o.id === orderId);

    if (order) {
        order.status = newStatus;
        renderOrders(AdminState.orders);
        showToast(`Estado actualizado a: ${getStatusLabel(newStatus)}. Email de notificacion enviado.`, 'success');
        closeModal('orderModal');
    }
}

function updateOrderStatus(id) {
    viewOrder(id);
}

// =====================================================
// Productos
// =====================================================

async function loadProducts() {
    const { products } = await getProducts({limit: 100});
    AdminState.products = products;
    renderProducts(products);
    loadProductCategories();
    updateProductStats();
}

function updateProductStats() {
    const total = AdminState.products.length;
    const active = AdminState.products.filter(p => p.active).length;
    const featured = AdminState.products.filter(p => p.featured).length;
    const outOfStock = AdminState.products.filter(p => p.stock === 0).length;

    document.getElementById('productStatsTotal')?.textContent && (document.getElementById('productStatsTotal').textContent = total);
    document.getElementById('productStatsActive')?.textContent && (document.getElementById('productStatsActive').textContent = active);
    document.getElementById('productStatsFeatured')?.textContent && (document.getElementById('productStatsFeatured').textContent = featured);
    document.getElementById('productStatsOutOfStock')?.textContent && (document.getElementById('productStatsOutOfStock').textContent = outOfStock);
}

function renderProducts(products) {
    const grid = document.getElementById('adminProductsGrid');
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No hay productos</h3>
                <p>Agrega tu primer producto para comenzar a vender</p>
                <button class="btn btn-primary" onclick="openProductModal()">
                    <i class="fas fa-plus"></i> Agregar Producto
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        // Obtener la imagen principal (puede venir como array de Supabase o como string de localStorage)
        const mainImage = resolveAdminImage(
            (Array.isArray(product.images) ? product.images[0] : null) ||
            product.image
        ) || 'https://placehold.co/300x300/e5e7eb/6b7280?text=Sin+Imagen';
        const categoryName = product.category?.name || product.category || 'Sin categoría';

        return `
        <div class="product-card-pro ${!product.active ? 'inactive' : ''}" data-id="${product.id}">
            <div class="product-card-image">
                <img src="${mainImage}" alt="${product.name}" onerror="this.src='https://placehold.co/300x300/e5e7eb/6b7280?text=Sin+Imagen'">
                ${product.discount > 0 ? `<span class="product-discount-badge">-${product.discount}%</span>` : ''}
                ${product.featured ? `<span class="product-featured-badge"><i class="fas fa-star"></i></span>` : ''}
                <div class="product-quick-actions">
                    <button class="quick-action-btn" onclick="toggleFeatured(${product.id})" title="${product.featured ? 'Quitar destacado' : 'Destacar'}">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="quick-action-btn" onclick="toggleProductActive(${product.id})" title="${product.active ? 'Desactivar' : 'Activar'}">
                        <i class="fas fa-${product.active ? 'eye-slash' : 'eye'}"></i>
                    </button>
                    <button class="quick-action-btn" onclick="duplicateProduct(${product.id})" title="Duplicar">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
            <div class="product-card-body">
                <div class="product-category-tag">${categoryName}</div>
                <h4 class="product-name">${product.name}</h4>
                <div class="product-pricing">
                    ${product.original_price ? `<span class="original-price">${formatPrice(product.original_price)}</span>` : ''}
                    <span class="current-price">${formatPrice(product.price)}</span>
                </div>
                <div class="product-meta">
                    <div class="meta-item ${product.stock === 0 ? 'danger' : product.stock < 10 ? 'warning' : ''}">
                        <i class="fas fa-boxes"></i>
                        <span>${product.stock === -1 ? 'Sin limite' : product.stock === 0 ? 'Agotado' : product.stock + ' uds'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-shopping-cart"></i>
                        <span>${product.sales_count || 0} ventas</span>
                    </div>
                </div>
                <div class="product-status-row">
                    <span class="product-status ${product.active ? 'active' : 'inactive'}">
                        <i class="fas fa-circle"></i>
                        ${product.active ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>
            <div class="product-card-footer">
                <button class="btn-product-action edit" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-product-action delete" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function toggleFeatured(id) {
    const product = AdminState.products.find(p => p.id === id);
    if (product) {
        product.featured = !product.featured;
        renderProducts(AdminState.products);
        updateProductStats();
        showToast(product.featured ? 'Producto destacado' : 'Producto quitado de destacados', 'success');
    }
}

function toggleProductActive(id) {
    const product = AdminState.products.find(p => p.id === id);
    if (product) {
        product.active = !product.active;
        renderProducts(AdminState.products);
        updateProductStats();
        showToast(product.active ? 'Producto activado' : 'Producto desactivado', 'success');
    }
}

function duplicateProduct(id) {
    const product = AdminState.products.find(p => p.id === id);
    if (product) {
        const newProduct = {
            ...product,
            id: Date.now(),
            name: product.name + ' (Copia)',
            slug: product.slug + '-copia',
            sales_count: 0
        };
        AdminState.products.push(newProduct);
        renderProducts(AdminState.products);
        updateProductStats();
        showToast('Producto duplicado', 'success');
    }
}

async function loadProductCategories() {
    // Cargar categorias desde el estado o desde la funcion getCategories
    if (AdminState.categories.length === 0) {
        AdminState.categories = await getCategories();
    }

    const select = document.getElementById('productCategory');
    const filterSelect = document.getElementById('productCategoryFilter');

    // Usar las categorias de AdminState
    const categories = AdminState.categories.filter(c => c.active !== false);

    if (select) {
        select.innerHTML = '<option value="">Seleccionar...</option>' +
            categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todas las categorias</option>' +
            categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }
}

function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const modalContent = modal.querySelector('.modal-body');
    const isEdit = product !== null;
    // Usar categorias de AdminState (filtrar solo activas)
    const categories = AdminState.categories.filter(c => c.active !== false).map(c => c.name);

    modal.querySelector('#productModalTitle').textContent = isEdit ? 'Editar Producto' : 'Nuevo Producto';

    modalContent.innerHTML = `
        <form id="productFormAdvanced" class="product-form-advanced">
            <input type="hidden" id="productId" value="${product?.id || ''}">

            <div class="product-modal-tabs">
                <button type="button" class="tab-btn active" data-tab="basic">
                    <i class="fas fa-info-circle"></i> Basico
                </button>
                <button type="button" class="tab-btn" data-tab="pricing">
                    <i class="fas fa-tags"></i> Precios
                </button>
                <button type="button" class="tab-btn" data-tab="media">
                    <i class="fas fa-images"></i> Imagenes
                </button>
                <button type="button" class="tab-btn" data-tab="inventory">
                    <i class="fas fa-boxes"></i> Inventario
                </button>
            </div>

            <!-- Tab: Basico -->
            <div class="tab-content active" id="tab-basic">
                <div class="form-section-header">
                    <i class="fas fa-info-circle"></i>
                    <span>Informacion Basica</span>
                </div>

                <div class="form-group-pro">
                    <label for="productName">Nombre del Producto *</label>
                    <input type="text" id="productName" value="${product?.name || ''}" placeholder="Ej: Taza Personalizada Premium" required>
                    <span class="form-hint">El nombre que veran tus clientes</span>
                </div>

                <div class="form-row-2">
                    <div class="form-group-pro">
                        <label for="productSlug">URL Slug</label>
                        <div class="input-with-prefix">
                            <span class="prefix">/producto/</span>
                            <input type="text" id="productSlug" value="${product?.slug || ''}" placeholder="taza-personalizada-premium">
                        </div>
                    </div>
                    <div class="form-group-pro">
                        <label for="productCategory">Categoria *</label>
                        <select id="productCategory" required>
                            <option value="">Seleccionar...</option>
                            ${categories.map(c => `<option value="${c}" ${(product?.category?.name || product?.category) === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group-pro">
                    <label for="productDescription">Descripcion</label>
                    <textarea id="productDescription" rows="4" placeholder="Describe tu producto...">${product?.description || ''}</textarea>
                    <span class="form-hint">Una buena descripcion aumenta las ventas</span>
                </div>
            </div>

            <!-- Tab: Precios -->
            <div class="tab-content" id="tab-pricing">
                <div class="form-section-header">
                    <i class="fas fa-tags"></i>
                    <span>Configuracion de Precios</span>
                </div>

                <div class="form-row-2">
                    <div class="form-group-pro">
                        <label for="productPrice">Precio de Venta * (CLP)</label>
                        <div class="input-with-icon">
                            <i class="fas fa-dollar-sign"></i>
                            <input type="number" id="productPrice" value="${product?.price || ''}" placeholder="9990" min="0" required>
                        </div>
                    </div>
                    <div class="form-group-pro">
                        <label for="productOriginalPrice">Precio Original (CLP)</label>
                        <div class="input-with-icon">
                            <i class="fas fa-dollar-sign"></i>
                            <input type="number" id="productOriginalPrice" value="${product?.original_price || ''}" placeholder="12990" min="0">
                        </div>
                        <span class="form-hint">Precio tachado (opcional)</span>
                    </div>
                </div>

                <div class="form-group-pro">
                    <label>Descuento Automatico</label>
                    <div class="discount-preview" id="discountPreview">
                        ${product?.discount > 0 ? `<span class="discount-badge">-${product.discount}% de descuento</span>` : '<span class="no-discount">Sin descuento configurado</span>'}
                    </div>
                </div>

                <div class="form-section-header mt-20">
                    <i class="fas fa-layer-group"></i>
                    <span>Descuentos por Cantidad</span>
                </div>

                <div id="quantityDiscountsContainer" class="quantity-discounts-container">
                    <div class="quantity-discount-row">
                        <input type="number" placeholder="Desde (uds)" class="qty-min" value="3">
                        <input type="number" placeholder="% Dcto" class="qty-discount" value="10">
                        <button type="button" class="btn-remove-qty" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                <button type="button" class="btn-add-qty" onclick="addQuantityDiscountRowAdvanced()">
                    <i class="fas fa-plus"></i> Agregar descuento por cantidad
                </button>
            </div>

            <!-- Tab: Imagenes -->
            <div class="tab-content" id="tab-media">
                <div class="form-section-header">
                    <i class="fas fa-images"></i>
                    <span>Galeria de Imagenes</span>
                </div>

                <div class="form-group-pro">
                    <label for="productImage">Imagen Principal *</label>
                    <div class="image-upload-area" id="mainImageUpload">
                        ${product?.images?.[0]?.url || product?.image ? `
                            <img src="${resolveAdminImage((Array.isArray(product.images) ? product.images[0] : null) || product.image)}" alt="Preview" class="image-preview">
                            <div class="image-upload-overlay">
                                <i class="fas fa-camera"></i>
                                <span>Cambiar imagen</span>
                            </div>
                        ` : `
                            <i class="fas fa-cloud-upload-alt"></i>
                            <span>Arrastra una imagen o haz clic</span>
                            <small>JPG, PNG hasta 5MB</small>
                        `}
                    </div>
                    <input type="text" id="productImage" value="${(product?.images?.[0]?.url || product?.image || '')}" placeholder="https://... o sube una imagen" class="mt-10">
                </div>

                <div class="form-group-pro">
                    <label>Imagenes Adicionales</label>
                    <div class="additional-images-grid" id="additionalImagesGrid">
                        <div class="add-image-btn">
                            <i class="fas fa-plus"></i>
                        </div>
                    </div>
                    <span class="form-hint">Agrega hasta 5 imagenes adicionales</span>
                </div>
            </div>

            <!-- Tab: Inventario -->
            <div class="tab-content" id="tab-inventory">
                <div class="form-section-header">
                    <i class="fas fa-boxes"></i>
                    <span>Control de Inventario</span>
                </div>

                <div class="form-row-2">
                    <div class="form-group-pro">
                        <label for="productStock">Stock Disponible</label>
                        <div class="input-with-icon">
                            <i class="fas fa-cubes"></i>
                            <input type="number" id="productStock" value="${product?.stock === -1 ? '' : product?.stock || ''}" placeholder="50" min="-1">
                        </div>
                        <span class="form-hint">Dejar vacio = sin limite</span>
                    </div>
                </div>

                <div class="form-group-pro">
                    <label>Opciones del Producto</label>
                    <div class="toggle-options">
                        <label class="toggle-option">
                            <input type="checkbox" id="productActive" ${!product || product.active ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">
                                <strong>Producto Activo</strong>
                                <small>Visible en la tienda</small>
                            </span>
                        </label>
                        <label class="toggle-option">
                            <input type="checkbox" id="productFeatured" ${product?.featured ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">
                                <strong>Producto Destacado</strong>
                                <small>Aparece en la pagina principal</small>
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="product-modal-footer">
                <button type="button" class="btn btn-outline" onclick="closeModal('productModal')">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-primary btn-save-product">
                    <i class="fas fa-save"></i> ${isEdit ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
            </div>
        </form>
    `;

    // Bind tab events
    modalContent.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchProductTab(btn.dataset.tab));
    });

    // Bind form submit
    document.getElementById('productFormAdvanced').addEventListener('submit', handleProductSaveAdvanced);

    // Inicializar funcionalidad de subida de imagenes
    // Pasar imagenes adicionales existentes si es edicion
    // Si product.images es array de objetos {url, position}, extraer solo las URLs
    const existingAdditionalImages = product?.images?.slice(1).map(img => img.url || img) || [];
    initImageUpload(existingAdditionalImages);

    // Auto-generate slug
    document.getElementById('productName')?.addEventListener('input', (e) => {
        const slug = e.target.value.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
        document.getElementById('productSlug').value = slug;
    });

    // Calculate discount
    document.getElementById('productPrice')?.addEventListener('input', updateDiscountPreview);
    document.getElementById('productOriginalPrice')?.addEventListener('input', updateDiscountPreview);

    openModal('productModal');
}

function switchProductTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

function updateDiscountPreview() {
    const price = parseInt(document.getElementById('productPrice').value) || 0;
    const originalPrice = parseInt(document.getElementById('productOriginalPrice').value) || 0;
    const preview = document.getElementById('discountPreview');

    if (originalPrice > price && price > 0) {
        const discount = Math.round((1 - price / originalPrice) * 100);
        preview.innerHTML = `<span class="discount-badge">-${discount}% de descuento</span>`;
    } else {
        preview.innerHTML = '<span class="no-discount">Sin descuento configurado</span>';
    }
}

function addQuantityDiscountRowAdvanced() {
    const container = document.getElementById('quantityDiscountsContainer');
    const row = document.createElement('div');
    row.className = 'quantity-discount-row';
    row.innerHTML = `
        <input type="number" placeholder="Desde (uds)" class="qty-min">
        <input type="number" placeholder="% Dcto" class="qty-discount">
        <button type="button" class="btn-remove-qty" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

function editProduct(id) {
    const product = AdminState.products.find(p => p.id === id);
    if (product) openProductModal(product);
}

async function deleteProduct(id) {
    if (confirm('Estas seguro de eliminar este producto?')) {
        try {
            // Intentar eliminar de Supabase si esta disponible
            if (supabase) {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            }

            // Actualizar estado local
            AdminState.products = AdminState.products.filter(p => p.id !== id);
            // Guardar en localStorage para persistencia
            saveDemoProducts(AdminState.products);
            renderProducts(AdminState.products);
            updateProductStats();
            showToast('Producto eliminado', 'success');
        } catch (error) {
            console.error('Error eliminando producto:', error);
            showToast('Error al eliminar producto', 'error');
        }
    }
}

async function handleProductSaveAdvanced(e) {
    e.preventDefault();

    const id = document.getElementById('productId').value;
    const price = parseInt(document.getElementById('productPrice').value);
    const originalPrice = parseInt(document.getElementById('productOriginalPrice').value) || null;
    const stock = document.getElementById('productStock').value === '' ? -1 : parseInt(document.getElementById('productStock').value);

    let discount = 0;
    if (originalPrice && originalPrice > price) {
        discount = Math.round((1 - price / originalPrice) * 100);
    }

    // Obtener imagen principal
    const mainImage = document.getElementById('productImage').value || 'https://via.placeholder.com/300';

    // Combinar imagen principal con imagenes adicionales
    const allImages = [mainImage, ...additionalImages];

    // Obtener category_id si existe
    const categoryName = document.getElementById('productCategory').value;
    const categoryObj = AdminState.categories.find(c => c.name === categoryName);

    try {
        if (supabase) {
            // Datos para Supabase
            const supabaseData = {
                name: document.getElementById('productName').value,
                slug: document.getElementById('productSlug').value || document.getElementById('productName').value.toLowerCase().replace(/\s+/g, '-'),
                category_id: categoryObj?.id || null,
                description: document.getElementById('productDescription').value,
                price: price,
                original_price: originalPrice,
                discount: discount,
                active: document.getElementById('productActive').checked,
                featured: document.getElementById('productFeatured').checked,
                stock: stock
            };

            if (id) {
                // Actualizar en Supabase
                const { error } = await supabase
                    .from('products')
                    .update(supabaseData)
                    .eq('id', parseInt(id));

                if (error) throw error;

                // Actualizar imagenes (eliminar antiguas y agregar nuevas)
                await supabase.from('product_images').delete().eq('product_id', parseInt(id));

                const imageInserts = allImages.map((url, index) => ({
                    product_id: parseInt(id),
                    url: url,
                    position: index
                }));

                if (imageInserts.length > 0) {
                    await supabase.from('product_images').insert(imageInserts);
                }

                // Actualizar estado local
                const index = AdminState.products.findIndex(p => p.id === parseInt(id));
                if (index > -1) {
                    const localData = {
                        ...supabaseData,
                        id: parseInt(id),
                        category: { id: categoryObj?.id, name: categoryName, slug: categoryObj?.slug },
                        images: allImages.map((url, i) => ({ url: resolveAdminImage(url), position: i })),
                        image: resolveAdminImage(allImages[0]),
                        sales_count: AdminState.products[index].sales_count || 0
                    };
                    AdminState.products[index] = localData;
                }
            } else {
                // Insertar en Supabase
                const { data, error } = await supabase
                    .from('products')
                    .insert(supabaseData)
                    .select()
                    .single();

                if (error) throw error;

                // Insertar imagenes
                const imageInserts = allImages.map((url, index) => ({
                    product_id: data.id,
                    url: url,
                    position: index
                }));

                if (imageInserts.length > 0) {
                    await supabase.from('product_images').insert(imageInserts);
                }

                // Agregar al estado local
                const localData = {
                    ...data,
                    category: { id: categoryObj?.id, name: categoryName, slug: categoryObj?.slug },
                    images: allImages.map((url, i) => ({ url: resolveAdminImage(url), position: i })),
                    image: resolveAdminImage(allImages[0]),
                    sales_count: 0
                };
                AdminState.products.push(localData);
            }
        } else {
            // Modo demo - usar localStorage
            const productData = {
                id: id ? parseInt(id) : Date.now(),
                name: document.getElementById('productName').value,
                slug: document.getElementById('productSlug').value || document.getElementById('productName').value.toLowerCase().replace(/\s+/g, '-'),
                category: categoryName,
                description: document.getElementById('productDescription').value,
                price: price,
                original_price: originalPrice,
                discount: discount,
                image: mainImage,
                images: allImages,
                active: document.getElementById('productActive').checked,
                featured: document.getElementById('productFeatured').checked,
                stock: stock,
                sales_count: 0
            };

            if (id) {
                const index = AdminState.products.findIndex(p => p.id === parseInt(id));
                if (index > -1) {
                    productData.sales_count = AdminState.products[index].sales_count || 0;
                    AdminState.products[index] = productData;
                }
            } else {
                AdminState.products.push(productData);
            }
        }

        // Guardar en localStorage para persistencia
        saveDemoProducts(AdminState.products);

        renderProducts(AdminState.products);
        updateProductStats();
        closeModal('productModal');
        showToast(id ? 'Producto actualizado' : 'Producto creado', 'success');
    } catch (error) {
        console.error('Error guardando producto:', error);
        showToast('Error al guardar producto: ' + error.message, 'error');
    }
}

function handleProductSave(e) {
    e.preventDefault();
    // Legacy handler - redirect to advanced
    handleProductSaveAdvanced(e);
}

function addQuantityDiscountRow() {
    const container = document.getElementById('quantityDiscountsForm');
    const row = document.createElement('div');
    row.className = 'discount-row';
    row.innerHTML = `
        <input type="number" placeholder="Min. cantidad" class="qty-min">
        <input type="number" placeholder="% descuento" class="qty-discount">
        <button type="button" class="btn btn-sm btn-danger remove-discount" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(row);
}

function searchProducts(e) {
    const query = e.target.value.toLowerCase();
    const filtered = AdminState.products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    renderProducts(filtered);
}

// =====================================================
// Categorias
// =====================================================

async function loadCategories() {
    const data = await getCategories();
    AdminState.categories = data;
    renderCategories(data);
    // Actualizar tambien los selectores de categoria en productos
    loadProductCategories();
}

function renderCategories(categories) {
    const tbody = document.getElementById('categoriesTable');
    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td><img src="${cat.image}" width="50" height="50" style="border-radius: 8px; object-fit: cover;"></td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.slug || '-'}</td>
            <td>${cat.products || 0}</td>
            <td><span class="status status-${cat.active !== false ? 'delivered' : 'cancelled'}">${cat.active !== false ? 'Activa' : 'Inactiva'}</span></td>
            <td>
                <button class="action-btn edit" data-action="edit-category" data-id="${cat.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" data-action="delete-category" data-id="${cat.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    // Bind events usando event delegation
    tbody.querySelectorAll('[data-action="edit-category"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            editCategory(id);
        });
    });

    tbody.querySelectorAll('[data-action="delete-category"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            deleteCategory(id);
        });
    });
}

function openCategoryModal(category = null) {
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');

    if (category) {
        title.textContent = 'Editar Categoria';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryImage').value = category.image;
        document.getElementById('categoryActive').checked = category.active;
    } else {
        title.textContent = 'Nueva Categoria';
        form.reset();
        document.getElementById('categoryId').value = '';
    }

    openModal('categoryModal');
}

function editCategory(id) {
    const category = AdminState.categories.find(c => c.id === id);
    if (category) openCategoryModal(category);
}

async function deleteCategory(id) {
    if (confirm('Estas seguro de eliminar esta categoria?')) {
        try {
            // Intentar eliminar de Supabase si esta disponible
            if (supabase) {
                console.log('Intentando eliminar categoria ID:', id);

                // Verificar si hay productos asociados - usar consulta simple
                const { data: productsData, error: checkError } = await supabase
                    .from('products')
                    .select('id')
                    .eq('category_id', parseInt(id));

                if (checkError) {
                    console.error('Error verificando productos:', checkError);
                    throw new Error('Error al verificar productos asociados');
                }

                const count = productsData?.length || 0;

                if (count > 0) {
                    showToast(`No se puede eliminar. Hay ${count} producto(s) en esta categoria. Cambia primero la categoria de esos productos.`, 'error');
                    return;
                }

                // Eliminar categoria
                const { error: deleteError } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', parseInt(id));

                if (deleteError) {
                    console.error('Error al eliminar categoria:', deleteError);
                    throw new Error(deleteError.message || 'Error al eliminar categoria de la base de datos');
                }
            }

            // Actualizar estado local
            AdminState.categories = AdminState.categories.filter(c => c.id !== id);
            // Guardar en localStorage para persistencia
            saveDemoCategories(AdminState.categories);
            renderCategories(AdminState.categories);
            // Actualizar selectores de categoria en productos
            await loadProductCategories();
            showToast('Categoria eliminada correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando categoria:', error);
            showToast(error.message || 'Error al eliminar categoria', 'error');
        }
    }
}

async function handleCategorySave(e) {
    e.preventDefault();

    const id = document.getElementById('categoryId').value;
    const catData = {
        name: document.getElementById('categoryName').value,
        slug: document.getElementById('categoryName').value.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-'),
        image: document.getElementById('categoryImage').value || 'https://via.placeholder.com/100',
        active: document.getElementById('categoryActive').checked,
        position: AdminState.categories.length + 1
    };

    try {
        if (supabase) {
            if (id) {
                // Actualizar en Supabase
                const { error } = await supabase
                    .from('categories')
                    .update(catData)
                    .eq('id', parseInt(id));

                if (error) throw error;

                // Actualizar estado local
                const index = AdminState.categories.findIndex(c => c.id === parseInt(id));
                if (index > -1) {
                    catData.id = parseInt(id);
                    catData.products = AdminState.categories[index].products || 0;
                    AdminState.categories[index] = catData;
                }
            } else {
                // Insertar en Supabase
                const { data, error } = await supabase
                    .from('categories')
                    .insert(catData)
                    .select()
                    .single();

                if (error) throw error;

                // Agregar al estado local con el ID de Supabase
                catData.id = data.id;
                catData.products = 0;
                AdminState.categories.push(catData);
            }
        } else {
            // Modo demo - usar localStorage
            catData.id = id ? parseInt(id) : Date.now();
            catData.products = 0;

            if (id) {
                const index = AdminState.categories.findIndex(c => c.id === parseInt(id));
                if (index > -1) {
                    catData.products = AdminState.categories[index].products || 0;
                    catData.position = AdminState.categories[index].position;
                    AdminState.categories[index] = catData;
                }
            } else {
                AdminState.categories.push(catData);
            }
        }

        // Guardar en localStorage para persistencia
        saveDemoCategories(AdminState.categories);

        renderCategories(AdminState.categories);
        // Actualizar selectores de categoria en productos
        loadProductCategories();
        closeModal('categoryModal');
        showToast('Categoria guardada', 'success');
    } catch (error) {
        console.error('Error guardando categoria:', error);
        showToast('Error al guardar categoria', 'error');
    }
}

// =====================================================
// Resenas
// =====================================================

async function loadReviews() {
    const { data, error } = await supabase.from('reviews').select('*, products(name)').order('created_at', { ascending: false });
    if(error){
        console.error('Error fetching reviews:', error);
        return;
    }
    AdminState.reviews = data;
    renderReviews(data);
    updatePendingBadge();
}

function renderReviews(reviews) {
    const tbody = document.getElementById('reviewsTable');
    tbody.innerHTML = reviews.map(review => `
        <tr>
            <td>${review.date}</td>
            <td>${review.customer}<br><small>${review.email}</small></td>
            <td>${review.product}</td>
            <td><span class="stars">${'<i class="fas fa-star"></i>'.repeat(review.rating)}</span></td>
            <td>${review.comment.substring(0, 50)}...</td>
            <td><span class="status status-${review.status === 'approved' ? 'delivered' : review.status === 'pending' ? 'pending' : 'cancelled'}">${review.status === 'approved' ? 'Aprobada' : review.status === 'pending' ? 'Pendiente' : 'Rechazada'}</span></td>
            <td>
                ${review.status === 'pending' ? `
                    <button class="action-btn" style="color: var(--success);" onclick="approveReview(${review.id})" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="action-btn" style="color: var(--danger);" onclick="rejectReview(${review.id})" title="Rechazar">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
                <button class="action-btn delete" onclick="deleteReview(${review.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function approveReview(id) {
    const review = AdminState.reviews.find(r => r.id === id);
    if (review) {
        review.status = 'approved';
        renderReviews(AdminState.reviews);
        updatePendingBadge();
        showToast('Resena aprobada', 'success');
    }
}

function rejectReview(id) {
    const review = AdminState.reviews.find(r => r.id === id);
    if (review) {
        review.status = 'rejected';
        renderReviews(AdminState.reviews);
        updatePendingBadge();
        showToast('Resena rechazada', 'success');
    }
}

function deleteReview(id) {
    if (confirm('Eliminar esta resena?')) {
        AdminState.reviews = AdminState.reviews.filter(r => r.id !== id);
        renderReviews(AdminState.reviews);
        updatePendingBadge();
        showToast('Resena eliminada', 'success');
    }
}

function filterReviews() {
    const status = document.getElementById('reviewStatusFilter').value;
    let filtered = [...AdminState.reviews];
    if (status === 'pending') filtered = filtered.filter(r => r.status === 'pending');
    else if (status === 'approved') filtered = filtered.filter(r => r.status === 'approved');
    else if (status === 'rejected') filtered = filtered.filter(r => r.status === 'rejected');
    renderReviews(filtered);
}

function updatePendingBadge() {
    const pending = AdminState.reviews.filter(r => r.status === 'pending').length;
    document.getElementById('pendingReviewsBadge').textContent = pending;
    document.getElementById('pendingReviewsBadge').style.display = pending > 0 ? 'inline' : 'none';
}

// =====================================================
// Clientes
// =====================================================

async function loadCustomers() {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if(error){
        console.error('Error fetching customers:', error);
        return;
    }
    AdminState.customers = data;
    renderCustomers(data);
}

function renderCustomers(customers) {
    const tbody = document.getElementById('customersTable');
    tbody.innerHTML = customers.map(customer => `
        <tr>
            <td><strong>${customer.name}</strong></td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.orders}</td>
            <td>${formatPrice(customer.total)}</td>
            <td>${customer.lastOrder}</td>
            <td>
                <button class="action-btn view" onclick="viewCustomer(${customer.id})"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');
}

function viewCustomer(id) {
    const customer = AdminState.customers.find(c => c.id === id);
    if (customer) {
        showToast(`Cliente: ${customer.name} - ${customer.orders} pedidos`, 'info');
    }
}

// =====================================================
// Analiticas
// =====================================================

let charts = {};

async function loadAnalytics() {
    const periodDays = document.getElementById('analyticsPeriod').value;
    
    // Show loader
    const grid = document.querySelector('.analytics-grid-pro');
    if(grid) grid.style.opacity = 0.5;

    const kpiData = await getAnalyticsData(periodDays);
    if (kpiData) {
        document.getElementById('analyticsTotalRevenue').textContent = formatPrice(kpiData.totalRevenue);
        document.getElementById('analyticsTotalOrders').textContent = kpiData.totalOrders;
        document.getElementById('analyticsAvgOrderValue').textContent = formatPrice(kpiData.avgOrderValue);
        document.getElementById('analyticsNewCustomers').textContent = kpiData.newCustomers;
    }

    // Parallel data fetching
    const [salesData, topProducts, salesByCategory, customerGrowth, salesByComuna] = await Promise.all([
        getSalesData(periodDays),
        getTopProducts(periodDays),
        getSalesByCategory(periodDays),
        getCustomerGrowth(periodDays),
        getSalesByComuna(periodDays)
    ]);
    
    renderSalesChart(salesData);
    renderTopProductsChart(topProducts);
    renderCategoriesChart(salesByCategory);
    renderCustomersChart(customerGrowth);
    renderComunasChart(salesByComuna);

    // Hide loader
    if(grid) grid.style.opacity = 1;
}

function renderSalesChart(data) {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if(!ctx) return;
    if (charts.sales) charts.sales.destroy();

    const groupedData = data.reduce((acc, { created_at, total }) => {
        const date = new Date(created_at).toLocaleDateString('es-CL');
        acc[date] = (acc[date] || 0) + total;
        return acc;
    }, {});

    charts.sales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(groupedData),
            datasets: [{
                label: 'Ventas',
                data: Object.values(groupedData),
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(233, 30, 99, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart')?.getContext('2d');
    if(!ctx) return;
    if (charts.topProducts) charts.topProducts.destroy();

    charts.topProducts = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(p => p[0]),
            datasets: [{
                label: 'Cantidad Vendida',
                data: data.map(p => p[1]),
                backgroundColor: 'rgba(33, 150, 243, 0.7)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
    });
}

function renderCategoriesChart(data) {
    const ctx = document.getElementById('categoriesChart')?.getContext('2d');
    if(!ctx) return;
    if (charts.categories) charts.categories.destroy();

    charts.categories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(c => c[0]),
            datasets: [{
                data: data.map(c => c[1]),
                backgroundColor: [
                    'rgba(233, 30, 99, 0.7)',
                    'rgba(156, 39, 176, 0.7)',
                    'rgba(33, 150, 243, 0.7)',
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(244, 67, 54, 0.7)',
                ]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderCustomersChart(data) {
    const ctx = document.getElementById('customersChart')?.getContext('2d');
    if(!ctx) return;
    if (charts.customers) charts.customers.destroy();
    
    const groupedData = data.reduce((acc, { created_at }) => {
        const date = new Date(created_at).toLocaleDateString('es-CL');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    charts.customers = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(groupedData),
            datasets: [{
                label: 'Nuevos Clientes',
                data: Object.values(groupedData),
                borderColor: 'var(--success)',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderComunasChart(data) {
    const ctx = document.getElementById('comunasChart')?.getContext('2d');
    if(!ctx) return;
    if (charts.comunas) charts.comunas.destroy();

    charts.comunas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(c => c[0]),
            datasets: [{
                label: 'Ventas por Comuna',
                data: data.map(c => c[1]),
                backgroundColor: 'rgba(255, 152, 0, 0.7)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}


document.getElementById('analyticsPeriod')?.addEventListener('change', loadAnalytics);
document.getElementById('downloadPdfReport')?.addEventListener('click', () => downloadReport('pdf'));
document.getElementById('downloadXlsxReport')?.addEventListener('click', () => downloadReport('xlsx'));

async function downloadReport(format) {
    showToast(`Generando reporte ${format.toUpperCase()}...`, 'info');
    const periodDays = document.getElementById('analyticsPeriod').value;
    const [salesData, topProducts, salesByCategory] = await Promise.all([
        getSalesData(periodDays),
        getTopProducts(periodDays),
        getSalesByCategory(periodDays)
    ]);

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text("Reporte de Analíticas", 14, 16);
        doc.autoTable({
            startY: 20,
            head: [['Fecha', 'Venta']],
            body: salesData.map(d => [new Date(d.created_at).toLocaleDateString('es-CL'), formatPrice(d.total)])
        });
        doc.save(`reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`);

    } else if (format === 'xlsx') {
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(salesData.map(d => ({ Fecha: new Date(d.created_at).toLocaleDateString('es-CL'), Venta: d.total })));
        XLSX.utils.book_append_sheet(wb, ws1, 'Ventas');
        
        const ws2 = XLSX.utils.json_to_sheet(topProducts.map(p => ({ Producto: p[0], Cantidad: p[1] })));
        XLSX.utils.book_append_sheet(wb, ws2, 'Top Productos');

        const ws3 = XLSX.utils.json_to_sheet(salesByCategory.map(c => ({ Categoria: c[0], Venta: c[1] })));
        XLSX.utils.book_append_sheet(wb, ws3, 'Ventas por Categoria');

        XLSX.writeFile(wb, `reporte-analiticas-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    showToast(`Reporte ${format.toUpperCase()} descargado`, 'success');
}

// =====================================================
// SII / IVA
// =====================================================

async function loadSiiData() {
    const month = document.getElementById('siiMonth').value;
    const year = document.getElementById('siiYear').value;

    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0);

    const { data, error } = await supabase.from('orders')
        .select('*')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

    if (error) {
        console.error('Error fetching SII data:', error);
        return;
    }

    const grossSales = data.reduce((sum, order) => sum + order.total, 0);
    const netSales = Math.round(grossSales / 1.19);
    const iva = grossSales - netSales;

    document.getElementById('siiGross').textContent = formatPrice(grossSales);
    document.getElementById('siiNet').textContent = formatPrice(netSales);
    document.getElementById('siiIva').textContent = formatPrice(iva);
    document.getElementById('siiCount').textContent = data.length;

    document.getElementById('siiOrdersTable').innerHTML = data.map(sale => `
        <tr>
            <td>${new Date(sale.created_at).toLocaleDateString('es-CL')}</td>
            <td>${sale.order_number}</td>
            <td>${sale.customer_name}</td>
            <td>${formatPrice(sale.total - sale.iva)}</td>
            <td>${formatPrice(sale.iva)}</td>
            <td><strong>${formatPrice(sale.total)}</strong></td>
        </tr>
    `).join('');
}

function generateSiiReport() {
    showToast('Generando informe PDF... (Funcionalidad para implementar)', 'info');
}

// =====================================================
// New Order Notification
// =====================================================

/**
 * Muestra una notificacion de nuevo pedido
 * @param {object} order - El objeto del pedido
 * @requires an audio file at assets/sounds/mixkit-retro-game-notification-212.wav
 */
function showNewOrderNotification(order) {
    const audio = new Audio('assets/sounds/mixkit-retro-game-notification-212.wav');
    audio.play().catch(error => {
        console.warn('No se pudo reproducir el sonido de notificacion. Asegurate de que el archivo de audio exista en la ruta correcta.', error);
    });

    document.getElementById('newOrderNumber').textContent = order.number;
    document.getElementById('newOrderCustomer').textContent = order.customer;
    document.getElementById('newOrderTotal').textContent = formatPrice(order.total);

    openModal('newOrderModal');
}

// =====================================================
// Device Tracking
// =====================================================

async function loadDeviceTracking() {
    const { devices, total } = await getDeviceTracking();
    AdminState.devices = devices;
    renderDeviceTracking(devices);
}

function renderDeviceTracking(devices) {
    const tbody = document.getElementById('deviceTrackingTable');
    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay dispositivos</td></tr>';
        return;
    }

    tbody.innerHTML = devices.map(device => `
        <tr>
            <td>${device.user_agent}</td>
            <td>${device.ip_address || 'N/A'}</td>
            <td>${new Date(device.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

function searchDevices(e) {
    const query = e.target.value.toLowerCase();
    const filtered = AdminState.devices.filter(d =>
        d.user_agent.toLowerCase().includes(query)
    );
    renderDeviceTracking(filtered);
}

// =====================================================
// Settings
// =====================================================

function saveStoreSettings(e) {
    e.preventDefault();
    showToast('Configuracion guardada', 'success');
}

function saveShippingSettings(e) {
    e.preventDefault();
    showToast('Configuracion de envios guardada', 'success');
}

function changePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;

    if (newPass !== confirmPass) {
        showToast('Las contrasenas no coinciden', 'error');
        return;
    }

    showToast('Contrasena actualizada', 'success');
    document.getElementById('passwordForm').reset();
}

// =====================================================
// Image Preview & Download
// =====================================================

function openImagePreview(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.innerHTML = `
        <div class="image-preview-backdrop" onclick="this.parentElement.remove()"></div>
        <div class="image-preview-content">
            <button class="image-preview-close" onclick="this.closest('.image-preview-modal').remove()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageUrl}" alt="Vista previa">
            <div class="image-preview-actions">
                <button onclick="downloadCustomerImage('${imageUrl}', 'imagen_cliente')" class="btn btn-primary">
                    <i class="fas fa-download"></i> Descargar Imagen
                </button>
                <a href="${imageUrl}" target="_blank" class="btn btn-outline">
                    <i class="fas fa-external-link-alt"></i> Abrir Original
                </a>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function downloadCustomerImage(imageUrl, filename) {
    try {
        showToast('Iniciando descarga...', 'info');

        const response = await fetch(imageUrl);
        const blob = await response.blob();

        const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
        const downloadFilename = `${filename}.${extension}`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Imagen descargada exitosamente', 'success');
    } catch (error) {
        console.error('Error descargando imagen:', error);
        // Fallback: abrir en nueva pestana
        window.open(imageUrl, '_blank');
        showToast('Imagen abierta en nueva pestana', 'info');
    }
}

// =====================================================
// Image Upload Functionality
// =====================================================

// Estado para imagenes adicionales
let additionalImages = [];

function initImageUpload(existingImages = []) {
    const mainUploadArea = document.getElementById('mainImageUpload');
    const additionalImagesGrid = document.getElementById('additionalImagesGrid');

    if (mainUploadArea) {
        // Crear input file oculto para imagen principal
        let mainFileInput = document.getElementById('mainImageFileInput');
        if (!mainFileInput) {
            mainFileInput = document.createElement('input');
            mainFileInput.type = 'file';
            mainFileInput.id = 'mainImageFileInput';
            mainFileInput.accept = 'image/jpeg,image/png,image/webp';
            mainFileInput.style.display = 'none';
            mainUploadArea.parentElement.appendChild(mainFileInput);
        }

        // Click en area de subida
        mainUploadArea.addEventListener('click', () => {
            mainFileInput.click();
        });

        // Cambio de archivo
        mainFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleMainImageFile(file);
            }
        });

        // Drag and drop
        mainUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            mainUploadArea.classList.add('dragover');
        });

        mainUploadArea.addEventListener('dragleave', () => {
            mainUploadArea.classList.remove('dragover');
        });

        mainUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            mainUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleMainImageFile(file);
            } else {
                showToast('Por favor selecciona una imagen valida (JPG, PNG)', 'error');
            }
        });
    }

    // Inicializar imagenes adicionales con las existentes
    if (additionalImagesGrid) {
        additionalImages = [...existingImages];
        renderAdditionalImages();
    }
}

function handleMainImageFile(file) {
    // Validar tamano (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('La imagen no debe superar 5MB', 'error');
        return;
    }

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Formato no soportado. Usa JPG, PNG o WebP', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;

        // Actualizar preview
        const mainUploadArea = document.getElementById('mainImageUpload');
        mainUploadArea.innerHTML = `
            <img src="${imageData}" alt="Preview" class="image-preview">
            <div class="image-upload-overlay">
                <i class="fas fa-camera"></i>
                <span>Cambiar imagen</span>
            </div>
        `;

        // Guardar en el input de texto
        document.getElementById('productImage').value = imageData;

        showToast('Imagen cargada correctamente', 'success');
    };
    reader.readAsDataURL(file);
}

function renderAdditionalImages() {
    const grid = document.getElementById('additionalImagesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Renderizar imagenes existentes
    additionalImages.forEach((img, index) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'additional-image-item';
        imgDiv.innerHTML = `
            <img src="${img}" alt="Imagen ${index + 1}">
            <button type="button" class="remove-additional-image" onclick="removeAdditionalImage(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        grid.appendChild(imgDiv);
    });

    // Agregar boton para nueva imagen si hay menos de 5
    if (additionalImages.length < 5) {
        const addBtn = document.createElement('div');
        addBtn.className = 'add-image-btn';
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.onclick = () => openAdditionalImagePicker();
        grid.appendChild(addBtn);
    }
}

function openAdditionalImagePicker() {
    let additionalFileInput = document.getElementById('additionalImageFileInput');
    if (!additionalFileInput) {
        additionalFileInput = document.createElement('input');
        additionalFileInput.type = 'file';
        additionalFileInput.id = 'additionalImageFileInput';
        additionalFileInput.accept = 'image/jpeg,image/png,image/webp';
        additionalFileInput.style.display = 'none';
        document.body.appendChild(additionalFileInput);

        additionalFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleAdditionalImageFile(file);
            }
            // Reset input para permitir seleccionar el mismo archivo
            additionalFileInput.value = '';
        });
    }
    additionalFileInput.click();
}

function handleAdditionalImageFile(file) {
    // Validar tamano (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('La imagen no debe superar 5MB', 'error');
        return;
    }

    // Validar tipo
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Formato no soportado. Usa JPG, PNG o WebP', 'error');
        return;
    }

    // Validar cantidad
    if (additionalImages.length >= 5) {
        showToast('Maximo 5 imagenes adicionales', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        additionalImages.push(e.target.result);
        renderAdditionalImages();
        showToast('Imagen adicional agregada', 'success');
    };
    reader.readAsDataURL(file);
}

function removeAdditionalImage(index) {
    additionalImages.splice(index, 1);
    renderAdditionalImages();
    showToast('Imagen eliminada', 'success');
}

// =====================================================
// Helpers
// =====================================================

function formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(price);
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        preparing: 'En Preparacion',
        ready: 'Listo',
        shipped: 'Despachado',
        delivered: 'Entregado',
        cancelled: 'Cancelado'
    };
    return labels[status] || status;
}

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Estilos adicionales para top items
const style = document.createElement('style');
style.textContent = `
    .top-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--gray-200); }
    .top-item:last-child { border-bottom: none; }
    .order-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .order-info-grid h4 { margin-bottom: 8px; color: var(--gray-600); font-size: 13px; }
`;
document.head.appendChild(style);
