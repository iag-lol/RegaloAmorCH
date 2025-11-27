/* =====================================================
   SISTEMA DE VALORACIONES Y COMENTARIOS
   ===================================================== */

const Reviews = {
    reviews: [],
    selectedRating: 0,

    // =====================================================
    // Inicializacion
    // =====================================================

    async init() {
        await this.loadReviews();
        this.bindEvents();
        this.loadProductsForReview();
    },

    // =====================================================
    // Carga de Datos
    // =====================================================

    async loadReviews() {
        try {
            this.reviews = await getApprovedReviews(10);
            this.renderTestimonials();
        } catch (error) {
            console.error('Error cargando reviews:', error);
        }
    },

    async loadProductsForReview() {
        const select = document.getElementById('reviewProduct');
        if (!select) return;

        try {
            const { products } = await getProducts({ limit: 50 });

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = product.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando productos para review:', error);
        }
    },

    // =====================================================
    // Eventos
    // =====================================================

    bindEvents() {
        // Sistema de estrellas interactivo
        const starRating = document.getElementById('starRating');
        if (starRating) {
            starRating.querySelectorAll('i').forEach(star => {
                star.addEventListener('click', () => {
                    this.setRating(parseInt(star.dataset.rating));
                });

                star.addEventListener('mouseenter', () => {
                    this.highlightStars(parseInt(star.dataset.rating));
                });
            });

            starRating.addEventListener('mouseleave', () => {
                this.highlightStars(this.selectedRating);
            });
        }

        // Formulario de review
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    },

    // =====================================================
    // Sistema de Estrellas
    // =====================================================

    setRating(rating) {
        this.selectedRating = rating;
        document.getElementById('reviewRating').value = rating;
        this.highlightStars(rating);
    },

    highlightStars(rating) {
        const stars = document.querySelectorAll('#starRating i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas', 'active');
            } else {
                star.classList.remove('fas', 'active');
                star.classList.add('far');
            }
        });
    },

    // =====================================================
    // Envio de Review
    // =====================================================

    async handleSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('reviewName').value.trim();
        const email = document.getElementById('reviewEmail').value.trim();
        const productId = document.getElementById('reviewProduct').value;
        const comment = document.getElementById('reviewComment').value.trim();
        const rating = this.selectedRating;

        // Validaciones
        if (!name || !email || !productId || !comment) {
            Utils.showToast('Por favor completa todos los campos', 'error');
            return;
        }

        if (!Utils.validateEmail(email)) {
            Utils.showToast('Por favor ingresa un email valido', 'error');
            return;
        }

        if (rating === 0) {
            Utils.showToast('Por favor selecciona una valoracion', 'error');
            return;
        }

        // Enviar review
        const result = await submitReview({
            product_id: productId,
            name,
            email,
            rating,
            comment
        });

        if (result.success) {
            Utils.showToast(result.message, 'success');
            this.resetForm();
        } else {
            Utils.showToast(result.message, 'error');
        }
    },

    resetForm() {
        document.getElementById('reviewForm').reset();
        this.selectedRating = 0;
        this.highlightStars(0);
    },

    // =====================================================
    // Renderizado
    // =====================================================

    renderTestimonials() {
        const container = document.getElementById('testimonialsContainer');
        if (!container || this.reviews.length === 0) return;

        container.innerHTML = this.reviews.map(review => `
            <div class="swiper-slide">
                <div class="testimonial-card">
                    <div class="testimonial-avatar">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(review.customer_name)}&background=e91e63&color=fff&size=80"
                             alt="${review.customer_name}">
                    </div>
                    <div class="testimonial-rating">
                        ${Utils.renderStars(review.rating)}
                    </div>
                    <p class="testimonial-text">"${review.comment}"</p>
                    <div class="testimonial-author">
                        <h4>${review.customer_name}</h4>
                        <span>${review.product?.name || 'Cliente verificado'}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Inicializar Swiper de testimonios
        new Swiper('.testimonials-slider', {
            slidesPerView: 1,
            spaceBetween: 20,
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            autoplay: {
                delay: 5000,
                disableOnInteraction: false
            },
            breakpoints: {
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            }
        });
    }
};

// Inicializar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => Reviews.init());

// Exportar para uso global
window.Reviews = Reviews;
