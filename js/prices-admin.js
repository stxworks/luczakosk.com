/**
 * OSK Łuczak - Prices Admin Module
 * 
 * This module handles the prices management in admin panel,
 * including CRUD operations and promo configuration.
 */

// ============================================
// PRICES LIST
// ============================================

let pricesData = [];

/**
 * Load and display all prices
 */
async function loadPrices() {
    const tableBody = document.getElementById('prices-table-body');
    const countEl = document.getElementById('prices-count');
    const promosCountEl = document.getElementById('active-promos-count');

    if (!tableBody) return;

    try {
        const result = await fetchAllPrices();
        pricesData = result.data;

        if (pricesData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">
                        Brak pozycji cenowych. Uruchom skrypt SQL w Supabase.
                    </td>
                </tr>
            `;
            if (countEl) countEl.textContent = 'Brak pozycji';
            return;
        }

        // Count active promos
        const activePromos = pricesData.filter(p => p.promo_active && !p._promo_expired).length;

        // Render table
        tableBody.innerHTML = pricesData.map(price => renderPriceRow(price)).join('');

        // Update counts
        if (countEl) countEl.textContent = `Łącznie: ${pricesData.length} pozycji`;
        if (promosCountEl) {
            if (activePromos > 0) {
                promosCountEl.innerHTML = `🔥 Aktywne promocje: ${activePromos}`;
            } else {
                promosCountEl.textContent = '';
            }
        }

    } catch (err) {
        console.error('Error loading prices:', err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">
                    Błąd ładowania cen. Sprawdź połączenie z bazą danych.
                </td>
            </tr>
        `;
    }
}

/**
 * Render single price row
 */
function renderPriceRow(price) {
    const hasActivePromo = price.promo_active && price.promo_price && !price._promo_expired;
    const promoExpired = price._promo_expired;

    // Format base price
    const basePriceFormatted = formatPriceAdmin(price.base_price, price.price_unit);

    // Format promo price
    let promoCell = '<span style="color: #94a3b8;">—</span>';
    if (hasActivePromo) {
        promoCell = `<span style="color: #16a34a; font-weight: 600;">${formatPriceAdmin(price.promo_price, price.price_unit)}</span>`;
    } else if (price.promo_price && promoExpired) {
        promoCell = `<span style="color: #dc2626; text-decoration: line-through;">${formatPriceAdmin(price.promo_price, price.price_unit)}</span>`;
    }

    // Status badge
    let statusBadge = '';
    if (hasActivePromo) {
        statusBadge = '<span class="status-badge status-badge--success">🔥 Aktywna</span>';
    } else if (promoExpired) {
        statusBadge = '<span class="status-badge status-badge--warning">Zakończona</span>';
    } else {
        statusBadge = '<span class="status-badge status-badge--secondary">Brak</span>';
    }

    // Promo end date
    let endDateCell = '<span style="color: #94a3b8;">—</span>';
    if (price.promo_end_date) {
        const endDate = new Date(price.promo_end_date);
        const now = new Date();
        const isExpired = endDate <= now;

        const formattedDate = endDate.toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        if (isExpired) {
            endDateCell = `<span style="color: #dc2626;">${formattedDate}</span>`;
        } else {
            // Calculate remaining time
            const diff = endDate - now;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            let remaining = '';
            if (days > 0) {
                remaining = `(za ${days}d ${hours}h)`;
            } else if (hours > 0) {
                remaining = `(za ${hours}h)`;
            } else {
                remaining = '(<1h)';
            }

            endDateCell = `
                <span style="color: #1a56db;">${formattedDate}</span>
                <br><small style="color: #64748b;">${remaining}</small>
            `;
        }
    }

    return `
        <tr>
            <td>
                <div style="font-weight: 500;">${price.name}</div>
                <small style="color: #64748b;">${price.slug}</small>
            </td>
            <td style="font-weight: 600;">${basePriceFormatted}</td>
            <td>${promoCell}</td>
            <td>${endDateCell}</td>
            <td>
                <button class="btn btn--secondary btn--sm" onclick="openPriceModal('${price.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edytuj
                </button>
            </td>
        </tr>
    `;
}

/**
 * Format price for admin display
 */
function formatPriceAdmin(value, unit = 'zł') {
    const formatted = value.toLocaleString('pl-PL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
    return `${formatted} ${unit}`;
}

// ============================================
// PRICE MODAL
// ============================================

let currentPriceId = null;

/**
 * Open price edit modal
 */
function openPriceModal(priceId) {
    const modal = document.getElementById('price-modal');
    const price = pricesData.find(p => p.id === priceId);

    if (!modal || !price) return;

    currentPriceId = priceId;

    // Populate form fields
    document.getElementById('price-id').value = price.id;
    document.getElementById('price-name').value = price.name;
    document.getElementById('price-base').value = price.base_price;
    document.getElementById('price-unit-display').textContent = price.price_unit;
    document.getElementById('price-promo-unit-display').textContent = price.price_unit;

    // Promo fields
    const promoActiveCheckbox = document.getElementById('price-promo-active');
    const promoFields = document.getElementById('promo-fields');

    promoActiveCheckbox.checked = price.promo_active || false;
    document.getElementById('price-promo').value = price.promo_price || '';

    // Format promo end date for datetime-local input
    if (price.promo_end_date) {
        const endDate = new Date(price.promo_end_date);
        document.getElementById('price-promo-end').value = formatDateTimeLocal(endDate);
    } else {
        // Default to 7 days from now
        const defaultEnd = new Date();
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        document.getElementById('price-promo-end').value = formatDateTimeLocal(defaultEnd);
    }

    // Toggle promo fields visibility
    updatePromoFieldsVisibility(promoActiveCheckbox.checked);

    // Show modal
    modal.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
}

/**
 * Close price modal
 */
function closePriceModal() {
    const modal = document.getElementById('price-modal');
    if (modal) {
        modal.classList.remove('is-visible');
        document.body.style.overflow = '';
        currentPriceId = null;
    }
}

/**
 * Update promo fields visibility
 */
function updatePromoFieldsVisibility(isActive) {
    const promoFields = document.getElementById('promo-fields');
    if (promoFields) {
        if (isActive) {
            promoFields.style.opacity = '1';
            promoFields.style.pointerEvents = 'auto';
        } else {
            promoFields.style.opacity = '0.4';
            promoFields.style.pointerEvents = 'none';
        }
    }
}

/**
 * Format date for datetime-local input
 */
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Handle price form submission
 */
async function handlePriceFormSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = '<div class="loading-spinner" style="width: 16px; height: 16px;"></div> Zapisuję...';
        submitBtn.disabled = true;

        const priceId = document.getElementById('price-id').value;
        const promoActive = document.getElementById('price-promo-active').checked;

        const updateData = {
            base_price: parseFloat(document.getElementById('price-base').value),
            promo_active: promoActive,
            promo_price: promoActive ? parseFloat(document.getElementById('price-promo').value) : null,
            promo_end_date: promoActive ? new Date(document.getElementById('price-promo-end').value).toISOString() : null
        };

        // Validate promo price if active
        if (promoActive) {
            if (!updateData.promo_price || updateData.promo_price <= 0) {
                alert('Wprowadź poprawną cenę promocyjną.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            if (updateData.promo_price >= updateData.base_price) {
                alert('Cena promocyjna musi być niższa od ceny bazowej.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            if (!document.getElementById('price-promo-end').value) {
                alert('Ustaw datę zakończenia promocji.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
        }

        await updatePrice(priceId, updateData);

        // Success
        closePriceModal();
        await loadPrices();

        // Show success notification
        showNotification('Cena została zaktualizowana!', 'success');

    } catch (err) {
        console.error('Error updating price:', err);
        alert('Błąd podczas zapisywania ceny: ' + err.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Simple alert for now, can be replaced with toast
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Promo toggle handler
    const promoCheckbox = document.getElementById('price-promo-active');
    if (promoCheckbox) {
        promoCheckbox.addEventListener('change', (e) => {
            updatePromoFieldsVisibility(e.target.checked);
        });
    }

    // Price form submit handler
    const priceForm = document.getElementById('price-form');
    if (priceForm) {
        priceForm.addEventListener('submit', handlePriceFormSubmit);
    }

    // Close modal on overlay click
    const priceModal = document.getElementById('price-modal');
    if (priceModal) {
        priceModal.addEventListener('mousedown', (e) => {
            if (e.target === priceModal) {
                closePriceModal();
            }
        });
    }
});
