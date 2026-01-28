/**
 * OSK Łuczak - Scroll Animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounterAnimation();
});

/**
 * Initialize Intersection Observer for scroll reveal animations
 */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length === 0) return;

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optionally unobserve after animation
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
}

/**
 * Initialize counter animation for stats
 */
function initCounterAnimation() {
    // Support hero stats, page-hero stats, and reviews-hero stats
    const statsBar = document.querySelector('.hero__stats') || document.querySelector('.page-hero__stats') || document.querySelector('.reviews-hero__stats');
    if (!statsBar) return;

    const counters = document.querySelectorAll('[data-count]');
    if (counters.length === 0) return;

    let animated = false;

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                animateCounters(counters);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    observer.observe(statsBar);
}

/**
 * Animate counter numbers
 */
function animateCounters(counters) {
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const originalText = counter.textContent;
        const suffix = originalText.replace(/[0-9]/g, ''); // Get +, %, etc.
        const duration = 2000; // 2 seconds
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);

            counter.textContent = current + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target + suffix;
            }
        }

        requestAnimationFrame(updateCounter);
    });
}
