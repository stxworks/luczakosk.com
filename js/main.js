/**
 * OSK Łuczak - Main JavaScript
 * Note: Supabase configuration is now in js/supabase.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize loader first
    initLoader();

    // Load components
    loadComponents();

    // Initialize lazy loading for images
    initLazyLoading();

    // Initialize navigation
    initNavigation();

    // Initialize smooth scroll
    initSmoothScroll();

    // Mark active nav link
    markActiveLink();

    // Load news from Supabase
    loadNews();

    // Initialize scroll position restoration
    initScrollPositionRestore();

    // Note: FAQ accordion uses native HTML name attribute for exclusive behavior
});

/**
 * Initialize lazy loading for all images
 * Automatically adds loading="lazy" to all img elements
 * Uses MutationObserver to handle dynamically added images
 */
function initLazyLoading() {
    // Apply lazy loading to all existing images
    applyLazyLoadingToImages();

    // Watch for dynamically added images
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Check if the added node is an image
                if (node.nodeName === 'IMG') {
                    applyLazyLoadingToImage(node);
                }
                // Check for images within added nodes
                if (node.querySelectorAll) {
                    const images = node.querySelectorAll('img');
                    images.forEach(img => applyLazyLoadingToImage(img));
                }
            });
        });
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

/**
 * Apply lazy loading to all images on the page
 */
function applyLazyLoadingToImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => applyLazyLoadingToImage(img));
}

/**
 * Apply lazy loading to a single image
 * Skips images that are:
 * - Already have loading attribute set
 * - Above the fold (hero images)
 * - Have data-no-lazy attribute
 */
function applyLazyLoadingToImage(img) {
    // Skip if already has loading attribute
    if (img.hasAttribute('loading')) return;

    // Skip if explicitly marked as no-lazy
    if (img.hasAttribute('data-no-lazy')) return;

    // Skip hero background images (above the fold)
    if (img.classList.contains('hero__bg-img')) {
        img.setAttribute('loading', 'eager');
        return;
    }

    // Apply lazy loading
    img.setAttribute('loading', 'lazy');

    // Add decoding async for better performance
    if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
    }
}

/**
 * Initialize page loader
 * Shows loader while page initializes and scroll position is restored
 * Only active on index.html (homepage)
 */
function initLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    // Only show loader on homepage (index.html)
    const isHomepage = window.location.pathname === '/' ||
        window.location.pathname.endsWith('index.html') ||
        window.location.pathname.endsWith('/');

    if (!isHomepage) {
        // Remove loader immediately on other pages
        loader.remove();
        return;
    }

    // Hide loader after scroll restore and a minimum display time
    const minDisplayTime = 600; // minimum ms to show loader (for smooth UX)
    const startTime = Date.now();

    // Wait for scroll restore to complete, then hide loader
    setTimeout(() => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);

        setTimeout(() => {
            loader.classList.add('hidden');
            // Remove from DOM after transition
            setTimeout(() => {
                loader.remove();
            }, 500);
        }, remainingTime);
    }, 150); // Wait for scroll position restore (100ms in initScrollPositionRestore + buffer)
}

/**
 * Save and restore scroll position
 * - Page refresh (F5): restore scroll position
 * - Navigation between pages: scroll to top
 * Uses sessionStorage and Performance Navigation API
 */
function initScrollPositionRestore() {
    const storageKey = 'osk_scroll_position_' + window.location.pathname;

    // Detect navigation type
    // type 0 = navigate (clicked link, typed URL)
    // type 1 = reload (F5, refresh button)
    // type 2 = back/forward button
    const navigationType = getNavigationType();

    // Restore scroll position after a short delay (to let the page render)
    setTimeout(() => {
        // If URL has a hash, let the browser handle anchor navigation
        if (window.location.hash) {
            return;
        }

        if (navigationType === 'reload') {
            // Page was refreshed - restore scroll position
            const savedPosition = sessionStorage.getItem(storageKey);
            if (savedPosition) {
                window.scrollTo(0, parseInt(savedPosition, 10));
            }
        } else if (navigationType === 'back_forward') {
            // Back/forward navigation - restore scroll position
            const savedPosition = sessionStorage.getItem(storageKey);
            if (savedPosition) {
                window.scrollTo(0, parseInt(savedPosition, 10));
            }
        } else {
            // New navigation (link click) - scroll to top
            window.scrollTo(0, 0);
        }
    }, 100);

    // Save scroll position on scroll (debounced)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            sessionStorage.setItem(storageKey, window.scrollY.toString());
        }, 100);
    });

    // Also save before page unload
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem(storageKey, window.scrollY.toString());
    });
}

