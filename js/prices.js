/**
 * OSK Łuczak - Dynamic Prices Frontend
 * 
 * This module handles loading and displaying prices from Supabase,
 * including promotional prices with countdown timers.
 */

// ============================================
// PRICE LOADER
// ============================================

// Global prices cache
let pricesCache = null;

/**
 * Initialize prices on page load
 * Call this function after Supabase is loaded
 */
async function initPrices() {
    try {
        const result = await fetchAllPrices();
        pricesCache = result.data;

        // Update all price elements on the page
        updateAllPriceElements();

        // Update pickup fee with promo formatting
        updatePickupFee();

        // Update course select options (for zapisy.html)
        updateCourseSelectOptions();

        // Start countdown timers for active promos
        startAllCountdowns();

        console.log('Prices loaded:', pricesCache.length, 'items');
    } catch (err) {
        console.warn('Failed to load prices:', err);
    }
}

/**
 * Get price from cache by slug
 * @param {string} slug - Price slug
 */
function getPrice(slug) {
    if (!pricesCache) return null;
    return pricesCache.find(p => p.slug === slug);
}

/**
 * Update all elements with data-price attribute
 */
function updateAllPriceElements() {
    const elements = document.querySelectorAll('[data-price]');

    elements.forEach(element => {
        const slug = element.dataset.price;
        const price = getPrice(slug);

        if (price) {
            renderPriceElement(element, price);
        }
    });
}

/**
 * Render price into an element
 * @param {HTMLElement} element - Target element
 * @param {Object} price - Price data object
 */
function renderPriceElement(element, price) {
    const hasPromo = price.promo_active && price.promo_price && !price._promo_expired;
    const displayType = element.dataset.priceDisplay || 'full';

    if (hasPromo) {
        // NEW PROMO SYSTEM: Just show green animated price, click opens modal
        element.classList.add('price--has-promo', 'price--promo-animated');
        element.setAttribute('data-promo-slug', price.slug);
        element.setAttribute('title', 'Kliknij, aby zobaczyć szczegóły promocji');

        // Simple price display - just the new price, no crossed out old price
        const newFormatted = formatPriceValue(price.promo_price, price.price_unit);

        switch (displayType) {
            case 'value-only':
            case 'inline':
                element.innerHTML = `<strong>${newFormatted}</strong>`;
                break;
            case 'with-countdown':
            case 'full':
            default:
                element.innerHTML = `<strong>${newFormatted.split(' ')[0]}</strong> ${price.price_unit}`;
        }

        // Add click handler to open modal (only once)
        if (!element.dataset.promoClickAttached) {
            element.addEventListener('click', () => openPromoModal(price.slug));
            element.dataset.promoClickAttached = 'true';
        }
    } else {
        element.classList.remove('price--has-promo', 'price--promo-animated');
        element.removeAttribute('data-promo-slug');
        element.removeAttribute('title');

        switch (displayType) {
            case 'value-only':
                element.innerHTML = renderBaseValue(price);
                break;
            case 'inline':
                element.innerHTML = `<strong>${formatPriceValue(price.base_price, price.price_unit)}</strong>`;
                break;
            case 'full':
            default:
                element.innerHTML = renderBaseValue(price);
        }
    }
}

/**
 * Render base price value
 */
function renderBaseValue(price) {
    const formatted = formatPriceValue(price.base_price, price.price_unit);
    return `<strong>${formatted.split(' ')[0]}</strong> ${price.price_unit}`;
}

/**
 * Render promotional price value with old price crossed out + countdown
 */
function renderPromoValue(price) {
    const oldFormatted = formatPriceValue(price.base_price, '');
    const newFormatted = formatPriceValue(price.promo_price, '');

    // Calculate countdown if we have end date
    let countdownHtml = '';
    if (price.promo_end_date) {
        const endDate = new Date(price.promo_end_date);
        const countdownId = `countdown-${price.slug}-${Date.now()}`;

        // Format date nicely
        const dateStr = endDate.toLocaleDateString('pl-PL', {
            day: 'numeric',
            month: 'short'
        });

        countdownHtml = `
            <span class="course-card__promo-timer" id="${countdownId}" data-end="${price.promo_end_date}">
                Promocja kończy się za: <span class="course-card__promo-countdown"><span data-unit="days">--</span>d <span data-unit="hours">--</span>h <span data-unit="minutes">--</span>m</span>
            </span>
        `;
    }

    return `
        <span class="course-card__price-new">
            <strong>${newFormatted}</strong> ${price.price_unit}
        </span>
        <span class="course-card__price-old">
            <s>${oldFormatted} ${price.price_unit}</s>
        </span>
        ${countdownHtml}
    `;
}

