/**
 * OSK Łuczak - Admin Panel JavaScript
 */

// ============================================
// ACCESS CONTROL
// ============================================
// Konta z pełnym dostępem (mogą usuwać)
const FULL_ACCESS_EMAILS = [
    'wojtek.osk@wp.pl',
    'stachowiakjakub000@gmail.com'
];

// Sprawdź czy zalogowany użytkownik ma pełny dostęp
function hasFullAccess() {
    if (!currentUser || !currentUser.email) return false;
    return FULL_ACCESS_EMAILS.includes(currentUser.email.toLowerCase());
}

// BEZPIECZEŃSTWO: Sprawdź czy użytkownik jest zalogowany
// ZAWSZE sprawdza sesję Supabase - nie polega na zmiennej currentUser
async function requireAuth() {
    // KRYTYCZNE: Zawsze sprawdź sesję w Supabase
    if (!isSupabaseConfigured()) {
        forceLogout('System autoryzacji niedostępny.');
        return false;
    }

    try {
        const user = await getCurrentUser();

        // Brak sesji Supabase = brak autoryzacji
        if (!user || !user.email) {
            forceLogout('Sesja wygasła. Zaloguj się ponownie.');
            return false;
        }

        // Sprawdź czy email jest na liście autoryzowanych
        if (window.AdminSecurity && !AdminSecurity.isAuthorizedAdmin(user.email)) {
            forceLogout('Brak uprawnień administratora.');
            return false;
        }

        // Aktualizuj currentUser dla spójności
        currentUser = user;
        return true;

    } catch (error) {
        console.error('Auth check failed:', error);
        forceLogout('Błąd autoryzacji.');
        return false;
    }
}

// Wymuś wylogowanie
function forceLogout(message) {
    currentUser = null;
    showLoginPage();
    if (message) {
        showLoginError(message);
    }
}

// BEZPIECZEŃSTWO: Monitoruj manipulacje DOM przez DevTools
function setupDOMSecurityMonitor() {
    const adminLayout = document.getElementById('admin-layout');
    const loginPage = document.getElementById('login-page');

    if (!adminLayout || !loginPage) return;

    // Flaga sprawdzania - unikamy wielokrotnych wywołań
    let isChecking = false;

    // Funkcja sprawdzająca autoryzację przez Supabase
    async function verifySession() {
        if (isChecking) return;
        isChecking = true;

        try {
            if (!isSupabaseConfigured()) {
                return false;
            }
            const user = await getCurrentUser();
            return user && user.email &&
                (window.AdminSecurity ? AdminSecurity.isAuthorizedAdmin(user.email) : true);
        } catch {
            return false;
        } finally {
            isChecking = false;
        }
    }

    // Observer który wykrywa zmiany klasy is-visible
    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                // Jeśli admin-layout ma is-visible - weryfikuj z Supabase
                if (adminLayout.classList.contains('is-visible')) {
                    const isValid = await verifySession();
                    if (!isValid) {
                        console.warn('SECURITY: Wykryto nieautoryzowany dostęp do panelu!');
                        adminLayout.classList.remove('is-visible');
                        loginPage.classList.add('is-visible');
                        showLoginError('Wykryto nieautoryzowany dostęp. Zaloguj się.');
                    }
                }
            }
        }
    });

    // Obserwuj zmiany klas na obu elementach
    observer.observe(adminLayout, { attributes: true, attributeFilter: ['class'] });
    observer.observe(loginPage, { attributes: true, attributeFilter: ['class'] });

    // Dodatkowa weryfikacja co 2 sekundy - sprawdza Supabase
    setInterval(async () => {
        if (adminLayout.classList.contains('is-visible')) {
            const isValid = await verifySession();
            if (!isValid) {
                adminLayout.classList.remove('is-visible');
                loginPage.classList.add('is-visible');
            }
        }
    }, 2000);
}

// ============================================
// STATE
// ============================================
let currentView = 'dashboard';
let currentUser = null;
let newsData = [];
let categoriesData = [];
let quillEditor = null;
let editingArticleId = null;
let uploadedImageUrl = null;

// ============================================
// DOM ELEMENTS
// ============================================
const loginPage = document.getElementById('login-page');
const adminLayout = document.getElementById('admin-layout');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const loginAlert = document.getElementById('login-alert');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth state - jeśli nie zalogowany, przekieruje na index.html
    await checkAuthState();

    // Setup event listeners
    setupEventListeners();
});