/**
 * Get the type of navigation that led to this page
 * Uses Performance Navigation Timing API with fallback
 */
function getNavigationType() {
    // Modern API (Performance Navigation Timing API)
    if (window.performance && performance.getEntriesByType) {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
            const navType = navEntries[0].type;
            if (navType === 'reload') return 'reload';
            if (navType === 'back_forward') return 'back_forward';
            return 'navigate'; // 'navigate' or 'prerender'
        }
    }

    // Fallback for older browsers (deprecated API)
    if (window.performance && performance.navigation) {
        const type = performance.navigation.type;
        if (type === 1) return 'reload';
        if (type === 2) return 'back_forward';
        return 'navigate';
    }

    // Default to navigate if we can't determine
    return 'navigate';
}

/**
 * Load header and footer components
 */
function loadComponents() {
    const headerEl = document.getElementById('header');
    const footerEl = document.getElementById('footer');

    if (headerEl && components.header) {
        headerEl.innerHTML = components.header;
    }

    if (footerEl && components.footer) {
        footerEl.innerHTML = components.footer;
    }

    // Add scroll-to-top button to body if component exists
    if (components.scrollIndicator) {
        // Check if scroll to top button doesn't already exist
        if (!document.getElementById('scrollToTop')) {
            document.body.insertAdjacentHTML('beforeend', components.scrollIndicator);
            initScrollToTop();
        }
    }
}

/**
 * Initialize scroll-to-top button functionality
 */
function initScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTop');
    if (!scrollBtn) return;

    // Show/hide button based on scroll position
    const toggleVisibility = () => {
        if (window.scrollY > 400) {
            scrollBtn.classList.add('is-visible');
        } else {
            scrollBtn.classList.remove('is-visible');
        }
    };

    // Initial check
    toggleVisibility();

    // Listen for scroll with throttling for performance
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                toggleVisibility();
                ticking = false;
            });
            ticking = true;
        }
    });

    // Scroll to top on click
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Initialize mobile navigation
 */
function initNavigation() {
    // Wait for components to load
    setTimeout(() => {
        const burger = document.getElementById('nav-burger');
        const navMenu = document.querySelector('.osk-menu');
        const header = document.querySelector('.osk-header');
        const body = document.body;

        // Toggle mobile menu
        if (burger && navMenu) {
            burger.addEventListener('click', () => {
                const isOpen = navMenu.classList.contains('is-open');

                if (isOpen) {
                    closeMobileMenu();
                } else {
                    openMobileMenu();
                }
            });

            // Close menu on link click (except dropdown trigger)
            navMenu.querySelectorAll('a.osk-link, .osk-dropdown__item[href], .osk-menu-cta').forEach(link => {
                link.addEventListener('click', () => {
                    closeMobileMenu();
                });
            });
        }

        // Mobile dropdown toggle
        const dropdownTrigger = document.querySelector('.osk-dropdown__trigger');
        const dropdown = document.querySelector('.osk-dropdown');

        if (dropdownTrigger && dropdown) {
            dropdownTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                dropdown.classList.toggle('is-open');
                const isExpanded = dropdown.classList.contains('is-open');
                dropdownTrigger.setAttribute('aria-expanded', isExpanded);
            });
        }

        function openMobileMenu() {
            burger.classList.add('is-active');
            navMenu.classList.add('is-open');
            body.style.overflow = 'hidden';
        }

        function closeMobileMenu() {
            burger.classList.remove('is-active');
            navMenu.classList.remove('is-open');
            body.style.overflow = '';
        }

        // Header scroll effect
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    header.classList.add('is-scrolled');
                } else {
                    header.classList.remove('is-scrolled');
                }
            });
        }

        // Close menu on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu?.classList.contains('is-open')) {
                closeMobileMenu();
            }
        });
    }, 0);
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Mark current page link as active
 */
