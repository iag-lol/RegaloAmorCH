/* =====================================================
   APLICACION PRINCIPAL - Regalo Amor
   ===================================================== */

const App = {
    // =====================================================
    // Inicializacion
    // =====================================================

    init() {
        this.initPreloader();
        this.initHeader();
        this.initHeroSlider();
        this.initNavigation();
        this.initSearch();
        this.initModals();
        this.initBackToTop();
        this.initAnimations();
        this.initFooter();
        addDeviceTracking();

        console.log('Regalo Amor - Tienda inicializada correctamente');
    },

    // =====================================================
    // Preloader
    // =====================================================

    initPreloader() {
        window.addEventListener('load', () => {
            const preloader = document.getElementById('preloader');
            if (preloader) {
                setTimeout(() => {
                    preloader.classList.add('loaded');
                    setTimeout(() => preloader.remove(), 500);
                }, 500);
            }
        });
    },

    // =====================================================
    // Header
    // =====================================================

    initHeader() {
        const header = document.getElementById('header');
        let lastScroll = 0;

        window.addEventListener('scroll', Utils.throttle(() => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, 100));
    },

    // =====================================================
    // Hero Slider
    // =====================================================

    initHeroSlider() {
        new Swiper('.hero-slider', {
            slidesPerView: 1,
            spaceBetween: 0,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            },
            effect: 'fade',
            fadeEffect: {
                crossFade: true
            }
        });
    },

    // =====================================================
    // Navegacion
    // =====================================================

    initNavigation() {
        const menuToggle = document.getElementById('menuToggle');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-link');

        // Toggle menu movil
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
                document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
            });
        }

        // Cerrar menu al hacer clic en un enlace
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu) navMenu.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Actualizar enlace activo al hacer scroll
        this.initScrollSpy();
    },

    initScrollSpy() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');

        window.addEventListener('scroll', Utils.throttle(() => {
            let current = '';

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;

                if (window.pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }, 100));
    },

    // =====================================================
    // Busqueda
    // =====================================================

    initSearch() {
        const searchBtn = document.getElementById('searchBtn');
        const searchModal = document.getElementById('searchModal');
        const closeSearch = document.getElementById('closeSearch');
        const searchInput = document.getElementById('searchInput');
        const searchForm = document.getElementById('searchForm');
        const searchResults = document.getElementById('searchResults');

        if (searchBtn && searchModal) {
            searchBtn.addEventListener('click', () => {
                searchModal.classList.add('active');
                searchInput?.focus();
            });
        }

        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                searchModal.classList.remove('active');
            });
        }

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchModal?.classList.contains('active')) {
                searchModal.classList.remove('active');
            }
        });

        // Busqueda en tiempo real
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(async (e) => {
                const query = e.target.value.trim();

                if (query.length < 2) {
                    searchResults.innerHTML = '';
                    return;
                }

                const { products } = await getProducts({ search: query, limit: 5 });

                if (products.length === 0) {
                    searchResults.innerHTML = '<p style="color: white; text-align: center;">No se encontraron productos</p>';
                    return;
                }

                searchResults.innerHTML = products.map(product => `
                    <div class="search-result-item" data-product-id="${product.id}">
                        <img src="${product.images?.[0]?.url || 'https://placehold.co/60x60/e5e7eb/6b7280?text=Producto'}" alt="${product.name}">
                        <div class="search-result-info">
                            <h4>${product.name}</h4>
                            <span>${Utils.formatPrice(product.price)}</span>
                        </div>
                    </div>
                `).join('');

                // Click en resultado
                searchResults.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', () => {
                        searchModal.classList.remove('active');
                        Products.openProductModal(item.dataset.productId);
                    });
                });
            }, 300));
        }

        // Submit del formulario
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                // Podria implementar busqueda completa aqui
            });
        }
    },

    // =====================================================
    // Modales Informativos
    // =====================================================

    initModals() {
        // Links que abren modales informativos
        document.querySelectorAll('[data-modal]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const modalType = link.dataset.modal;
                this.openInfoModal(modalType);
            });
        });

        // Cerrar modal informativo
        const closeInfoModal = document.getElementById('closeInfoModal');
        if (closeInfoModal) {
            closeInfoModal.addEventListener('click', () => {
                Utils.closeModal('infoModal');
            });
        }

        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.closeAllModals();
            }
        });
    },

    openInfoModal(type) {
        const modalData = CONFIG.infoModals[type];
        if (!modalData) return;

        const titleEl = document.getElementById('infoModalTitle');
        const contentEl = document.getElementById('infoModalContent');

        if (titleEl) titleEl.textContent = modalData.title;
        if (contentEl) contentEl.innerHTML = modalData.content;

        Utils.openModal('infoModal');
    },

    // =====================================================
    // Formulario de Contacto
    // =====================================================

    initContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const phone = document.getElementById('contactPhone').value.trim();
            const message = document.getElementById('contactMessage').value.trim();

            if (!name || !email || !message) {
                Utils.showToast('Por favor completa los campos obligatorios', 'error');
                return;
            }

            if (!Utils.validateEmail(email)) {
                Utils.showToast('Por favor ingresa un email valido', 'error');
                return;
            }

            const result = await submitContactForm({ name, email, phone, message });

            if (result.success) {
                Utils.showToast('Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
                contactForm.reset();
            } else {
                Utils.showToast('Error al enviar el mensaje. Intenta nuevamente.', 'error');
            }
        });
    },

    // =====================================================
    // Boton Volver Arriba
    // =====================================================

    initBackToTop() {
        const backToTop = document.getElementById('backToTop');
        if (!backToTop) return;

        window.addEventListener('scroll', Utils.throttle(() => {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }, 100));

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    // =====================================================
    // Animaciones de Scroll
    // =====================================================

    initAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observar elementos que se van a animar
        document.querySelectorAll('.feature-card, .step-card, .product-card, .testimonial-card').forEach(el => {
            el.classList.add('animate-item');
            observer.observe(el);
        });
    },

    // =====================================================
    // Footer
    // =====================================================

    initFooter() {
        // Ano actual
        const currentYear = document.getElementById('currentYear');
        if (currentYear) {
            currentYear.textContent = new Date().getFullYear();
        }
    }
};

// =====================================================
// Inicializar cuando el DOM este listo
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
    App.initContactForm();
});

// Exportar para uso global
window.App = App;
