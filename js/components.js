/**
 * OSK Łuczak - Shared Components
 * Header and Footer loaded via JavaScript for global reuse
 * Updated: Clean URLs (bez .html)
 */

const components = {
    header: `
        <header class="osk-header">
            <div class="osk-nav">
                <a class="osk-brand" href="/">
                    <span class="osk-badge" aria-hidden="true">
                        <span class="osk-badge-text">OSK</span>
                    </span>
                    <span class="osk-brand-name">ŁUCZAK</span>
                </a>

                <nav class="osk-menu" aria-label="Nawigacja">
                    <a class="osk-link" href="/">START</a>
                    <a class="osk-link" href="/o-szkole">O SZKOLE</a>
                    <a class="osk-link" href="/oferta">OFERTA</a>
                    
                    <div class="osk-dropdown">
                        <button class="osk-link osk-dropdown__trigger" aria-expanded="false" aria-haspopup="true">
                            KATEGORIE
                            <svg class="osk-dropdown__arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </button>
                        <div class="osk-dropdown__menu">
                            <a class="osk-dropdown__item" href="/kategoria-b">
                                <span class="osk-dropdown__badge">B</span>
                                Kategoria B
                            </a>
                            <a class="osk-dropdown__item" href="/kategoria-b-e">
                                <span class="osk-dropdown__badge">B+E</span>
                                Kategoria B+E
                            </a>
                            <span class="osk-dropdown__item osk-dropdown__item--soon">
                                <span class="osk-dropdown__badge osk-dropdown__badge--soon">C</span>
                                Kategoria C
                                <span class="osk-dropdown__soon-label">wkrótce</span>
                            </span>

                        </div>
                    </div>
                    
                    <a class="osk-link" href="/aktualnosci">AKTUALNOŚCI</a>
                    <a class="osk-link" href="/opinie">OPINIE</a>
                    <a class="osk-link" href="/zapisy">ZAPISZ SIĘ</a>
                    <a class="osk-link" href="/kontakt">KONTAKT</a>
                    
                    <div class="osk-dropdown">
                        <button class="osk-link osk-dropdown__trigger" aria-expanded="false" aria-haspopup="true">
                            INFORMACJE
                            <svg class="osk-dropdown__arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </button>
                        <div class="osk-dropdown__menu">
                            <a class="osk-dropdown__item" href="/regulamin">
                                <svg class="osk-dropdown__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                Regulamin serwisu
                            </a>
                            <a class="osk-dropdown__item" href="/polityka-prywatnosci">
                                <svg class="osk-dropdown__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                </svg>
                                Polityka prywatności
                            </a>
                            <a class="osk-dropdown__item" href="/assets/lexkamilek.pdf" target="_blank" rel="noopener">
                                <svg class="osk-dropdown__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <path d="M12 18v-6"/>
                                    <path d="M9 15l3 3 3-3"/>
                                </svg>
                                Lex Kamilek (PDF)
                            </a>
                        </div>
                    </div>
                    
                    <!-- Mobile-only CTA inside menu -->
                    <a class="osk-menu-cta" href="tel:+48795499047">
                        <svg class="osk-cta__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                        ZADZWOŃ
                    </a>
                </nav>

                <a class="osk-cta" href="tel:+48795499047">
                    <svg class="osk-cta__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    ZADZWOŃ
                </a>
                
                <button class="osk-burger" id="nav-burger" aria-label="Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </header>
    `,

    footer: `
        <footer class="footer">
            <div class="footer__container">
                <div class="footer__main">
                    <!-- Logo & Description -->
                    <div class="footer__brand">
                        <a href="/" class="footer__logo">
                            <span class="footer__logo-badge">OSK</span>
                            <span class="footer__logo-text">Łuczak</span>
                        </a>
                        <p class="footer__description">
                            Profesjonalna szkoła jazdy z wieloletnim doświadczeniem. Szkolimy przyszłych kierowców w przyjaznej atmosferze.
                        </p>
                    </div>
                    
                    <!-- Quick Links -->
                    <div class="footer__column">
                        <h4 class="footer__title">Nawigacja</h4>
                        <ul class="footer__links">
                            <li><a href="/">Strona główna</a></li>
                            <li><a href="/o-szkole">O szkole</a></li>
                            <li><a href="/oferta">Oferta</a></li>
                            <li><a href="/aktualnosci">Aktualności</a></li>
                            <li><a href="/opinie">Opinie</a></li>
                            <li><a href="/zapisy">Zapisz się</a></li>
                            <li><a href="/kontakt">Kontakt</a></li>
                        </ul>
                    </div>
                    
                    <!-- Courses -->
                    <div class="footer__column">
                        <h4 class="footer__title">Kursy</h4>
                        <ul class="footer__links">
                            <li><a href="/kategoria-b">Kategoria B</a></li>
                            <li><a href="/kategoria-b-e">Kategoria B+E</a></li>
                            <li><span class="footer__soon">Kategoria C - wkrótce</span></li>
                        </ul>
                    </div>
                    
                    <!-- Useful Links -->
                    <div class="footer__column">
                        <h4 class="footer__title">Przydatne linki</h4>
                        <ul class="footer__links">
                            <li><a href="https://www.gov.pl/web/infrastruktura/prawo-jazdy" target="_blank" rel="noopener">Prawo jazdy - gov.pl</a></li>
                            <li><a href="https://info-car.pl/" target="_blank" rel="noopener">Info-car</a></li>
                            <li><a href="https://www.word.poznan.pl/" target="_blank" rel="noopener">WORD Poznań</a></li>
                            <li><a href="https://www.word.pila.pl/" target="_blank" rel="noopener">WORD Piła</a></li>
                            <li><a href="/assets/lexkamilek.pdf" target="_blank" rel="noopener">Lex Kamilek</a></li>
                        </ul>
                    </div>
                    
                    <!-- Contact -->
                    <div class="footer__column footer__column--contact">
                        <h4 class="footer__title">Kontakt</h4>
                        <ul class="footer__contact">
                            <li>
                                <div class="footer__contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                                    </svg>
                                </div>
                                <a href="tel:+48795499047">+48 795 499 047</a>
                            </li>
                            <li>
                                <div class="footer__contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <path d="M22 6l-10 7L2 6"/>
                                    </svg>
                                </div>
                                <a href="mailto:kontakt@luczakosk.com">kontakt@luczakosk.com</a>
                            </li>
                            <li>
                                <div class="footer__contact-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                </div>
                                <span>Wilkowyja 18, 62-270 Kłecko</span>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer__divider"></div>
                
                <div class="footer__bottom">
                    <div class="footer__legal">
                        <a href="/polityka-prywatnosci">Polityka prywatności</a>
                        <span class="footer__legal-divider">•</span>
                        <a href="/regulamin">Regulamin</a>
                        <span class="footer__legal-divider">•</span>
                        <button type="button" id="open-cookie-settings">Ustawienia cookies</button>
                    </div>
                    <p class="footer__copyright">
                        © ${new Date().getFullYear()} OSK Łuczak. Wszelkie prawa zastrzeżone.
                    </p>
                    <p class="footer__credit">
                        Wykonanie: <a href="https://stxworks.pl" target="_blank" rel="noopener">STX Works</a>
                    </p>
                </div>
            </div>
        </footer>
    `,

    scrollIndicator: `
        <button class="scroll-to-top" aria-label="Przewiń do góry" id="scrollToTop">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        </button>
    `
};