function markActiveLink() {
    setTimeout(() => {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.osk-link:not(.osk-dropdown__trigger)');
        const dropdownTrigger = document.querySelector('.osk-dropdown__trigger');
        const dropdownItems = document.querySelectorAll('.osk-dropdown__item');

        // Check regular nav links
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Normalize paths for comparison (remove hash for proper matching)
            const normalizedCurrent = currentPath.replace(/\\/g, '/').toLowerCase();
            const normalizedHref = href.split('#')[0].replace(/\\/g, '/').toLowerCase();

            // Special case for index.html (homepage)
            if (normalizedHref === 'index.html') {
                // Match if:
                // - pathname is exactly "/"
                // - pathname ends with "/"
                // - pathname ends with "/index.html" but NOT in a subdirectory like "aktualnosci/"
                const isRoot = normalizedCurrent === '/' ||
                    normalizedCurrent === '' ||
                    (normalizedCurrent.endsWith('/') && !normalizedCurrent.slice(0, -1).includes('/')) ||
                    (normalizedCurrent.endsWith('/index.html') &&
                        (normalizedCurrent === '/index.html' ||
                            normalizedCurrent.split('/').filter(Boolean).length === 1));

                if (isRoot) {
                    link.classList.add('is-active');
                }
                return;
            }

            // Check if current path ends with the href (exact match)
            if (normalizedCurrent.endsWith('/' + normalizedHref) ||
                normalizedCurrent.endsWith(normalizedHref)) {

                if (normalizedHref.includes('/')) {
                    // For paths with directories, match the full path
                    if (normalizedCurrent.endsWith(normalizedHref)) {
                        link.classList.add('is-active');
                    }
                } else {
                    // For simple filenames, match only if not in a subdirectory
                    const currentFilename = normalizedCurrent.split('/').pop();
                    if (currentFilename === normalizedHref) {
                        link.classList.add('is-active');
                    }
                }
            }
        });

        // Check dropdown items (course pages)
        let dropdownActive = false;
        dropdownItems.forEach(item => {
            const href = item.getAttribute('href');
            if (!href) return;

            const normalizedCurrent = currentPath.replace(/\\/g, '/').toLowerCase();
            const normalizedHref = href.replace(/\\/g, '/').toLowerCase();

            if (normalizedCurrent.endsWith(normalizedHref)) {
                item.classList.add('is-active');
                dropdownActive = true;
            }
        });

        // If any dropdown item is active, mark the trigger as active too
        if (dropdownActive && dropdownTrigger) {
            dropdownTrigger.classList.add('is-active');
        }
    }, 0);
}

/**
 * Load news from Supabase
 */
async function loadNews() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;

    try {
        // Use the helper function from supabase.js
        const { data: news } = await fetchPublishedNews({ limit: 3 });

        if (!news || news.length === 0) {
            newsGrid.innerHTML = `
                <div class="news__empty">
                    <p>Brak aktualności do wyświetlenia.</p>
                </div>
            `;
            return;
        }

        renderNews(newsGrid, news);

    } catch (error) {
        console.error('Error loading news:', error);
        // Show placeholder on error
        showPlaceholderNews(newsGrid);
    }
}

/**
 * Render news cards
 */