// ============================================
// AUTHENTICATION
// ============================================
async function checkAuthState() {
    try {
        // Require Supabase to be configured
        if (!isSupabaseConfigured()) {
            redirectToLogin();
            return;
        }

        const user = await getCurrentUser();
        if (user) {
            // Check lockout for this user (server-side)
            if (window.AdminSecurity) {
                const lockoutStatus = await AdminSecurity.checkLockout(user.email);
                if (lockoutStatus.locked) {
                    await signOut();
                    redirectToLogin();
                    return;
                }
            }

            // Verify admin access
            if (window.AdminSecurity && !AdminSecurity.verifyAdminAccess(user)) {
                await signOut();
                redirectToLogin();
                return;
            }

            currentUser = user;

            // SUKCES - ukryj ekran błędu i pokaż panel
            const authDenied = document.getElementById('auth-denied');
            const adminLayout = document.getElementById('admin-layout');
            if (authDenied) authDenied.classList.add('auth-passed');
            if (adminLayout) adminLayout.classList.add('auth-verified');

            updateUserInfo();
            await loadDashboardData();

            // Start session timeout
            if (window.AdminSecurity && AdminSecurity.startSessionTimeout) {
                AdminSecurity.startSessionTimeout(handleLogout);
            }
        } else {
            // NIE ZALOGOWANY - ekran błędu jest już widoczny
            console.log('Brak sesji - wymagane logowanie');
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // Ekran błędu jest już widoczny
    }
}

// Przekieruj na stronę logowania
function redirectToLogin() {
    const isAdminSubdomain = window.location.hostname === 'admin.luczakosk.com';
    window.location.href = isAdminSubdomain ? '/' : '/admin/';
}

function showLoginPage() {
    // Dla kompatybilności - przekieruj
    redirectToLogin();
}

function showAdminLayout() {
    // Panel jest już widoczny - tylko zaktualizuj info
    updateUserInfo();
}

async function handleLogin(e) {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        showLoginError('Wprowadź email i hasło');
        return;
    }

    // Check lockout first (server-side)
    let lockoutStatus = null;
    if (window.AdminSecurity) {
        lockoutStatus = await AdminSecurity.checkLockout(email);
        if (lockoutStatus.locked) {
            showLoginError(lockoutStatus.message || 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.');
            return;
        }
    }

    // Check if email is in allowed list before attempting login
    if (window.AdminSecurity && !AdminSecurity.isAuthorizedAdmin(email)) {
        await AdminSecurity.recordLoginAttempt(email, false);
        lockoutStatus = await AdminSecurity.checkLockout(email);
        showLoginError(AdminSecurity.getSecureErrorMessage(lockoutStatus));
        return;
    }

    // Require Supabase
    if (!isSupabaseConfigured()) {
        showLoginError('System logowania nie jest skonfigurowany');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Logowanie...';

    try {
        const data = await signIn(email, password);

        // Verify admin access after successful auth
        if (window.AdminSecurity && !AdminSecurity.verifyAdminAccess(data.user)) {
            await signOut();
            await AdminSecurity.recordLoginAttempt(email, false);
            lockoutStatus = await AdminSecurity.checkLockout(email);
            showLoginError('Brak uprawnień administratora');
            return;
        }

        // Record successful login (clears failed attempts on server)
        if (window.AdminSecurity) {
            await AdminSecurity.recordLoginAttempt(email, true);
        }

        currentUser = data.user;
        showAdminLayout();
        await loadDashboardData();
        showToast('success', 'Zalogowano', 'Witaj w panelu administracyjnym!');

    } catch (error) {
        console.error('Login error:', error);

        // Record failed attempt (server-side)
        if (window.AdminSecurity) {
            await AdminSecurity.recordLoginAttempt(email, false);
            lockoutStatus = await AdminSecurity.checkLockout(email);
            showLoginError(AdminSecurity.getSecureErrorMessage(lockoutStatus));
        } else {
            showLoginError('Nieprawidłowy email lub hasło');
        }
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Zaloguj się';
    }
}

async function handleLogout() {
    try {
        // Stop session timeout
        if (window.AdminSecurity && AdminSecurity.stopSessionTimeout) {
            AdminSecurity.stopSessionTimeout();
        }

        if (isSupabaseConfigured()) {
            await signOut();
        }
        currentUser = null;

        // Przekieruj na stronę logowania
        const isAdminSubdomain = window.location.hostname === 'admin.luczakosk.com';
        window.location.href = isAdminSubdomain ? '/' : '/admin/';
    } catch (error) {
        console.error('Logout error:', error);
        const isAdminSubdomain = window.location.hostname === 'admin.luczakosk.com';
        window.location.href = isAdminSubdomain ? '/' : '/admin/';
    }
}

function showLoginError(message) {
    loginAlert.textContent = message;
    loginAlert.classList.add('is-visible');
}

function updateUserInfo() {
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');

    if (currentUser) {
        const email = currentUser.email || 'Admin';
        nameEl.textContent = email;
        avatarEl.textContent = email.charAt(0).toUpperCase();
    } else {
        nameEl.textContent = 'Administrator';
        avatarEl.textContent = 'A';
    }
}

// ============================================
// NAVIGATION
// ============================================
function setupEventListeners() {
    // Login form
    loginForm?.addEventListener('submit', handleLogin);

    // Navigation links
    document.querySelectorAll('.admin-nav__link[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.view);
        });
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

    // Mobile menu toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', toggleMobileMenu);

    // New article button
    document.getElementById('new-article-btn')?.addEventListener('click', () => openEditor());

    // Editor form
    document.getElementById('editor-form')?.addEventListener('submit', handleSaveArticle);

    // Title to slug
    document.getElementById('article-title')?.addEventListener('input', (e) => {
        if (!editingArticleId) {
            const slug = generateSlug(e.target.value);
            document.getElementById('article-slug').textContent = slug || 'url-artykulu';
        }
    });

    // Image upload
    setupImageUpload();

    // Search in news list
    document.getElementById('news-search')?.addEventListener('input', debounce(filterNewsList, 300));

    // Status filter
    document.getElementById('news-status-filter')?.addEventListener('change', filterNewsList);

    // Category modal
    document.getElementById('add-category-btn')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('category-form')?.addEventListener('submit', handleSaveCategory);

    // Close modals on overlay mousedown (not click!) to prevent closing when selecting text
    // Using mousedown instead of click prevents the modal from closing when user selects text
    // inside the modal and releases mouse button while hovering over the overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

async function navigateTo(view) {
    // BEZPIECZEŃSTWO: Sprawdź czy użytkownik jest zalogowany
    if (!currentUser) {
        forceLogout('Wymagane logowanie.');
        return;
    }

    currentView = view;

    // Update nav active state
    document.querySelectorAll('.admin-nav__link').forEach(link => {
        link.classList.toggle('is-active', link.dataset.view === view);
    });

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'news-list': 'Aktualności',
        'categories': 'Kategorie',
        'registrations': 'Zapisy na kurs',
        'reviews': 'Opinie',
        'verification-codes': 'Kody weryfikacyjne',
        'prices': 'Cennik',
        'editor': 'Edytor artykułu'
    };
    document.getElementById('page-title').textContent = titles[view] || 'Panel Admina';

    // Update header action buttons - hide for views with their own buttons
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        // Hide header button for views with their own action buttons
        if (view === 'reviews' || view === 'registrations' || view === 'prices' || view === 'verification-codes') {
            headerActions.style.display = 'none';
        } else {
            headerActions.style.display = 'flex';
        }
    }

    // Show/hide views
    document.querySelectorAll('.admin-view').forEach(v => {
        v.style.display = v.id === `view-${view}` ? 'block' : 'none';
    });

    // Close mobile menu
    document.querySelector('.admin-sidebar')?.classList.remove('is-open');

    // Load view-specific data
    if (view === 'dashboard') loadDashboardData();
    if (view === 'news-list') loadNewsList();
    if (view === 'categories') loadCategoriesList();
    if (view === 'registrations' && typeof loadRegistrations === 'function') loadRegistrations('new');
    if (view === 'reviews' && typeof loadReviewsAdmin === 'function') loadReviewsAdmin();
    if (view === 'verification-codes' && typeof loadVerificationCodes === 'function') loadVerificationCodes();
    if (view === 'prices' && typeof loadPrices === 'function') loadPrices();
}

