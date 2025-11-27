/* =====================================================
   CARRITO DE COMPRAS
   ===================================================== */

const Cart = {
    items: [],
    isOpen: false,

    // =====================================================
    // Inicializacion
    // =====================================================

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
    },

    // =====================================================
    // Eventos
    // =====================================================

    bindEvents() {
        // Boton abrir carrito
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.open());
        }

        // Boton cerrar carrito
        const closeCart = document.getElementById('closeCart');
        if (closeCart) {
            closeCart.addEventListener('click', () => this.close());
        }

        // Overlay
        const cartOverlay = document.getElementById('cartOverlay');
        if (cartOverlay) {
            cartOverlay.addEventListener('click', () => this.close());
        }

        // Continuar comprando
        const continueShopping = document.getElementById('continueShopping');
        if (continueShopping) {
            continueShopping.addEventListener('click', () => {
                this.close();
                Utils.scrollToElement('productos');
            });
        }

        const continueShoppingEmpty = document.getElementById('continueShoppingEmpty');
        if (continueShoppingEmpty) {
            continueShoppingEmpty.addEventListener('click', () => {
                this.close();
                Utils.scrollToElement('productos');
            });
        }

        // Boton checkout
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.openCheckout());
        }

        // Formulario de checkout
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.handleCheckout(e));
        }

        // Cerrar modal checkout
        const closeCheckoutModal = document.getElementById('closeCheckoutModal');
        if (closeCheckoutModal) {
            closeCheckoutModal.addEventListener('click', () => Utils.closeModal('checkoutModal'));
        }

        // Cambio de comuna para calcular envio
        const customerComuna = document.getElementById('customerComuna');
        if (customerComuna) {
            customerComuna.addEventListener('change', () => this.updateCheckoutTotals());
        }

        // Formatear RUT mientras escribe
        const customerRut = document.getElementById('customerRut');
        if (customerRut) {
            customerRut.addEventListener('input', (e) => {
                e.target.value = Utils.formatRut(e.target.value);
            });
        }
    },

    // =====================================================
    // Operaciones del Carrito
    // =====================================================

    addItem(product, quantity = 1, customization = null) {
        // Generar ID unico para el item (producto + personalizacion)
        const itemId = this.generateItemId(product.id, customization);

        // Buscar si ya existe el item
        const existingIndex = this.items.findIndex(item => item.itemId === itemId);

        if (existingIndex > -1) {
            // Actualizar cantidad
            this.items[existingIndex].quantity += quantity;
        } else {
            // Calcular precio con descuento si aplica
            let finalPrice = product.price;
            if (product.quantity_discounts && product.quantity_discounts.length > 0) {
                finalPrice = Utils.calculateQuantityDiscount(product.price, quantity, product.quantity_discounts);
            }

            // Agregar nuevo item
            this.items.push({
                itemId,
                product_id: product.id,
                name: product.name,
                price: finalPrice,
                originalPrice: product.price,
                image: product.images?.[0]?.url || 'https://via.placeholder.com/100',
                quantity,
                customization,
                quantity_discounts: product.quantity_discounts || []
            });
        }

        this.saveToStorage();
        this.updateUI();
        this.open();

        Utils.showToast(`${product.name} agregado al carrito`, 'success');
    },

    removeItem(itemId) {
        this.items = this.items.filter(item => item.itemId !== itemId);
        this.saveToStorage();
        this.updateUI();
    },

    updateQuantity(itemId, quantity) {
        const item = this.items.find(item => item.itemId === itemId);
        if (item) {
            if (quantity <= 0) {
                this.removeItem(itemId);
            } else {
                item.quantity = quantity;
                // Recalcular precio con descuento por cantidad
                if (item.quantity_discounts && item.quantity_discounts.length > 0) {
                    item.price = Utils.calculateQuantityDiscount(item.originalPrice, quantity, item.quantity_discounts);
                }
                this.saveToStorage();
                this.updateUI();
            }
        }
    },

    clear() {
        this.items = [];
        this.saveToStorage();
        this.updateUI();
    },

    // =====================================================
    // Calculos
    // =====================================================

    getSubtotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getTotalSavings() {
        return this.items.reduce((sum, item) => {
            if (item.originalPrice && item.price < item.originalPrice) {
                const savings = (item.originalPrice - item.price) * item.quantity;
                return sum + savings;
            }
            return sum;
        }, 0);
    },

    getItemCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    getShipping(comuna) {
        const subtotal = this.getSubtotal();
        return Utils.calculateShipping(comuna, subtotal);
    },

    getTotal(comuna) {
        return this.getSubtotal() + this.getShipping(comuna);
    },

    // =====================================================
    // UI
    // =====================================================

    open() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');

        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');

        document.body.style.overflow = 'hidden';
        this.isOpen = true;
    },

    close() {
        const sidebar = document.getElementById('cartSidebar');
        const overlay = document.getElementById('cartOverlay');

        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        document.body.style.overflow = '';
        this.isOpen = false;
    },

    updateUI() {
        this.updateCount();
        this.renderItems();
        this.updateTotals();
    },

    updateCount() {
        const countElement = document.getElementById('cartCount');
        if (countElement) {
            const count = this.getItemCount();
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    renderItems() {
        const container = document.getElementById('cartItems');
        const emptyMessage = document.getElementById('cartEmpty');
        const footer = document.getElementById('cartFooter');

        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = '';
            if (emptyMessage) emptyMessage.style.display = 'block';
            if (footer) footer.style.display = 'none';
            return;
        }

        if (emptyMessage) emptyMessage.style.display = 'none';
        if (footer) footer.style.display = 'block';

        container.innerHTML = this.items.map(item => `
            <div class="cart-item" data-item-id="${item.itemId}">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-name">${item.name}</h4>
                    ${this.renderCustomization(item.customization)}
                    <div class="cart-item-pricing">
                        ${item.originalPrice && item.price < item.originalPrice ? `
                            <span class="cart-item-original-price">${Utils.formatPrice(item.originalPrice)}</span>
                            <span class="cart-item-discount-badge">-${Math.round((1 - item.price / item.originalPrice) * 100)}% DTO</span>
                        ` : ''}
                        <span class="cart-item-price">${Utils.formatPrice(item.price)}</span>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-decrease" data-item-id="${item.itemId}">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-increase" data-item-id="${item.itemId}">+</button>
                    </div>
                    <button class="cart-item-remove" data-item-id="${item.itemId}">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');

        // Bind eventos de cantidad
        container.querySelectorAll('.qty-decrease').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.itemId;
                const item = this.items.find(i => i.itemId === itemId);
                if (item) this.updateQuantity(itemId, item.quantity - 1);
            });
        });

        container.querySelectorAll('.qty-increase').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.itemId;
                const item = this.items.find(i => i.itemId === itemId);
                if (item) this.updateQuantity(itemId, item.quantity + 1);
            });
        });

        container.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeItem(btn.dataset.itemId);
            });
        });
    },

    renderCustomization(customization) {
        if (!customization) return '';

        let html = '<div class="cart-item-customization">';

        if (customization.text) {
            html += `<small>Texto: "${customization.text.substring(0, 30)}${customization.text.length > 30 ? '...' : ''}"</small>`;
        }

        if (customization.imageUrl) {
            html += '<small><i class="fas fa-image"></i> Imagen adjunta</small>';
        }

        html += '</div>';
        return html;
    },

    updateTotals() {
        const subtotalElement = document.getElementById('cartSubtotal');
        if (subtotalElement) {
            subtotalElement.textContent = Utils.formatPrice(this.getSubtotal());
        }

        // Mostrar ahorro total si hay descuentos
        const savings = this.getTotalSavings();
        const savingsContainer = document.getElementById('cartSavings');
        const savingsAmount = document.getElementById('cartSavingsAmount');

        if (savingsContainer && savingsAmount) {
            if (savings > 0) {
                savingsAmount.textContent = Utils.formatPrice(savings);
                savingsContainer.style.display = 'flex';
            } else {
                savingsContainer.style.display = 'none';
            }
        }
    },

    // =====================================================
    // Checkout
    // =====================================================

    openCheckout() {
        if (this.items.length === 0) {
            Utils.showToast('Tu carrito esta vacio', 'warning');
            return;
        }

        this.close();
        this.loadComunas();
        this.renderOrderSummary();
        Utils.openModal('checkoutModal');
    },

    loadComunas() {
        const select = document.getElementById('customerComuna');
        if (!select) return;

        select.innerHTML = '<option value="">Selecciona tu comuna</option>';
        CONFIG.comunas.forEach(comuna => {
            const option = document.createElement('option');
            option.value = comuna;
            option.textContent = comuna;
            select.appendChild(option);
        });
    },

    renderOrderSummary() {
        const container = document.getElementById('orderSummary');
        if (!container) return;

        container.innerHTML = this.items.map(item => `
            <div class="order-item">
                <div>
                    <div class="order-item-name">${item.name}</div>
                    <div class="order-item-qty">Cantidad: ${item.quantity}</div>
                </div>
                <div>${Utils.formatPrice(item.price * item.quantity)}</div>
            </div>
        `).join('');

        this.updateCheckoutTotals();
    },

    updateCheckoutTotals() {
        const comuna = document.getElementById('customerComuna')?.value || '';
        const subtotal = this.getSubtotal();
        const shipping = this.getShipping(comuna);
        const total = subtotal + shipping;
        const savings = this.getTotalSavings();

        const subtotalEl = document.getElementById('summarySubtotal');
        const shippingEl = document.getElementById('summaryShipping');
        const shippingComunaEl = document.getElementById('shippingComuna');
        const totalEl = document.getElementById('summaryTotal');
        const savingsEl = document.getElementById('summarySavings');
        const savingsRowEl = document.getElementById('summarySavingsRow');

        if (subtotalEl) subtotalEl.textContent = Utils.formatPrice(subtotal);
        if (shippingEl) shippingEl.textContent = shipping === 0 ? 'GRATIS' : Utils.formatPrice(shipping);
        if (shippingComunaEl) shippingComunaEl.textContent = comuna || '-';
        if (totalEl) totalEl.textContent = Utils.formatPrice(total);

        // Mostrar ahorro si existe
        if (savingsEl && savingsRowEl) {
            if (savings > 0) {
                savingsEl.textContent = Utils.formatPrice(savings);
                savingsRowEl.style.display = 'flex';
            } else {
                savingsRowEl.style.display = 'none';
            }
        }
    },

    async handleCheckout(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);

        // Validaciones
        const name = document.getElementById('customerName').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const rut = document.getElementById('customerRut').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const comuna = document.getElementById('customerComuna').value;

        if (!name || !email || !phone || !address || !comuna) {
            Utils.showToast('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Por favor ingresa un email valido', 'error');
            return;
        }

        if (!Utils.validatePhone(phone)) {
            Utils.showToast('Por favor ingresa un numero de WhatsApp valido', 'error');
            return;
        }

        if (rut && !Utils.validateRut(rut)) {
            Utils.showToast('Por favor ingresa un RUT valido', 'error');
            return;
        }

        const subtotal = this.getSubtotal();
        const shipping = this.getShipping(comuna);
        const total = subtotal + shipping;

        // Datos del pedido
        const orderData = {
            customer: {
                name,
                email,
                phone,
                rut: rut ? Utils.formatRut(rut) : null,
                address,
                comuna,
                city: 'Santiago'
            },
            items: this.items,
            subtotal,
            shipping_cost: shipping,
            total,
            comuna
        };

        // Crear orden en base de datos
        const result = await createOrder(orderData);

        if (result.success) {
            // Generar mensaje de WhatsApp
            const whatsappMessage = Utils.generateWhatsAppMessage(orderData);
            const whatsappUrl = `https://wa.me/${CONFIG.store.whatsapp}?text=${whatsappMessage}`;

            // Limpiar carrito
            this.clear();
            Utils.closeModal('checkoutModal');

            // Mostrar mensaje y redirigir a WhatsApp
            Utils.showToast('Pedido creado! Redirigiendo a WhatsApp...', 'success');

            setTimeout(() => {
                window.open(whatsappUrl, '_blank');
            }, 1000);
        } else {
            Utils.showToast(result.message || 'Error al procesar el pedido', 'error');
        }
    },

    // =====================================================
    // Storage
    // =====================================================

    saveToStorage() {
        Utils.saveToStorage('cart', this.items);
    },

    loadFromStorage() {
        this.items = Utils.getFromStorage('cart', []);
    },

    // =====================================================
    // Helpers
    // =====================================================

    generateItemId(productId, customization) {
        const customStr = customization
            ? JSON.stringify(customization)
            : '';
        return `${productId}_${btoa(customStr).substring(0, 10)}`;
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => Cart.init());

// Exportar para uso global
window.Cart = Cart;