function renderNews(container, news) {
    container.innerHTML = news.map(item => {
        // Handle category as object or string
        const category = item.category || {};
        const categoryName = typeof category === 'string' ? category : category.name;
        const categoryColor = category.color || '#1a56db';
        const date = formatDatePL ? formatDatePL(item.published_at || item.created_at) : formatDate(item.created_at);

        return `
            <article class="news-card">
                ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" class="news-card__image" loading="lazy" decoding="async">` :
                `<div class="news-card__image"></div>`}
                <div class="news-card__content">
                    <div class="news-card__meta">
                        ${categoryName ? `<span class="news-card__category" style="background-color: ${categoryColor}; color: white;">${categoryName}</span>` : ''}
                        <span class="news-card__date">${date}</span>
                    </div>
                    <h3 class="news-card__title">${item.title}</h3>
                    <p class="news-card__excerpt">${item.excerpt || ''}</p>
                    <a href="artykul.html?slug=${item.slug || item.id}" class="news-card__link">
                        Czytaj więcej
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </a>
                </div>
            </article>
        `;
    }).join('');
}

/**
 * Show placeholder news for development
 */
function showPlaceholderNews(container) {
    // Use placeholder data from supabase.js if available
    if (typeof getPlaceholderNews === 'function') {
        const { data } = getPlaceholderNews({ limit: 3 });
        renderNews(container, data);
        return;
    }

    // Fallback placeholder
    const placeholderNews = [
        {
            title: 'Nowy termin kursu od stycznia 2025',
            excerpt: 'Ruszamy z nowym kursem prawa jazdy kategorii B. Zapisz się już dziś i skorzystaj z promocyjnej ceny!',
            category: { name: 'Kursy', color: '#22c55e' },
            created_at: new Date().toISOString()
        },
        {
            title: 'Zmiana godzin pracy biura',
            excerpt: 'Informujemy o nowych godzinach pracy biura w okresie świątecznym. Zapraszamy do kontaktu telefonicznego.',
            category: { name: 'Ogłoszenia', color: '#f59e0b' },
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            title: 'Gratulacje dla naszych kursantów!',
            excerpt: 'Z dumą informujemy, że w tym miesiącu wszyscy nasi kursanci zdali egzamin za pierwszym razem!',
            category: { name: 'Sukces', color: '#8b5cf6' },
            created_at: new Date(Date.now() - 172800000).toISOString()
        }
    ];

    renderNews(container, placeholderNews);
}

/**
 * Format date to Polish locale
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * FAQ Accordion with FLIP-based smooth animations
 * Adapted from working reference - supports simultaneous open/close
 * Works with <details>/<summary> structure
 */
function initFaqAccordion() {
    const accordions = document.querySelectorAll('.faq-accordion');
    if (!accordions.length) return;

    accordions.forEach(accordion => {
        const items = Array.from(accordion.querySelectorAll('.faq-item'));
        const singleOpen = true; // Only one open at a time

        // Get parts from faq-item (details element)
        const parts = (item) => ({
            summary: item.querySelector('summary'),
            content: item.querySelector('.faq-content'),
        });

        // Check if expanded
        const isExpanded = (item) => item.hasAttribute('open');

        // FREEZE - freezes height before animation, cancels previous
        function freeze(content) {
            if (content.__cancel) content.__cancel();
            const h = content.getBoundingClientRect().height;
            content.style.transition = 'none';
            content.style.height = h + 'px';
            void content.offsetHeight; // force reflow
            return h;
        }

        // OPEN item with smooth animation
        function openItem(item) {
            const { summary, content } = parts(item);
            if (!content || isExpanded(item)) return;

            // Set open state immediately (for visual feedback)
            item.setAttribute('open', '');
            item.classList.add('is-animating');

            freeze(content);
            content.style.overflow = 'hidden';
            content.style.opacity = '1';
            content.style.visibility = 'visible';

            const targetHeight = content.scrollHeight;

            const onEnd = (e) => {
                if (!e || (e.target === content && e.propertyName === 'height')) {
                    content.style.transition = 'none';
                    content.style.height = 'auto';
                    content.style.overflow = '';
                    item.classList.remove('is-animating');
                    content.__cancel = null;
                    content.removeEventListener('transitionend', onEnd);
                }
            };

            content.__cancel = () => {
                content.removeEventListener('transitionend', onEnd);
                content.style.transition = 'none';
                content.__cancel = null;
            };

            requestAnimationFrame(() => {
                content.style.transition = 'height 350ms cubic-bezier(.25,.8,.25,1), opacity 250ms ease';
                content.style.height = targetHeight + 'px';
                content.addEventListener('transitionend', onEnd);
            });
        }

        // CLOSE item with smooth animation
        function closeItem(item) {
            const { summary, content } = parts(item);
            if (!content) return;

            if (!isExpanded(item) && content.style.height === '0px') {
                return;
            }

            item.classList.add('is-animating');
            freeze(content);

            const onEnd = (e) => {
                if (!e || (e.target === content && e.propertyName === 'height')) {
                    item.removeAttribute('open');
                    item.classList.remove('is-animating');
                    content.style.transition = 'none';
                    content.style.height = '0px';
                    content.style.opacity = '0';
                    content.style.visibility = 'hidden';
                    content.style.overflow = '';
                    content.__cancel = null;
                    content.removeEventListener('transitionend', onEnd);
                }
            };

            content.__cancel = () => {
                content.removeEventListener('transitionend', onEnd);
                content.style.transition = 'none';
                content.__cancel = null;
            };

            requestAnimationFrame(() => {
                content.style.transition = 'height 300ms cubic-bezier(.4,0,.2,1), opacity 200ms ease';
                content.style.height = '0px';
                content.style.opacity = '0';
                content.addEventListener('transitionend', onEnd);
            });
        }

        // Close all other items (accordion mode)
        function closeOthers(except) {
            items.forEach(it => {
                if (it !== except && isExpanded(it)) {
                    closeItem(it);
                }
            });
        }

        // INITIALIZE each item
        items.forEach(item => {
            const { summary, content } = parts(item);
            if (!summary || !content) return;

            // Initial state - all closed
            if (!item.hasAttribute('open')) {
                content.style.height = '0px';
                content.style.opacity = '0';
                content.style.visibility = 'hidden';
                content.style.overflow = 'hidden';
            } else {
                // If open by default, set proper state
                content.style.height = 'auto';
                content.style.opacity = '1';
                content.style.visibility = 'visible';
            }

            // Handle click on summary
            summary.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent native details toggle

                if (isExpanded(item)) {
                    closeItem(item);
                } else {
                    if (singleOpen) closeOthers(item);
                    openItem(item);
                }
            });
        });
    });
}

// Initialize FAQ accordion when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other scripts are loaded
    setTimeout(initFaqAccordion, 50);
});