function toggleMobileMenu() {
    document.querySelector('.admin-sidebar')?.classList.toggle('is-open');
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboardData() {
    // BEZPIECZEŃSTWO: Sprawdź autoryzację
    if (!await requireAuth()) return;

    try {
        // Load categories first
        categoriesData = await fetchCategories();

        // Load news
        if (isSupabaseConfigured()) {
            const { data, count } = await fetchAllNews({ limit: 100 });
            newsData = data || [];
        } else {
            const { data } = getPlaceholderNews({ limit: 100 });
            newsData = data;
        }

        // Update stats
        updateDashboardStats();

        // Update recent news
        updateRecentNews();

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('error', 'Błąd', 'Nie udało się załadować danych');
    }
}

async function updateDashboardStats() {
    // Articles stats (existing)
    const total = newsData.length;
    document.getElementById('stat-total').textContent = total;

    // Load registrations data
    try {
        const regResult = await fetchRegistrations('all');
        if (regResult && regResult.data && regResult.data.length > 0) {
            const newRegs = regResult.data.filter(r => r.status === 'new').length;
            document.getElementById('stat-registrations').textContent = newRegs;
            renderDashboardRegistrations(regResult.data.slice(0, 5));
        } else {
            document.getElementById('stat-registrations').textContent = '0';
            renderDashboardRegistrations([]);
        }
    } catch (e) {
        console.error('Error loading registrations for dashboard:', e);
        document.getElementById('stat-registrations').textContent = '-';
        document.getElementById('dashboard-recent-registrations').innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Nie udało się załadować</div>';
    }

    // Load reviews data
    try {
        const reviewsResult = await fetchAllReviews();
        if (reviewsResult && reviewsResult.data) {
            const pendingReviews = reviewsResult.data.filter(r => r.is_verified && !r.is_published);
            document.getElementById('stat-pending-reviews').textContent = pendingReviews.length;
            renderDashboardPendingReviews(pendingReviews.slice(0, 5));
        } else {
            document.getElementById('stat-pending-reviews').textContent = '0';
            renderDashboardPendingReviews([]);
        }
    } catch (e) {
        console.error('Error loading reviews for dashboard:', e);
        document.getElementById('stat-pending-reviews').textContent = '-';
        document.getElementById('dashboard-pending-reviews').innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Nie udało się załadować</div>';
    }

    // Load verification codes data
    try {
        const codesResult = await fetchAllVerificationCodes();
        if (codesResult && codesResult.data) {
            const activeCodes = codesResult.data.filter(c => c.status === 'active').length;
            const usedCodes = codesResult.data.filter(c => c.status === 'used').length;
            document.getElementById('stat-active-codes').textContent = activeCodes;
            document.getElementById('dash-codes-active').textContent = activeCodes;
            document.getElementById('dash-codes-used').textContent = usedCodes;
        } else {
            document.getElementById('stat-active-codes').textContent = '0';
            document.getElementById('dash-codes-active').textContent = '0';
            document.getElementById('dash-codes-used').textContent = '0';
        }
    } catch (e) {
        console.error('Error loading verification codes for dashboard:', e);
        document.getElementById('stat-active-codes').textContent = '-';
        document.getElementById('dash-codes-active').textContent = '-';
        document.getElementById('dash-codes-used').textContent = '-';
    }
}

// Render recent registrations for dashboard
function renderDashboardRegistrations(registrations) {
    const container = document.getElementById('dashboard-recent-registrations');
    if (!container) return;

    if (registrations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Brak nowych zapisów</div>';
        return;
    }

    container.innerHTML = registrations.map(reg => {
        const date = new Date(reg.created_at).toLocaleDateString('pl-PL');
        const statusClass = reg.status === 'new' ? 'status-badge--warning' :
            reg.status === 'contacted' ? 'status-badge--info' : 'status-badge--success';
        const statusText = reg.status === 'new' ? 'Nowy' :
            reg.status === 'contacted' ? 'Skontaktowano' : 'Zakończony';

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-weight: 500; color: #1e293b;">${reg.first_name} ${reg.last_name}</div>
                    <div style="font-size: 13px; color: #64748b;">${reg.category || 'B'} • ${date}</div>
                </div>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// Render pending reviews for dashboard
function renderDashboardPendingReviews(reviews) {
    const container = document.getElementById('dashboard-pending-reviews');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Brak opinii do akceptacji ✓</div>';
        return;
    }

    container.innerHTML = reviews.map(review => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const content = review.content.length > 60 ? review.content.substring(0, 60) + '...' : review.content;

        return `
            <div style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 500; color: #1e293b;">${review.author_name}</span>
                    <span style="color: #f59e0b; font-size: 14px;">${stars}</span>
                </div>
                <div style="font-size: 13px; color: #64748b; line-height: 1.4;">${content}</div>
                <div style="margin-top: 8px;">
                    <button class="btn btn--sm btn--success" onclick="approveReview('${review.id}')" style="padding: 4px 10px; font-size: 12px;">
                        ✓ Akceptuj
                    </button>
                    <button class="btn btn--sm btn--secondary" onclick="editReview('${review.id}')" style="padding: 4px 10px; font-size: 12px; margin-left: 4px;">
                        Sprawdź
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateRecentNews() {
    const container = document.getElementById('recent-news');
    if (!container) return;

    const recent = newsData.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                </div>
                <p class="empty-state__title">Brak artykułów</p>
                <p class="empty-state__text">Dodaj pierwszy artykuł, aby go tutaj zobaczyć.</p>
                <button class="btn btn--primary" onclick="openEditor()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Nowy artykuł
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Tytuł</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
                ${recent.map(item => renderNewsRow(item)).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// NEWS LIST
// ============================================
async function loadNewsList() {
    // BEZPIECZEŃSTWO: Sprawdź autoryzację
    if (!await requireAuth()) return;

    const container = document.getElementById('news-table-body');
    if (!container) return;

    container.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="margin: 0 auto;"></div>
            </td>
        </tr>
    `;

    try {
        if (isSupabaseConfigured()) {
            const { data } = await fetchAllNews({ limit: 100 });
            newsData = data || [];
        } else {
            const { data } = getPlaceholderNews({ limit: 100 });
            newsData = data;
        }

        renderNewsList();

    } catch (error) {
        console.error('Error loading news:', error);
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--admin-danger);">
                    Błąd ładowania danych
                </td>
            </tr>
        `;
    }
}

function renderNewsList() {
    const container = document.getElementById('news-table-body');
    if (!container) return;

    // Apply filters
    const searchTerm = document.getElementById('news-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('news-status-filter')?.value || 'all';

    let filtered = newsData;

    if (searchTerm) {
        filtered = filtered.filter(item =>
            item.title.toLowerCase().includes(searchTerm) ||
            item.excerpt?.toLowerCase().includes(searchTerm)
        );
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <div class="empty-state__icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <path d="M21 21l-4.35-4.35"/>
                            </svg>
                        </div>
                        <p class="empty-state__title">Brak wyników</p>
                        <p class="empty-state__text">Zmień kryteria wyszukiwania lub dodaj nowy artykuł.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => renderNewsRow(item)).join('');
}

function renderNewsRow(item) {
    const category = item.category || { name: 'Brak', color: '#94a3b8' };
    const date = formatDatePL(item.published_at || item.created_at);

    const statusLabels = {
        'published': 'Opublikowany',
        'draft': 'Szkic',
        'scheduled': 'Zaplanowany'
    };

    return `
        <tr>
            <td data-label="Tytuł">
                <div class="admin-table__title">${item.title}</div>
            </td>
            <td data-label="Kategoria">
                <span class="category-badge" style="background-color: ${category.color}">${category.name}</span>
            </td>
            <td data-label="Status">
                <span class="status-badge status-badge--${item.status}">
                    <span class="status-badge__dot"></span>
                    ${statusLabels[item.status] || item.status}
                </span>
            </td>
            <td data-label="Data">
                <span class="admin-table__date">${date}</span>
            </td>
            <td data-label="Akcje">
                <div class="action-btns">
                    <button class="action-btn" onclick="editArticle('${item.id}')" title="Edytuj">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn" onclick="previewArticle('${item.slug || item.id}')" title="Podgląd">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="action-btn action-btn--danger" onclick="confirmDeleteArticle('${item.id}')" title="Usuń">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function filterNewsList() {
    renderNewsList();
}

// ============================================
// EDITOR
// ============================================
function openEditor(articleId = null) {
    editingArticleId = articleId;
    uploadedImageUrl = null;

    // Reset form
    document.getElementById('article-title').value = '';
    document.getElementById('article-slug').textContent = 'url-artykulu';
    document.getElementById('article-excerpt').value = '';
    document.getElementById('article-category').value = '';
    document.getElementById('article-status').value = 'draft';
    document.getElementById('article-date').value = formatDateForInput(new Date());

    // Reset image
    const imageUpload = document.querySelector('.image-upload');
    const imagePreview = document.getElementById('image-preview');
    imageUpload?.classList.remove('has-image');
    if (imagePreview) imagePreview.src = '';

    // Initialize Quill if not done
    if (!quillEditor) {
        initQuillEditor();
    } else {
        quillEditor.setContents([]);
    }

    // Update categories dropdown
    updateCategoryDropdown();

    // Load article data if editing
    if (articleId) {
        loadArticleForEditing(articleId);
    } else {
        // Check for saved draft when creating new article
        setTimeout(() => checkForSavedDraft(), 100);
    }

    // Navigate to editor
    navigateTo('editor');

    // Update header
    document.getElementById('page-title').textContent = articleId ? 'Edytuj artykuł' : 'Nowy artykuł';
}

function initQuillEditor() {
    quillEditor = new Quill('#quill-editor', {
        theme: 'snow',
        placeholder: 'Napisz treść artykułu...',
        modules: {
            toolbar: [
                [{ 'header': [2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['blockquote', 'link', 'image'],
                ['clean']
            ]
        }
    });

    // Auto-save draft every 30 seconds
    setInterval(() => {
        if (currentView === 'editor') {
            autoSaveDraft();
        }
    }, 30000);

    // Also save on text change (debounced)
    let saveTimeout;
    quillEditor.on('text-change', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (currentView === 'editor') {
                autoSaveDraft();
            }
        }, 5000); // Save 5 seconds after user stops typing
    });
}

// Auto-save draft to localStorage
function autoSaveDraft() {
    const title = document.getElementById('article-title')?.value || '';
    const content = quillEditor ? quillEditor.root.innerHTML : '';
    const excerpt = document.getElementById('article-excerpt')?.value || '';

    if (!title && !content) return; // Don't save empty drafts

    const draftData = {
        id: editingArticleId,
        title,
        content,
        excerpt,
        savedAt: new Date().toISOString()
    };

    localStorage.setItem('osk_article_draft', JSON.stringify(draftData));

    // Show subtle notification
    const indicator = document.getElementById('autosave-indicator');
    if (indicator) {
        indicator.textContent = 'Zapisano automatycznie';
        indicator.classList.add('is-visible');
        setTimeout(() => indicator.classList.remove('is-visible'), 2000);
    }
}

// Check for saved draft on editor open
function checkForSavedDraft() {
    const saved = localStorage.getItem('osk_article_draft');
    if (!saved) return;

    try {
        const draft = JSON.parse(saved);
        const savedTime = new Date(draft.savedAt);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

        // Only offer to restore if less than 24 hours old and not currently editing
        if (hoursDiff < 24 && !editingArticleId && draft.title) {
            const restore = confirm(`Znaleziono niezapisany szkic "${draft.title}" z ${savedTime.toLocaleString('pl-PL')}. Czy chcesz go przywrócić?`);
            if (restore) {
                document.getElementById('article-title').value = draft.title || '';
                document.getElementById('article-excerpt').value = draft.excerpt || '';
                if (quillEditor && draft.content) {
                    quillEditor.root.innerHTML = draft.content;
                }
            } else {
                localStorage.removeItem('osk_article_draft');
            }
        }
    } catch (e) {
        console.warn('Could not restore draft:', e);
    }
}

// Clear draft after successful save
function clearSavedDraft() {
    localStorage.removeItem('osk_article_draft');
}

function updateCategoryDropdown() {
    const dropdown = document.getElementById('article-category');
    if (!dropdown) return;

    dropdown.innerHTML = `
        <option value="">Wybierz kategorię</option>
        ${categoriesData.map(cat => `
            <option value="${cat.id}">${cat.name}</option>
        `).join('')}
    `;
}

async function loadArticleForEditing(articleId) {
    try {
        const article = newsData.find(n => n.id === articleId);
        if (!article) {
            showToast('error', 'Błąd', 'Nie znaleziono artykułu');
            return;
        }

        document.getElementById('article-title').value = article.title || '';
        document.getElementById('article-slug').textContent = article.slug || '';
        document.getElementById('article-excerpt').value = article.excerpt || '';
        document.getElementById('article-category').value = article.category_id || article.category?.id || '';
        document.getElementById('article-status').value = article.status || 'draft';
        document.getElementById('article-date').value = formatDateForInput(article.published_at || article.created_at);

        // Set image
        if (article.image_url) {
            uploadedImageUrl = article.image_url;
            const imagePreview = document.getElementById('image-preview');
            const imageUpload = document.querySelector('.image-upload');
            if (imagePreview) imagePreview.src = article.image_url;
            imageUpload?.classList.add('has-image');
        }

        // Set content
        if (quillEditor && article.content) {
            quillEditor.root.innerHTML = article.content;
        }

    } catch (error) {
        console.error('Error loading article:', error);
        showToast('error', 'Błąd', 'Nie udało się załadować artykułu');
    }
}

async function handleSaveArticle(e) {
    e.preventDefault();

    // BEZPIECZEŃSTWO: Sprawdź autoryzację
    if (!await requireAuth()) return;

    const title = document.getElementById('article-title').value.trim();
    const excerpt = document.getElementById('article-excerpt').value.trim();
    const categoryId = document.getElementById('article-category').value || null;
    const status = document.getElementById('article-status').value;
    const publishDate = document.getElementById('article-date').value;
    const content = quillEditor ? quillEditor.root.innerHTML : '';
    const slug = document.getElementById('article-slug').textContent;

    if (!title) {
        showToast('error', 'Błąd', 'Tytuł jest wymagany');
        return;
    }

    // Generate unique slug for new articles
    let finalSlug = slug;
    if (slug === 'url-artykulu' || !slug) {
        finalSlug = generateSlug(title) + '-' + Date.now().toString(36);
    }

    const articleData = {
        title,
        slug: finalSlug,
        excerpt,
        content,
        category_id: categoryId,
        status,
        published_at: publishDate ? new Date(publishDate).toISOString() : null,
        image_url: uploadedImageUrl
    };

    try {
        if (!isSupabaseConfigured()) {
            // Development mode - just show success
            clearSavedDraft();
            showToast('success', 'Zapisano', 'Artykuł został zapisany (tryb deweloperski)');
            navigateTo('news-list');
            return;
        }

        if (editingArticleId) {
            await updateArticle(editingArticleId, articleData);
            showToast('success', 'Zaktualizowano', 'Artykuł został zaktualizowany');
        } else {
            await createArticle(articleData);
            showToast('success', 'Utworzono', 'Artykuł został utworzony');
        }

        // Clear auto-saved draft on successful save
        clearSavedDraft();

        // Reload data and go to list
        await loadNewsList();
        navigateTo('news-list');

    } catch (error) {
        console.error('Error saving article:', error);
        showToast('error', 'Błąd', error.message || 'Nie udało się zapisać artykułu');
    }
}

function editArticle(id) {
    openEditor(id);
}

function previewArticle(slug) {
    window.open(`artykul.html?slug=${slug}`, '_blank');
}

// Preview current article being edited (even if not saved)
function previewCurrentArticle() {
    if (editingArticleId) {
        // Editing existing article - open its preview
        const article = newsData.find(n => n.id === editingArticleId);
        if (article && article.slug) {
            window.open(`artykul.html?slug=${article.slug}`, '_blank');
        } else {
            showToast('warning', 'Podgląd', 'Zapisz artykuł, aby zobaczyć podgląd');
        }
    } else {
        // New article - need to save first as draft
        showToast('info', 'Podgląd', 'Zapisz artykuł jako szkic, aby zobaczyć podgląd');
    }
}

function confirmDeleteArticle(id) {
    // Sprawdź uprawnienia
    if (!hasFullAccess()) {
        showToast('error', 'Brak uprawnień', 'Usuwanie artykułów jest zablokowane. Skontaktuj się z administratorem.');
        return;
    }

    const article = newsData.find(n => n.id === id);
    if (!article) return;

    if (confirm(`Czy na pewno chcesz usunąć artykuł "${article.title}"?`)) {
        deleteArticleById(id);
    }
}

async function deleteArticleById(id) {
    // Sprawdź uprawnienia
    if (!hasFullAccess()) {
        showToast('error', 'Brak uprawnień', 'Usuwanie artykułów jest zablokowane.');
        return;
    }

    try {
        if (!isSupabaseConfigured()) {
            showToast('success', 'Usunięto', 'Artykuł został usunięty (tryb deweloperski)');
            return;
        }

        await deleteArticle(id);
        showToast('success', 'Usunięto', 'Artykuł został usunięty');

        // Reload data
        await loadNewsList();
        await loadDashboardData();

    } catch (error) {
        console.error('Error deleting article:', error);
        showToast('error', 'Błąd', 'Nie udało się usunąć artykułu');
    }
}

// ============================================
// IMAGE UPLOAD
// ============================================
function setupImageUpload() {
    const uploadArea = document.querySelector('.image-upload');
    const fileInput = document.getElementById('image-input');

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });
}

async function handleImageUpload(file) {
    const uploadArea = document.querySelector('.image-upload');
    const preview = document.getElementById('image-preview');

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        uploadArea.classList.add('has-image');
    };
    reader.readAsDataURL(file);

    // Upload to Supabase if configured
    if (isSupabaseConfigured()) {
        try {
            showToast('info', 'Przesyłanie', 'Trwa upload obrazu...');
            uploadedImageUrl = await uploadImage(file);
            showToast('success', 'Gotowe', 'Obraz został przesłany');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('error', 'Błąd', 'Nie udało się przesłać obrazu');
        }
    } else {
        // Development mode - use data URL
        uploadedImageUrl = preview.src;
    }
}

function removeImage() {
    const uploadArea = document.querySelector('.image-upload');
    const preview = document.getElementById('image-preview');
    const input = document.getElementById('image-input');

    uploadArea?.classList.remove('has-image');
    if (preview) preview.src = '';
    if (input) input.value = '';
    uploadedImageUrl = null;
}

// ============================================
// CATEGORIES
// ============================================
async function loadCategoriesList() {
    // BEZPIECZEŃSTWO: Sprawdź autoryzację
    if (!await requireAuth()) return;

    const container = document.getElementById('categories-list');
    if (!container) return;

    try {
        categoriesData = await fetchCategories();
        renderCategoriesList();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoriesList() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    if (categoriesData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                </div>
                <p class="empty-state__title">Brak kategorii</p>
                <p class="empty-state__text">Dodaj pierwszą kategorię dla artykułów.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="category-list">
            ${categoriesData.map(cat => `
                <div class="category-item">
                    <span class="category-item__color" style="background-color: ${cat.color}"></span>
                    <span class="category-item__name">${cat.name}</span>
                    <span class="category-item__count">${countArticlesInCategory(cat.id)} artykułów</span>
                    <div class="category-item__actions">
                        <button class="action-btn" onclick="openCategoryModal('${cat.id}')" title="Edytuj">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="action-btn action-btn--danger" onclick="confirmDeleteCategory('${cat.id}')" title="Usuń">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function countArticlesInCategory(categoryId) {
    return newsData.filter(n => n.category_id === categoryId || n.category?.id === categoryId).length;
}

let editingCategoryId = null;

function openCategoryModal(categoryId = null) {
    editingCategoryId = categoryId;

    const modal = document.getElementById('category-modal');
    const title = document.getElementById('category-modal-title');
    const nameInput = document.getElementById('category-name');
    const colorInput = document.getElementById('category-color');

    if (categoryId) {
        const category = categoriesData.find(c => c.id === categoryId);
        if (category) {
            title.textContent = 'Edytuj kategorię';
            nameInput.value = category.name;
            colorInput.value = category.color;
        }
    } else {
        title.textContent = 'Nowa kategoria';
        nameInput.value = '';
        colorInput.value = '#1a56db';
    }

    modal?.classList.add('is-visible');
}

function closeCategoryModal() {
    document.getElementById('category-modal')?.classList.remove('is-visible');
    editingCategoryId = null;
}

async function handleSaveCategory(e) {
    e.preventDefault();

    // BEZPIECZEŃSTWO: Sprawdź autoryzację
    if (!await requireAuth()) return;

    const name = document.getElementById('category-name').value.trim();
    const color = document.getElementById('category-color').value;

    if (!name) {
        showToast('error', 'Błąd', 'Nazwa kategorii jest wymagana');
        return;
    }

    const categoryData = {
        name,
        slug: generateSlug(name),
        color
    };

    try {
        if (!isSupabaseConfigured()) {
            showToast('success', 'Zapisano', 'Kategoria została zapisana (tryb deweloperski)');
            closeCategoryModal();
            return;
        }

        if (editingCategoryId) {
            await updateCategory(editingCategoryId, categoryData);
            showToast('success', 'Zaktualizowano', 'Kategoria została zaktualizowana');
        } else {
            await createCategory(categoryData);
            showToast('success', 'Utworzono', 'Kategoria została utworzona');
        }

        closeCategoryModal();
        await loadCategoriesList();
        updateCategoryDropdown();

    } catch (error) {
        console.error('Error saving category:', error);
        showToast('error', 'Błąd', 'Nie udało się zapisać kategorii');
    }
}

function confirmDeleteCategory(id) {
    // Sprawdź uprawnienia
    if (!hasFullAccess()) {
        showToast('error', 'Brak uprawnień', 'Usuwanie kategorii jest zablokowane. Skontaktuj się z administratorem.');
        return;
    }

    const category = categoriesData.find(c => c.id === id);
    if (!category) return;

    const count = countArticlesInCategory(id);
    if (count > 0) {
        showToast('warning', 'Uwaga', `Ta kategoria zawiera ${count} artykułów. Najpierw przenieś je do innej kategorii.`);
        return;
    }

    if (confirm(`Czy na pewno chcesz usunąć kategorię "${category.name}"?`)) {
        deleteCategoryById(id);
    }
}

async function deleteCategoryById(id) {
    // Sprawdź uprawnienia
    if (!hasFullAccess()) {
        showToast('error', 'Brak uprawnień', 'Usuwanie kategorii jest zablokowane.');
        return;
    }

    try {
        if (!isSupabaseConfigured()) {
            showToast('success', 'Usunięto', 'Kategoria została usunięta (tryb deweloperski)');
            return;
        }

        await deleteCategory(id);
        showToast('success', 'Usunięto', 'Kategoria została usunięta');
        await loadCategoriesList();

    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('error', 'Błąd', 'Nie udało się usunąć kategorii');
    }
}

// ============================================
// MODALS
// ============================================
function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('is-visible');
    });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(type, title, message) {
    const container = document.getElementById('toast-container') || createToastContainer();

    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast__icon toast__icon--${type}">${icons[type]}</div>
        <div class="toast__content">
            <div class="toast__title">${title}</div>
            ${message ? `<div class="toast__message">${message}</div>` : ''}
        </div>
        <button class="toast__close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 5s
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ============================================
// UTILITIES
// ============================================
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

// Placeholder function if not in supabase.js
if (typeof getPlaceholderNews === 'undefined') {
    function getPlaceholderNews(options = {}) {
        return {
            data: [
                {
                    id: '1',
                    title: 'Nowy termin kursu od stycznia 2025',
                    slug: 'nowy-termin-kursu-styczen-2025',
                    excerpt: 'Ruszamy z nowym kursem prawa jazdy kategorii B.',
                    status: 'published',
                    published_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    category: { id: '1', name: 'Kursy', slug: 'kursy', color: '#22c55e' }
                }
            ],
            count: 1
        };
    }
}
