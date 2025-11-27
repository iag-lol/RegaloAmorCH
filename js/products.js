/* =====================================================
   GESTION DE PRODUCTOS
   ===================================================== */

// Construye URL pública del bucket si la ruta no es absoluta
function resolveImageUrl(path) {
    if (!path) return null;
    // Data URLs o blobs (cargadas desde FileReader) se devuelven tal cual
    if (/^(data:|blob:)/i.test(path)) return path;
    if (/^https?:\/\//i.test(path)) return path;
    // Evitar dobles slashes
    const base = `${CONFIG.supabase.url}/storage/v1/object/public`.replace(/\/+$/, '');
    const cleanPath = String(path).replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
}

const Products = {
    products: [],
    categories: [],
    currentCategory: 'todos',
    currentSort: 'newest',
    currentPage: 0,
    hasMore: true,
    isLoading: false,
    currentProduct: null,
    uploadedImage: null,

    // =====================================================
    // Inicializacion
    // =====================================================

    async init() {
        await this.loadCategories();
        await this.loadProducts();
        this.bindEvents();
    },

    // =====================================================
    // Carga de Datos
    // =====================================================

    async loadCategories() {
        try {
            this.categories = await getCategories();
            this.renderCategoryFilters();
            this.renderCategoriesCarousel();
            this.renderFooterCategories();
        } catch (error) {
            console.error('Error cargando categorias:', error);
        }
    },

    async loadProducts(append = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoader();

        try {
            const options = {
                category: this.currentCategory,
                sort: this.currentSort,
                offset: append ? this.products.length : 0,
                limit: CONFIG.products.perPage
            };

            const result = await getProducts(options);

            if (append) {
                this.products = [...this.products, ...result.products];
            } else {
                this.products = result.products;
            }

            this.hasMore = result.products.length === CONFIG.products.perPage;
            this.renderProducts(append);
            this.updateLoadMoreButton();
        } catch (error) {
            console.error('Error cargando productos:', error);
            Utils.showToast('Error al cargar productos', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoader();
        }
    },

    // =====================================================
    // Eventos
    // =====================================================

    bindEvents() {
        // Filtros de categoria
        document.getElementById('categoryFilters')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tab')) {
                this.filterByCategory(e.target.dataset.category);
            }
        });

        // Ordenamiento
        document.getElementById('sortProducts')?.addEventListener('change', (e) => {
            this.sortProducts(e.target.value);
        });

        // Cargar mas
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
            this.loadProducts(true);
        });

        // Modal de producto
        this.bindProductModalEvents();
    },

    bindProductModalEvents() {
        // Cerrar modal
        document.getElementById('closeProductModal')?.addEventListener('click', () => {
            Utils.closeModal('productModal');
        });

        // Cantidad
        document.getElementById('qtyMinus')?.addEventListener('click', () => {
            const input = document.getElementById('productQty');
            if (input && parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
                this.updatePriceDisplay();
            }
        });

        document.getElementById('qtyPlus')?.addEventListener('click', () => {
            const input = document.getElementById('productQty');
            if (input && parseInt(input.value) < 100) {
                input.value = parseInt(input.value) + 1;
                this.updatePriceDisplay();
            }
        });

        document.getElementById('productQty')?.addEventListener('change', (e) => {
            let value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 100) value = 100;
            e.target.value = value;
            this.updatePriceDisplay();
        });

        // Subir imagen
        const imageUploadArea = document.getElementById('imageUploadArea');
        const customImageInput = document.getElementById('customImage');

        if (imageUploadArea && customImageInput) {
            imageUploadArea.addEventListener('click', () => customImageInput.click());

            imageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                imageUploadArea.classList.add('dragover');
            });

            imageUploadArea.addEventListener('dragleave', () => {
                imageUploadArea.classList.remove('dragover');
            });

            imageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                imageUploadArea.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) this.handleImageUpload(file);
            });

            customImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.handleImageUpload(file);
            });
        }

        document.getElementById('removeImage')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeUploadedImage();
        });

        // Agregar al carrito
        document.getElementById('addToCartBtn')?.addEventListener('click', () => {
            this.addCurrentProductToCart();
        });
    },

    // =====================================================
    // Filtrado y Ordenamiento
    // =====================================================

    filterByCategory(category) {
        this.currentCategory = category;
        this.currentPage = 0;

        // Actualizar UI de tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });

        this.loadProducts();
    },

    sortProducts(sort) {
        this.currentSort = sort;
        this.currentPage = 0;
        this.loadProducts();
    },

    // =====================================================
    // Renderizado
    // =====================================================

    renderCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;

        container.innerHTML = `
            <button class="filter-tab active" data-category="todos">Todos</button>
            ${this.categories.map(cat => `
                <button class="filter-tab" data-category="${cat.slug}">${cat.name}</button>
            `).join('')}
        `;
    },

    renderCategoriesCarousel() {
        const container = document.getElementById('categoriesContainer');
        if (!container || this.categories.length === 0) return;

        container.innerHTML = this.categories.map(cat => `
            <div class="swiper-slide">
                <div class="category-card" data-category="${cat.slug}">
                    <img src="${cat.image}" alt="${cat.name}" loading="lazy">
                    <div class="category-overlay">
                        <h3>${cat.name}</h3>
                        <span>${cat.product_count || 0} productos</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Click en categoria
        container.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', () => {
                this.filterByCategory(card.dataset.category);
                Utils.scrollToElement('productos');
            });
        });

        // Inicializar Swiper de categorias
        new Swiper('.categories-slider', {
            slidesPerView: 2,
            spaceBetween: 15,
            pagination: { el: '.swiper-pagination', clickable: true },
            breakpoints: {
                640: { slidesPerView: 3 },
                768: { slidesPerView: 4 },
                1024: { slidesPerView: 5 }
            }
        });
    },

    renderFooterCategories() {
        const container = document.getElementById('footerCategories');
        if (!container) return;

        container.innerHTML = this.categories.slice(0, 5).map(cat => `
            <li><a href="#productos" data-category="${cat.slug}">${cat.name}</a></li>
        `).join('');

        container.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByCategory(link.dataset.category);
                Utils.scrollToElement('productos');
            });
        });
    },

    renderProducts(append = false) {
        const container = document.getElementById('productsGrid');
        if (!container) return;

        const html = this.products.map(product => this.renderProductCard(product)).join('');

        if (append) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            container.innerHTML = html;
        }

        // Bind click events
        container.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openProductModal(card.dataset.productId);
            });
        });

        // Quick add to cart
        container.querySelectorAll('.quick-add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.dataset.productId;
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    Cart.addItem(product, 1);
                }
            });
        });
    },

    renderProductCard(product) {
        const hasDiscount = product.discount > 0;
        // Compatibilidad: imágenes pueden venir como objetos {url}, array de strings o string suelta
        const placeholderImg = 'https://placehold.co/300x300/e5e7eb/6b7280?text=Producto';
        const images = product.images;
        let mainImage = product.image || placeholderImg;

        if (Array.isArray(images)) {
            const first = images[0];
            mainImage = resolveImageUrl(typeof first === 'string' ? first : first?.url) || resolveImageUrl(product.image) || placeholderImg;
        } else if (typeof images === 'string') {
            mainImage = resolveImageUrl(images) || placeholderImg;
        } else {
            mainImage = resolveImageUrl(mainImage) || placeholderImg;
        }

        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    <img src="${mainImage}"
                         alt="${product.name}" loading="lazy">
                    ${hasDiscount ? `<span class="product-badge sale">-${product.discount}%</span>` : ''}
                    <div class="product-actions-quick">
                        <button class="quick-action quick-add-cart" data-product-id="${product.id}" title="Agregar al carrito">
                            <i class="fas fa-cart-plus"></i>
                        </button>
                        <button class="quick-action" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${product.category?.name || ''}</span>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-rating">
                        ${Utils.renderStars(product.avg_rating || 0)}
                        <span>(${product.review_count || 0})</span>
                    </div>
                    <div class="product-price-container">
                        <span class="product-price">${Utils.formatPrice(product.price)}</span>
                        ${product.original_price ? `
                            <span class="product-original-price">${Utils.formatPrice(product.original_price)}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    // =====================================================
    // Modal de Producto
    // =====================================================

    async openProductModal(productId) {
        // Buscar producto en memoria o cargar de BD
        let product = this.products.find(p => p.id === productId);

        if (!product) {
            product = await getProductById(productId);
        }

        if (!product) {
            Utils.showToast('Producto no encontrado', 'error');
            return;
        }

        this.currentProduct = product;
        this.uploadedImage = null;

        // Llenar modal
        const modal = document.getElementById('productModal');
        if (!modal) return;

        // Imagen principal (soporta array de strings, array de objetos o string suelta)
        const placeholderImg = 'https://placehold.co/500x500/e5e7eb/6b7280?text=Producto';
        const images = product.images;
        let mainImage = product.image || placeholderImg;

        if (Array.isArray(images)) {
            const first = images[0];
            mainImage = resolveImageUrl(typeof first === 'string' ? first : first?.url) || resolveImageUrl(product.image) || placeholderImg;
        } else if (typeof images === 'string') {
            mainImage = resolveImageUrl(images) || placeholderImg;
        } else {
            mainImage = resolveImageUrl(mainImage) || placeholderImg;
        }

        document.getElementById('modalMainImage').src = mainImage;
        document.getElementById('modalMainImage').alt = product.name;

        // Badge
        const badge = document.getElementById('modalBadge');
        if (product.discount > 0) {
            badge.textContent = `-${product.discount}%`;
            badge.className = 'product-badge sale';
            badge.style.display = 'block';
        } else if (product.featured) {
            badge.textContent = 'Destacado';
            badge.className = 'product-badge new';
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }

        // Thumbnails
        const thumbContainer = document.getElementById('modalThumbnails');
        if (Array.isArray(product.images) && product.images.length > 1) {
            thumbContainer.innerHTML = product.images.map((img, i) => {
                const url = resolveImageUrl(typeof img === 'string' ? img : img?.url);
                return `
                <div class="thumbnail ${i === 0 ? 'active' : ''}" data-image="${url}">
                    <img src="${url}" alt="${product.name}">
                </div>
            `;
            }).join('');

            thumbContainer.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    document.getElementById('modalMainImage').src = thumb.dataset.image;
                    thumbContainer.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });

            thumbContainer.style.display = 'flex';
        } else {
            thumbContainer.style.display = 'none';
        }

        // Info
        document.getElementById('modalCategory').textContent = product.category?.name || '';
        document.getElementById('modalTitle').textContent = product.name;
        document.getElementById('modalDescription').textContent = product.description;

        // Rating
        document.getElementById('modalRating').innerHTML = `
            ${Utils.renderStars(product.avg_rating || 0)}
            <span>(${product.review_count || 0} opiniones)</span>
        `;

        // Precio
        document.getElementById('modalPrice').textContent = Utils.formatPrice(product.price);

        const originalPriceEl = document.getElementById('modalOriginalPrice');
        const discountEl = document.getElementById('modalDiscount');

        if (product.original_price) {
            originalPriceEl.textContent = Utils.formatPrice(product.original_price);
            originalPriceEl.style.display = 'inline';
            discountEl.textContent = `-${product.discount}%`;
            discountEl.style.display = 'inline';
        } else {
            originalPriceEl.style.display = 'none';
            discountEl.style.display = 'none';
        }

        // Descuentos por cantidad
        const quantityDiscountsSection = document.getElementById('modalQuantityDiscounts');
        const quantityDiscountsList = document.getElementById('quantityDiscountsList');

        console.log('🔍 DEBUG - Descuentos del producto:', product.quantity_discounts);

        if (product.quantity_discounts && product.quantity_discounts.length > 0) {
            console.log('✅ Mostrando', product.quantity_discounts.length, 'descuentos');
            quantityDiscountsList.innerHTML = product.quantity_discounts.map(d => `
                <li><i class="fas fa-check"></i> ${d.min_quantity}+ unidades: <strong>${d.discount_percentage}% descuento</strong></li>
            `).join('');
            quantityDiscountsSection.style.display = 'block';
        } else {
            console.log('❌ NO hay descuentos para este producto');
            quantityDiscountsSection.style.display = 'none';
        }

        // Reset campos
        document.getElementById('customText').value = '';
        document.getElementById('customNotes').value = '';
        document.getElementById('productQty').value = '1';
        this.removeUploadedImage();

        Utils.openModal('productModal');
    },

    updatePriceDisplay() {
        if (!this.currentProduct) return;

        const qty = parseInt(document.getElementById('productQty').value) || 1;
        let price = this.currentProduct.price;

        console.log('💰 DEBUG - Actualizando precio:', {
            cantidad: qty,
            precioOriginal: price,
            tieneDescuentos: !!this.currentProduct.quantity_discounts?.length
        });

        if (this.currentProduct.quantity_discounts && this.currentProduct.quantity_discounts.length > 0) {
            const newPrice = Utils.calculateQuantityDiscount(price, qty, this.currentProduct.quantity_discounts);
            console.log('💰 Precio con descuento:', newPrice);
            price = newPrice;
        }

        document.getElementById('modalPrice').textContent = Utils.formatPrice(price);

        // Mostrar ahorro si hay descuento por cantidad
        if (price < this.currentProduct.price) {
            const savings = this.currentProduct.price - price;
            const savingsPercent = Math.round((savings / this.currentProduct.price) * 100);
            console.log('✅ Mostrando badge de descuento:', savingsPercent + '%');
            document.getElementById('modalDiscount').textContent = `-${savingsPercent}%`;
            document.getElementById('modalDiscount').style.display = 'inline';
        }
    },

    // =====================================================
    // Manejo de Imagenes
    // =====================================================

    async handleImageUpload(file) {
        // Validar tipo
        if (!CONFIG.products.allowedImageTypes.includes(file.type)) {
            Utils.showToast('Solo se permiten imagenes JPG, PNG o WebP', 'error');
            return;
        }

        // Validar tamaño
        if (file.size > CONFIG.products.maxImageSize) {
            Utils.showToast('La imagen no puede superar 5MB', 'error');
            return;
        }

        try {
            // Comprimir si es necesario
            const compressed = file.size > 1024 * 1024
                ? await Utils.compressImage(file)
                : file;

            // Convertir a base64 para preview
            const base64 = await Utils.fileToBase64(compressed);

            this.uploadedImage = {
                file: compressed,
                base64,
                name: file.name
            };

            // Mostrar preview
            const placeholder = document.getElementById('uploadPlaceholder');
            const preview = document.getElementById('uploadPreview');
            const previewImg = document.getElementById('imagePreview');

            if (placeholder) placeholder.style.display = 'none';
            if (preview) {
                preview.style.display = 'block';
                previewImg.src = base64;
            }

            Utils.showToast('Imagen cargada correctamente', 'success');
        } catch (error) {
            console.error('Error procesando imagen:', error);
            Utils.showToast('Error al procesar la imagen', 'error');
        }
    },

    removeUploadedImage() {
        this.uploadedImage = null;

        const placeholder = document.getElementById('uploadPlaceholder');
        const preview = document.getElementById('uploadPreview');
        const input = document.getElementById('customImage');

        if (placeholder) placeholder.style.display = 'block';
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
    },

    // =====================================================
    // Agregar al Carrito
    // =====================================================

    addCurrentProductToCart() {
        if (!this.currentProduct) return;

        const qty = parseInt(document.getElementById('productQty').value) || 1;
        const customText = document.getElementById('customText').value.trim();
        const customNotes = document.getElementById('customNotes').value.trim();

        // Crear objeto de personalizacion
        let customization = null;
        if (customText || this.uploadedImage || customNotes) {
            customization = {
                text: customText || null,
                imageUrl: this.uploadedImage?.base64 || null,
                imageName: this.uploadedImage?.name || null,
                notes: customNotes || null
            };
        }

        Cart.addItem(this.currentProduct, qty, customization);
        Utils.closeModal('productModal');
    },

    // =====================================================
    // UI Helpers
    // =====================================================

    showLoader() {
        const loader = document.getElementById('productsLoader');
        if (loader) loader.style.display = 'flex';
    },

    hideLoader() {
        const loader = document.getElementById('productsLoader');
        if (loader) loader.style.display = 'none';
    },

    updateLoadMoreButton() {
        const btn = document.getElementById('loadMoreBtn');
        if (btn) {
            btn.style.display = this.hasMore ? 'inline-flex' : 'none';
        }
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => Products.init());

// Exportar para uso global
window.Products = Products;
