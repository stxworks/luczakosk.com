/**
 * OSK Łuczak - Cookie Consent Manager
 * RODO/GDPR Compliant Cookie Banner
 */

const CookieConsent = {
    // Cookie categories
    CATEGORIES: {
        necessary: {
            name: 'Niezbędne',
            description: 'Pliki cookie niezbędne do podstawowego funkcjonowania strony. Nie wymagają zgody.',
            required: true
        },
        analytics: {
            name: 'Analityczne',
            description: 'Pomagają nam zrozumieć, jak użytkownicy korzystają z naszej strony.',
            required: false
        },
        marketing: {
            name: 'Marketingowe',
            description: 'Służą do wyświetlania spersonalizowanych reklam.',
            required: false
        }
    },

    // Default consent state
    defaultConsent: {
        necessary: true,
        analytics: false,
        marketing: false
    },

    // Initialize cookie consent
    init() {
        // Check if user has already given consent - if so, don't create banner/modal at all
        const existingConsent = this.getConsent();
        if (existingConsent) {
            // User already consented - apply the saved consent and exit
            this.applyConsent(existingConsent);
            // Only create modal (for footer settings link), but hidden
            this.createModal();
            this.bindModalEvents();
            return;
        }

        // No consent yet - create banner and modal
        this.createBanner();
        this.createModal();
        this.bindEvents();
        this.showBanner();
    },

    // Check if user has already given consent
    checkConsent() {
        const consent = this.getConsent();
        if (!consent) {
            this.showBanner();
        }
    },

    // Get stored consent from localStorage
    getConsent() {
        const consent = localStorage.getItem('osk_cookie_consent');
        return consent ? JSON.parse(consent) : null;
    },

    // Save consent to localStorage
    saveConsent(consent) {
        consent.timestamp = new Date().toISOString();
        localStorage.setItem('osk_cookie_consent', JSON.stringify(consent));
    },

    // Create cookie banner HTML
    createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-labelledby', 'cookie-banner-title');
        banner.setAttribute('aria-describedby', 'cookie-banner-desc');

        banner.innerHTML = `
            <div class="cookie-banner__container">
                <div class="cookie-banner__content">
                    <div class="cookie-banner__icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
                            <circle cx="15" cy="8" r="1" fill="currentColor"/>
                            <circle cx="10" cy="14" r="1" fill="currentColor"/>
                            <circle cx="16" cy="13" r="1.5" fill="currentColor"/>
                            <circle cx="13" cy="17" r="1" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="cookie-banner__text">
                        <h3 id="cookie-banner-title" class="cookie-banner__title">
                            Ta strona używa plików cookie
                        </h3>
                        <p id="cookie-banner-desc" class="cookie-banner__description">
                            Używamy plików cookie, aby zapewnić prawidłowe działanie strony, analizować ruch oraz personalizować treści. 
                            Możesz zaakceptować wszystkie pliki cookie, tylko niezbędne lub dostosować swoje preferencje.
                            <a href="polityka-prywatnosci.html" class="cookie-banner__link">Dowiedz się więcej</a>
                        </p>
                    </div>
                </div>
                <div class="cookie-banner__actions">
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--secondary" id="cookie-manage">
                        Zarządzaj
                    </button>
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--outline" id="cookie-necessary">
                        Akceptuj wymagane
                    </button>
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" id="cookie-accept-all">
                        Akceptuj wszystkie
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    },

    // Create cookie settings modal
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'cookie-modal';
        modal.className = 'cookie-modal';
        // Hide by default inline to prevent flash before CSS loads
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'cookie-modal-title');
        modal.setAttribute('aria-modal', 'true');

        const currentConsent = this.getConsent() || this.defaultConsent;

        modal.innerHTML = `
            <div class="cookie-modal__overlay" id="cookie-modal-overlay"></div>
            <div class="cookie-modal__container">
                <div class="cookie-modal__header">
                    <h3 id="cookie-modal-title" class="cookie-modal__title">Ustawienia plików cookie</h3>
                    <button type="button" class="cookie-modal__close" id="cookie-modal-close" aria-label="Zamknij">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="cookie-modal__body">
                    <p class="cookie-modal__intro">
                        Poniżej możesz dostosować swoje preferencje dotyczące plików cookie. 
                        Pliki niezbędne są zawsze aktywne, ponieważ są wymagane do prawidłowego działania strony.
                    </p>
                    
                    <div class="cookie-modal__categories">
                        ${Object.entries(this.CATEGORIES).map(([key, category]) => `
                            <div class="cookie-category">
                                <div class="cookie-category__header">
                                    <div class="cookie-category__info">
                                        <h4 class="cookie-category__name">${category.name}</h4>
                                        <p class="cookie-category__description">${category.description}</p>
                                    </div>
                                    <label class="cookie-toggle ${category.required ? 'cookie-toggle--disabled' : ''}">
                                        <input 
                                            type="checkbox" 
                                            class="cookie-toggle__input" 
                                            data-category="${key}"
                                            ${currentConsent[key] ? 'checked' : ''}
                                            ${category.required ? 'disabled checked' : ''}
                                        >
                                        <span class="cookie-toggle__slider"></span>
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="cookie-modal__footer">
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--outline" id="cookie-save-preferences">
                        Zapisz preferencje
                    </button>
                    <button type="button" class="cookie-banner__btn cookie-banner__btn--primary" id="cookie-modal-accept-all">
                        Akceptuj wszystkie
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    // Bind event listeners
    bindEvents() {
        // Banner buttons
        document.getElementById('cookie-accept-all')?.addEventListener('click', () => this.acceptAll());
        document.getElementById('cookie-necessary')?.addEventListener('click', () => this.acceptNecessary());
        document.getElementById('cookie-manage')?.addEventListener('click', () => this.showModal());

        // Modal events
        this.bindModalEvents();
    },

    // Bind only modal-related events (used when user already consented)
    bindModalEvents() {
        // Modal buttons
        document.getElementById('cookie-modal-close')?.addEventListener('click', () => this.hideModal());
        document.getElementById('cookie-modal-overlay')?.addEventListener('click', () => this.hideModal());
        document.getElementById('cookie-save-preferences')?.addEventListener('click', () => this.savePreferences());
        document.getElementById('cookie-modal-accept-all')?.addEventListener('click', () => this.acceptAll());

        // Footer settings link (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#open-cookie-settings')) {
                e.preventDefault();
                this.showModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('cookie-modal')?.classList.contains('is-visible')) {
                this.hideModal();
            }
        });
    },

    // Show cookie banner
    showBanner() {
        setTimeout(() => {
            document.getElementById('cookie-banner')?.classList.add('is-visible');
        }, 500);
    },

    // Hide cookie banner
    hideBanner() {
        document.getElementById('cookie-banner')?.classList.remove('is-visible');
    },

    // Show settings modal
    showModal() {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            this.updateModalCheckboxes();
            // Clear inline styles so CSS can take over
            modal.style.visibility = '';
            modal.style.opacity = '';
            modal.classList.add('is-visible');
            document.body.style.overflow = 'hidden';
        }
    },

    // Hide settings modal
    hideModal() {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            modal.classList.remove('is-visible');
            document.body.style.overflow = '';
        }
    },

    // Update modal checkboxes based on current consent
    updateModalCheckboxes() {
        const consent = this.getConsent() || this.defaultConsent;
        document.querySelectorAll('.cookie-toggle__input').forEach(input => {
            const category = input.dataset.category;
            if (category && !this.CATEGORIES[category].required) {
                input.checked = consent[category] || false;
            }
        });
    },

    // Accept all cookies
    acceptAll() {
        const consent = {
            necessary: true,
            analytics: true,
            marketing: true
        };
        this.saveConsent(consent);
        this.hideBanner();
        this.hideModal();
        this.applyConsent(consent);
    },

    // Accept only necessary cookies
    acceptNecessary() {
        const consent = {
            necessary: true,
            analytics: false,
            marketing: false
        };
        this.saveConsent(consent);
        this.hideBanner();
        this.applyConsent(consent);
    },

    // Save custom preferences
    savePreferences() {
        const consent = { necessary: true };
        document.querySelectorAll('.cookie-toggle__input').forEach(input => {
            const category = input.dataset.category;
            if (category) {
                consent[category] = input.checked;
            }
        });
        this.saveConsent(consent);
        this.hideBanner();
        this.hideModal();
        this.applyConsent(consent);
    },

    // Apply consent (enable/disable scripts based on consent)
    applyConsent(consent) {
        // Here you would enable/disable analytics, marketing scripts etc.
        // Example: if (consent.analytics) { loadGoogleAnalytics(); }
        console.log('Cookie consent applied:', consent);

        // Dispatch custom event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: consent }));
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CookieConsent.init();
});