/**
 * Render full promotional display
 */
function renderFullPromoDisplay(price) {
    return `
        <div class="price-display price-display--promo">
            <span class="promo-badge">
                <span class="promo-badge__icon">🔥</span>
                PROMOCJA
            </span>
            ${renderPromoValue(price)}
        </div>
    `;
}

/**
 * Render countdown timer HTML
 */
function renderCountdown(price) {
    if (!price.promo_end_date) return '';

    const countdownId = `countdown-${price.slug}`;

    return `
        <div class="promo-countdown promo-countdown--compact" id="${countdownId}" data-end="${price.promo_end_date}">
            <span class="promo-countdown__label">
                🔥 Promocja kończy się za:
            </span>
            <div class="promo-countdown__timer">
                <div class="promo-countdown__unit">
                    <span class="promo-countdown__value" data-unit="days">--</span>
                    <span class="promo-countdown__name">dni</span>
                </div>
                <div class="promo-countdown__unit">
                    <span class="promo-countdown__value" data-unit="hours">--</span>
                    <span class="promo-countdown__name">godz</span>
                </div>
                <div class="promo-countdown__unit">
                    <span class="promo-countdown__value" data-unit="minutes">--</span>
                    <span class="promo-countdown__name">min</span>
                </div>
                <div class="promo-countdown__unit">
                    <span class="promo-countdown__value" data-unit="seconds">--</span>
                    <span class="promo-countdown__name">sek</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render inline countdown timer (for express courses)
 * Simpler format: | Promocja kończy się za: XXd XXh XXm
 */
function renderInlineCountdown(price) {
    if (!price.promo_end_date) return '';

    const countdownId = `countdown-inline-${price.slug}-${Date.now()}`;

    return `
        <span class="price-inline__timer" id="${countdownId}" data-end="${price.promo_end_date}">
            Promocja kończy się za: <span class="price-inline__countdown"><span data-unit="days">--</span>d <span data-unit="hours">--</span>h <span data-unit="minutes">--</span>m</span>
        </span>
    `;
}

// ============================================
// COUNTDOWN TIMER
// ============================================

// Active countdown intervals
const countdownIntervals = new Map();

/**
 * Start all countdown timers on the page
 */
function startAllCountdowns() {
    // Find all countdown elements (all possible classes)
    const countdowns = document.querySelectorAll('.promo-countdown[data-end], .course-card__countdown[data-end], .course-card__promo-timer[data-end], .price-inline__timer[data-end], .pickup-fee__timer[data-end]');

    countdowns.forEach(countdown => {
        const endDate = countdown.dataset.end;
        startCountdown(countdown, endDate);
    });
}

/**
 * Start countdown timer for a specific element
 * @param {HTMLElement} element - Countdown container
 * @param {string} endDateStr - ISO date string
 */
function startCountdown(element, endDateStr) {
    const endDate = new Date(endDateStr);
    const countdownId = element.id;

    // Clear existing interval if any
    if (countdownIntervals.has(countdownId)) {
        clearInterval(countdownIntervals.get(countdownId));
    }

    function updateCountdown() {
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) {
            // Promo expired
            element.innerHTML = '<span class="promo-countdown__expired">Promocja zakończona</span>';
            clearInterval(countdownIntervals.get(countdownId));
            countdownIntervals.delete(countdownId);

            // Reload prices after a short delay
            setTimeout(() => initPrices(), 2000);
            return;
        }

        // Calculate time units
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Update display
        const daysEl = element.querySelector('[data-unit="days"]');
        const hoursEl = element.querySelector('[data-unit="hours"]');
        const minutesEl = element.querySelector('[data-unit="minutes"]');
        const secondsEl = element.querySelector('[data-unit="seconds"]');

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');

        // Add urgency class if less than 1 hour
        if (diff < 3600000) {
            element.classList.add('promo-countdown--urgent');
            element.classList.add('course-card__countdown--urgent');
        }
    }

    // Initial update
    updateCountdown();

    // Update every second
    const intervalId = setInterval(updateCountdown, 1000);
    countdownIntervals.set(countdownId, intervalId);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format price value with proper spacing
 * @param {number} value - Price value
 * @param {string} unit - Price unit
 */
function formatPriceValue(value, unit = 'zł') {
    const formatted = value.toLocaleString('pl-PL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Cleanup countdown intervals (call on page unload)
 */
function cleanupCountdowns() {
    countdownIntervals.forEach((intervalId, key) => {
        clearInterval(intervalId);
    });
    countdownIntervals.clear();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupCountdowns);

// ============================================
// SPECIFIC PAGE HELPERS
// ============================================

/**
 * Load prices for index.html course cards
 */
async function loadCoursePrices() {
    await initPrices();

    // Update course card prices
    updateCourseCardPrice('course-b');
    updateCourseCardPrice('course-b-express');
    updateCourseCardPrice('course-be');
    updateCourseCardPrice('course-be-express');

    // Update refresher prices
    updateRefresherPrice('refresher-b');
    updateRefresherPrice('refresher-b-student');
    updateRefresherPrice('refresher-be');
    updateRefresherPrice('refresher-be-student');

    // Update pickup fee
    updatePickupFee();
}

/**
 * Update a course card price element
 */
function updateCourseCardPrice(slug) {
    const price = getPrice(slug);
    if (!price) return;

    const element = document.querySelector(`[data-price="${slug}"]`);
    if (element) {
        renderPriceElement(element, price);
    }
}

/**
 * Update a refresher card price element
 */
function updateRefresherPrice(slug) {
    const price = getPrice(slug);
    if (!price) return;

    const element = document.querySelector(`[data-price="${slug}"]`);
    if (element) {
        const hasPromo = price.promo_active && price.promo_price && !price._promo_expired;

        // Find parent refresher card
        const refresherCard = element.closest('.refresher-card');

        if (hasPromo) {
            // NEW PROMO SYSTEM: Just show green animated price, click opens modal
            const newFormatted = formatPriceValue(price.promo_price, price.price_unit);
            element.innerHTML = `<strong>${newFormatted}</strong>`;
            element.classList.add('price--promo-animated');
            element.setAttribute('data-promo-slug', price.slug);
            element.setAttribute('title', 'Kliknij, aby zobaczyć szczegóły promocji');
            element.style.cursor = 'pointer';

            // Add click handler to open modal (only once)
            if (!element.dataset.promoClickAttached) {
                element.addEventListener('click', () => openPromoModal(price.slug));
                element.dataset.promoClickAttached = 'true';
            }

            // Add class to parent card for layout adjustments
            if (refresherCard) {
                refresherCard.classList.add('refresher-card--has-promo');
            }
        } else {
            element.textContent = formatPriceValue(price.base_price, price.price_unit);
            element.classList.remove('price--promo-animated');
            element.removeAttribute('data-promo-slug');
            element.removeAttribute('title');
            element.style.cursor = '';

            if (refresherCard) {
                refresherCard.classList.remove('refresher-card--has-promo');
            }
        }
    }
}

/**
 * Update pickup fee
 */
function updatePickupFee() {
    const price = getPrice('pickup-fee');
    if (!price) return;

    // Find all notice elements that contain pickup-fee price
    const noticeElements = document.querySelectorAll('.courses__notice');

    noticeElements.forEach(notice => {
        const priceEl = notice.querySelector('[data-price="pickup-fee"]');
        if (!priceEl) return;

        const hasPromo = price.promo_active && price.promo_price && !price._promo_expired;

        if (hasPromo) {
            // NEW PROMO SYSTEM: Just show green animated price, click opens modal
            const newFormatted = formatPriceValue(price.promo_price, '');

            // Update parent notice - simple layout with clickable promo price
            notice.innerHTML = `
                * Dojazd po kursanta poza rejonem Kłecka – dodatkowe <span class="price--promo-animated" data-price="pickup-fee" data-promo-slug="pickup-fee" title="Kliknij, aby zobaczyć szczegóły promocji" style="cursor:pointer"><strong>${newFormatted}</strong> ${price.price_unit}</span> do kursu (nie dotyczy jazd doszkalających).
            `;
            notice.classList.add('courses__notice--promo');

            // Re-attach click handler
            const newPriceEl = notice.querySelector('[data-promo-slug="pickup-fee"]');
            if (newPriceEl) {
                newPriceEl.addEventListener('click', () => openPromoModal('pickup-fee'));
            }
        } else {
            // Regular display without promo
            notice.innerHTML = `
                * Dojazd po kursanta poza rejonem Kłecka – dodatkowe <span class="text-yellow" data-price="pickup-fee" data-price-display="value-only"><strong>${formatPriceValue(price.base_price, '')}</strong> ${price.price_unit}</span> do kursu (nie dotyczy jazd doszkalających).
            `;
            notice.classList.remove('courses__notice--promo');
        }
    });
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Wait for DOM and Supabase to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if fetchAllPrices exists (supabase.js loaded)
    if (typeof fetchAllPrices === 'function') {
        // Small delay to ensure Supabase client is initialized
        setTimeout(initPrices, 100);
    }
});

// ============================================
// COURSE SELECT OPTIONS (zapisy.html)
// ============================================

/**
 * Update course select options with dynamic prices
 * Used on zapisy.html registration form
 */
function updateCourseSelectOptions() {
    const courseSelect = document.getElementById('course');
    if (!courseSelect) return;

    const options = courseSelect.querySelectorAll('option[data-price-slug]');

    options.forEach(option => {
        const slug = option.dataset.priceSlug;
        const price = getPrice(slug);

        if (price) {
            const hasPromo = price.promo_active && price.promo_price && !price._promo_expired;
            const displayPrice = hasPromo ? price.promo_price : price.base_price;
            const formatted = formatPriceValue(displayPrice, price.price_unit);

            // Extract course name (before the dash)
            const originalText = option.textContent;
            const namePart = originalText.split(' - ')[0];

            option.textContent = `${namePart} - ${formatted}`;
        }
    });
}

// ============================================
// NEW PROMO MODAL SYSTEM
// ============================================

/**
 * Check if any promo is currently active
 */
function checkAnyPromoActive() {
    if (!pricesCache) return false;
    return pricesCache.some(p => p.promo_active && p.promo_price && !p._promo_expired);
}

/**
 * Get all active promos
 */
function getActivePromos() {
    if (!pricesCache) return [];
    return pricesCache.filter(p => p.promo_active && p.promo_price && !p._promo_expired);
}

/**
 * Show promo banner if any promo is active
 */
function showPromoBanner() {
    const bannerContainer = document.getElementById('promo-banner-container');
    if (!bannerContainer) return;

    if (checkAnyPromoActive()) {
        bannerContainer.innerHTML = `
            <button class="promo-banner" onclick="openPromoModal()">
                Sprawdź aktualne promocje
            </button>
        `;
    } else {
        bannerContainer.innerHTML = '';
    }
}

/**
 * Create the promo modal HTML if it doesn't exist
 * @returns {boolean} True if modal was just created, false if it already existed
 */
function ensurePromoModalExists() {
    if (document.getElementById('promo-modal-overlay')) return false;

    const modalHTML = `
        <div id="promo-modal-overlay" class="promo-modal-overlay" onclick="closePromoModal(event)">
            <div class="promo-modal" onclick="event.stopPropagation()">
                <div class="promo-modal__header">
                    <h3 class="promo-modal__title" id="promo-modal-title">Aktualne promocje</h3>
                    <button class="promo-modal__close" onclick="closePromoModal()">×</button>
                </div>
                <div class="promo-modal__content" id="promo-modal-content">
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return true;
}

