/* =====================================================
   UTILIDADES GENERALES
   ===================================================== */

// =====================================================
// Formateo de Moneda
// =====================================================

function formatPrice(price) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: CONFIG.store.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// =====================================================
// Formateo de Fechas
// =====================================================

function formatDate(dateString, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };

    return new Date(dateString).toLocaleDateString('es-CL', defaultOptions);
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = {
        'ano': 31536000,
        'mes': 2592000,
        'semana': 604800,
        'dia': 86400,
        'hora': 3600,
        'minuto': 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `hace 1 ${unit}` : `hace ${interval} ${unit}s`;
        }
    }

    return 'hace un momento';
}

// =====================================================
// Renderizado de Estrellas
// =====================================================

function renderStars(rating, interactive = false) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    for (let i = 0; i < fullStars; i++) {
        starsHTML += '<i class="fas fa-star"></i>';
    }

    if (hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }

    for (let i = 0; i < emptyStars; i++) {
        starsHTML += interactive
            ? `<i class="far fa-star" data-rating="${fullStars + (hasHalfStar ? 1 : 0) + i + 1}"></i>`
            : '<i class="far fa-star"></i>';
    }

    return starsHTML;
}

// =====================================================
// Toast Notifications
// =====================================================

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const titles = {
        success: 'Exito',
        error: 'Error',
        warning: 'Atencion',
        info: 'Informacion'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Cerrar al hacer clic
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    });

    // Auto cerrar
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// =====================================================
// Modal Helpers
// =====================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// =====================================================
// Validaciones
// =====================================================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    // Formato chileno: +56 9 XXXX XXXX o 9 XXXX XXXX
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 9 && cleaned.length <= 12;
}

function validateRut(rut) {
    if (!rut) return true; // Es opcional

    // Limpiar RUT
    const cleanRut = rut.replace(/[^0-9kK]/g, '');
    if (cleanRut.length < 2) return false;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toLowerCase();

    // Calcular digito verificador
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const calculatedDv = 11 - (sum % 11);
    const expectedDv = calculatedDv === 11 ? '0' : calculatedDv === 10 ? 'k' : calculatedDv.toString();

    return dv === expectedDv;
}

function formatRut(rut) {
    const cleaned = rut.replace(/[^0-9kK]/g, '');
    if (cleaned.length < 2) return cleaned;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    // Formatear con puntos y guion
    let formatted = '';
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
        if (j > 0 && j % 3 === 0) formatted = '.' + formatted;
        formatted = body[i] + formatted;
    }

    return formatted + '-' + dv.toUpperCase();
}

// =====================================================
// LocalStorage Helpers
// =====================================================

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
        return false;
    }
}

function getFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error leyendo de localStorage:', error);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error eliminando de localStorage:', error);
        return false;
    }
}

// =====================================================
// Calculos de Envio
// =====================================================

function calculateShipping(comuna, subtotal) {
    // Envio gratis sobre cierto monto
    if (subtotal >= CONFIG.shipping.free_threshold) {
        return 0;
    }

    // Buscar tarifa de la comuna
    const shippingCost = CONFIG.shipping.zones[comuna] || CONFIG.shipping.default;
    return shippingCost;
}

// =====================================================
// Calculos de Descuentos
// =====================================================

function calculateQuantityDiscount(basePrice, quantity, discounts) {
    if (!discounts || discounts.length === 0) return basePrice;

    // Ordenar descuentos por cantidad minima descendente
    const sortedDiscounts = [...discounts].sort((a, b) => b.min_quantity - a.min_quantity);

    // Encontrar el descuento aplicable
    for (const discount of sortedDiscounts) {
        if (quantity >= discount.min_quantity) {
            return Math.round(basePrice * (1 - discount.discount_percentage / 100));
        }
    }

    return basePrice;
}

// =====================================================
// Generador de WhatsApp Message
// =====================================================

function generateWhatsAppMessage(orderData) {
    const { customer, items, subtotal, shipping_cost, total, comuna } = orderData;
    const shipping = shipping_cost || 0;

    let message = `*NUEVO PEDIDO - Regalo Amor*\n\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Email:* ${customer.email}\n`;
    message += `*WhatsApp:* ${customer.phone}\n`;
    if (customer.rut) message += `*RUT:* ${customer.rut}\n`;
    message += `\n*Direccion de Entrega:*\n`;
    message += `${customer.address}\n`;
    message += `${comuna}, ${customer.city}\n\n`;

    message += `*Productos:*\n`;
    message += `-----------------\n`;

    items.forEach((item, index) => {
        message += `\n*${index + 1}. ${item.name}*\n`;
        message += `   Cantidad: ${item.quantity}\n`;
        message += `   Precio unit.: ${formatPrice(item.price)}\n`;
        message += `   Subtotal: ${formatPrice(item.price * item.quantity)}\n`;

        if (item.customization) {
            if (item.customization.text) {
                message += `   Texto: "${item.customization.text}"\n`;
            }
            if (item.customization.imageUrl) {
                message += `   Imagen: Adjunta\n`;
            }
            if (item.customization.notes) {
                message += `   Notas: ${item.customization.notes}\n`;
            }
        }
    });

    message += `\n-----------------\n`;
    message += `*Subtotal:* ${formatPrice(subtotal)}\n`;
    message += `*Envio (${comuna}):* ${shipping === 0 ? 'GRATIS' : formatPrice(shipping)}\n`;
    message += `*TOTAL:* ${formatPrice(total)}\n\n`;

    message += `Gracias por tu pedido!`;

    return encodeURIComponent(message);
}

// =====================================================
// Image Handling
// =====================================================

function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// =====================================================
// Debounce & Throttle
// =====================================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// =====================================================
// Scroll Helpers
// =====================================================

function scrollToElement(elementId, offset = 100) {
    const element = document.getElementById(elementId);
    if (element) {
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// =====================================================
// URL Helpers
// =====================================================

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

function updateUrlParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    window.history.pushState({}, '', url);
}

// =====================================================
// Slug Generator
// =====================================================

function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '-') // Espacios a guiones
        .replace(/-+/g, '-') // Multiples guiones a uno
        .trim();
}

// =====================================================
// IVA Calculator
// =====================================================

function calculateIVA(total) {
    // En Chile el IVA esta incluido en el precio
    // IVA = Total - (Total / 1.19)
    const neto = Math.round(total / (1 + CONFIG.store.taxRate));
    const iva = total - neto;
    return { neto, iva, total };
}

// =====================================================
// Order Number Generator
// =====================================================

function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `RA-${timestamp}${random}`;
}

// =====================================================
// Copy to Clipboard
// =====================================================

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (e) {
            return false;
        } finally {
            textArea.remove();
        }
    }
}

// =====================================================
// Export functions for global use
// =====================================================

window.Utils = {
    formatPrice,
    formatDate,
    formatDateTime,
    timeAgo,
    renderStars,
    showToast,
    openModal,
    closeModal,
    closeAllModals,
    validateEmail,
    validatePhone,
    validateRut,
    formatRut,
    saveToStorage,
    getFromStorage,
    removeFromStorage,
    calculateShipping,
    calculateQuantityDiscount,
    generateWhatsAppMessage,
    compressImage,
    fileToBase64,
    debounce,
    throttle,
    scrollToElement,
    isInViewport,
    getUrlParams,
    updateUrlParams,
    generateSlug,
    calculateIVA,
    generateOrderNumber,
    copyToClipboard
};