/**
 * Open promo modal
 * @param {string|null} slug - If provided, show only that specific promo. Otherwise show all.
 */
function openPromoModal(slug = null) {
    const wasJustCreated = ensurePromoModalExists();

    const overlay = document.getElementById('promo-modal-overlay');
    const title = document.getElementById('promo-modal-title');
    const content = document.getElementById('promo-modal-content');

    let promos = [];

    if (slug) {
        // Single promo mode
        const price = getPrice(slug);
        if (price && price.promo_active && price.promo_price && !price._promo_expired) {
            promos = [price];
            title.textContent = 'Szczegóły promocji';
        }
    } else {
        // All promos mode
        promos = getActivePromos();
        title.textContent = 'Aktualne promocje';
    }

    if (promos.length === 0) {
        content.innerHTML = `
            <div class="promo-modal__empty">
                <div class="promo-modal__empty-icon">📭</div>
                <p>Brak aktywnych promocji</p>
            </div>
        `;
    } else {
        content.innerHTML = promos.map(promo => {
            const savings = promo.base_price - promo.promo_price;
            const savingsPercent = Math.round((savings / promo.base_price) * 100);
            const timeRemaining = promo.promo_end_date ? formatTimeRemaining(promo.promo_end_date) : null;

            return `
                <div class="promo-item">
                    <div class="promo-item__name">${promo.name}</div>
                    <div class="promo-item__prices">
                        <span class="promo-item__new-price">${formatPriceValue(promo.promo_price, promo.price_unit)}</span>
                        <span class="promo-item__old-price">${formatPriceValue(promo.base_price, promo.price_unit)}</span>
                        <span class="promo-item__savings">-${savingsPercent}%</span>
                    </div>
                    ${timeRemaining ? `
                        <div class="promo-item__timer">
                            <span class="promo-item__timer-label">Promocja kończy się za:</span>
                            <span class="promo-item__timer-value">${timeRemaining}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // Function to show the modal
    function showModal() {
        overlay.classList.add('promo-modal-overlay--visible');
        document.body.style.overflow = 'hidden';
    }

    // If modal was just created, wait for browser to register initial state
    if (wasJustCreated) {
        // Double rAF ensures the browser has painted the initial state
        requestAnimationFrame(() => {
            requestAnimationFrame(showModal);
        });
    } else {
        showModal();
    }
}

/**
 * Close promo modal
 */
function closePromoModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const overlay = document.getElementById('promo-modal-overlay');
    if (overlay) {
        overlay.classList.remove('promo-modal-overlay--visible');
        document.body.style.overflow = '';
    }
}

/**
 * Format time remaining for display
 */
function formatTimeRemaining(endDateStr) {
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diff = endDate - now;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Initialize promo banner after prices load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for prices to load, then show banner
    const checkPrices = setInterval(() => {
        if (pricesCache) {
            showPromoBanner();
            // Also check if we should show promo popup
            maybeShowPromoPopup();
            clearInterval(checkPrices);
        }
    }, 100);

    // Fallback timeout
    setTimeout(() => clearInterval(checkPrices), 5000);
});

// ============================================
// PROMO POPUP (Entry Popup)
// ============================================

const PROMO_POPUP_STORAGE_KEY = 'osk_promo_popup_last_shown';
const PROMO_POPUP_DAYS_BETWEEN = 7; // Show popup again after 7 days
const PROMO_POPUP_DELAY_MS = 3000; // Show after 3 seconds

/**
 * Check if we should show the promo popup
 */
function shouldShowPromoPopup() {
    // Check if there are active promos
    if (!checkAnyPromoActive()) return false;

    // Check localStorage for last shown date
    const lastShown = localStorage.getItem(PROMO_POPUP_STORAGE_KEY);
    if (lastShown) {
        const lastShownDate = new Date(lastShown);
        const now = new Date();
        const daysSinceLastShown = (now - lastShownDate) / (1000 * 60 * 60 * 24);

        if (daysSinceLastShown < PROMO_POPUP_DAYS_BETWEEN) {
            return false; // Too soon, don't show
        }
    }

    return true;
}

/**
 * Maybe show promo popup after delay
 */
function maybeShowPromoPopup() {
    if (!shouldShowPromoPopup()) return;

    // Wait for cookies to be accepted (if cookies banner exists)
    const cookiesBanner = document.getElementById('cookiesBanner');
    if (cookiesBanner && cookiesBanner.style.display !== 'none') {
        // Wait for cookies to be accepted first
        const checkCookies = setInterval(() => {
            if (cookiesBanner.style.display === 'none' || !document.body.contains(cookiesBanner)) {
                clearInterval(checkCookies);
                setTimeout(showPromoPopup, PROMO_POPUP_DELAY_MS);
            }
        }, 500);

        // Fallback: if cookies never accepted, still show popup after 10 seconds
        setTimeout(() => {
            clearInterval(checkCookies);
            showPromoPopup();
        }, 10000);
    } else {
        // No cookies banner, show after delay
        setTimeout(showPromoPopup, PROMO_POPUP_DELAY_MS);
    }
}

/**
 * Create and show the promo popup
 */
function showPromoPopup() {
    // Double check promos are still active
    if (!checkAnyPromoActive()) return;

    const promos = getActivePromos();
    if (promos.length === 0) return;

    // Find the soonest ending promo for the timer
    const soonestEndDate = promos
        .filter(p => p.promo_end_date)
        .sort((a, b) => new Date(a.promo_end_date) - new Date(b.promo_end_date))[0]?.promo_end_date;

    const timeRemaining = soonestEndDate ? formatTimeRemaining(soonestEndDate) : null;

    // Build promo items HTML
    const promoItemsHtml = promos.map(promo => {
        const savings = promo.base_price - promo.promo_price;
        const savingsPercent = Math.round((savings / promo.base_price) * 100);

        return `
            <div class="promo-popup__item">
                <span class="promo-popup__item-name">${promo.name}</span>
                <div class="promo-popup__item-prices">
                    <span class="promo-popup__item-old">${formatPriceValue(promo.base_price, promo.price_unit)}</span>
                    <span class="promo-popup__item-new">${formatPriceValue(promo.promo_price, promo.price_unit)}</span>
                    <span class="promo-popup__item-savings">-${savingsPercent}%</span>
                </div>
            </div>
        `;
    }).join('');

    // Build popup HTML
    const popupHtml = `
        <div id="promo-popup-overlay" class="promo-popup-overlay" onclick="closePromoPopup(event)">
            <div class="promo-popup" onclick="event.stopPropagation()">
                <div class="promo-popup__header">
                    <button class="promo-popup__close" onclick="closePromoPopup()">&times;</button>
                    <span class="promo-popup__badge">Tylko przez ograniczony czas</span>
                    <h3 class="promo-popup__title">Aktywna promocja!</h3>
                </div>
                <div class="promo-popup__content">
                    <p class="promo-popup__intro">Nie przegap okazji! Skorzystaj z wyjątkowych cen na kursy prawa jazdy.</p>

                    <div class="promo-popup__list">
                        ${promoItemsHtml}
                    </div>

                    <div class="promo-popup__actions">
                        <a href="#kursy" class="promo-popup__btn promo-popup__btn--primary" onclick="closePromoPopup()">
                            Zobacz szczegóły
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </a>
                        <button class="promo-popup__btn promo-popup__btn--secondary" onclick="closePromoPopup()">
                            Może później
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Insert into DOM
    document.body.insertAdjacentHTML('beforeend', popupHtml);

    // Trigger animation after DOM update
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const overlay = document.getElementById('promo-popup-overlay');
            if (overlay) {
                overlay.classList.add('promo-popup-overlay--visible');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Mark as shown in localStorage
    localStorage.setItem(PROMO_POPUP_STORAGE_KEY, new Date().toISOString());
}

/**
 * Close promo popup
 */
function closePromoPopup(event) {
    if (event && event.target !== event.currentTarget) return;

    const overlay = document.getElementById('promo-popup-overlay');
    if (overlay) {
        overlay.classList.remove('promo-popup-overlay--visible');
        document.body.style.overflow = '';

        // Remove from DOM after animation
        setTimeout(() => {
            overlay.remove();
        }, 400);
    }
}

// Close popup on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePromoPopup();
    }
});
