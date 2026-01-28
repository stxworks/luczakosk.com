/**
 * OSK Łuczak - Admin Security Module
 * Server-side rate limiting, login lockout, and role verification
 * Uses Supabase RPC functions for secure lockout management
 */

// ============================================
// CONFIGURATION
// ============================================
const SECURITY_CONFIG = {
    // Authorized admin emails
    ALLOWED_ADMINS: [
        'wojtek.osk@wp.pl',
        'stachowiakjakub000@gmail.com',
        'temp@stxworks.pl'  // Konto tymczasowe - do usunięcia po płatności
    ],

    // Fallback rate limiting (used only if server is unavailable)
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes

    // Storage keys (fallback only)
    STORAGE_KEY_ATTEMPTS: 'osk_login_attempts',
    STORAGE_KEY_LOCKOUT: 'osk_login_lockout'
};

// ============================================
// SERVER-SIDE RATE LIMITING (PRIMARY)
// ============================================

/**
 * Check if user is currently locked out (server-side)
 * @param {string} email - User email to check
 * @returns {Promise<object>} { locked: boolean, attempts: number, remaining: number, message?: string }
 */
async function checkLockoutServer(email) {
    try {
        const client = getSupabase();
        if (!client) {
            // Fallback to localStorage if Supabase not available
            return checkLockoutLocal();
        }

        const { data, error } = await client.rpc('check_login_lockout', {
            user_email: email
        });

        if (error) {
            console.warn('Lockout check error, using fallback:', error);
            return checkLockoutLocal();
        }

        return {
            locked: data?.locked || false,
            attempts: data?.attempts || 0,
            remaining: data?.remaining || SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
            message: data?.message || null
        };
    } catch (err) {
        console.warn('Lockout check failed, using fallback:', err);
        return checkLockoutLocal();
    }
}

/**
 * Get user's public IP address using external API
 * @returns {Promise<string|null>}
 */
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            method: 'GET',
            cache: 'no-cache'
        });
        if (response.ok) {
            const data = await response.json();
            return data.ip || null;
        }
    } catch (err) {
        console.warn('Could not fetch IP address:', err);
    }
    return null;
}

/**
 * Record a login attempt (server-side)
 * @param {string} email - User email
 * @param {boolean} success - Whether login was successful
 * @returns {Promise<void>}
 */
async function recordLoginAttemptServer(email, success) {
    try {
        const client = getSupabase();
        if (!client) {
            // Fallback to localStorage
            if (!success) {
                recordFailedAttemptLocal();
            } else {
                clearLockoutLocal();
            }
            return;
        }

        // Try to get user's IP address
        const clientIP = await getUserIP();

        await client.rpc('record_login_attempt', {
            user_email: email,
            was_successful: success,
            client_ip: clientIP,
            client_user_agent: navigator.userAgent
        });

        // Clear local fallback on success
        if (success) {
            clearLockoutLocal();
        }
    } catch (err) {
        console.warn('Failed to record login attempt:', err);
        // Fallback to local
        if (!success) {
            recordFailedAttemptLocal();
        } else {
            clearLockoutLocal();
        }
    }
}

// ============================================
// LOCAL FALLBACK RATE LIMITING
// ============================================

/**
 * Check lockout using localStorage (fallback)
 * @returns {object} { locked: boolean, remainingMs: number }
 */
function checkLockoutLocal() {
    const lockoutUntil = localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY_LOCKOUT);

    if (!lockoutUntil) {
        const attempts = parseInt(localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY_ATTEMPTS) || '0', 10);
        return {
            locked: false,
            remainingMs: 0,
            attempts: attempts,
            remaining: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts)
        };
    }

    const lockoutTime = parseInt(lockoutUntil, 10);
    const now = Date.now();

    if (now >= lockoutTime) {
        // Lockout expired, clear it
        clearLockoutLocal();
        return { locked: false, remainingMs: 0, attempts: 0, remaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
    }

    return {
        locked: true,
        remainingMs: lockoutTime - now,
        message: getLockoutMessageLocal()
    };
}

/**
 * Get remaining lockout time in human-readable format (local)
 */
function getLockoutMessageLocal() {
    const { locked, remainingMs } = checkLockoutLocal();

    if (!locked) return null;

    const minutes = Math.ceil(remainingMs / 60000);
    return `Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za ${minutes} min.`;
}

/**
 * Record a failed login attempt (local fallback)
 * @returns {number} Number of attempts made
 */
function recordFailedAttemptLocal() {
    let attempts = parseInt(localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY_ATTEMPTS) || '0', 10);
    attempts++;

    localStorage.setItem(SECURITY_CONFIG.STORAGE_KEY_ATTEMPTS, attempts.toString());

    // Check if we should trigger lockout
    if (attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        const lockoutUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MS;
        localStorage.setItem(SECURITY_CONFIG.STORAGE_KEY_LOCKOUT, lockoutUntil.toString());
    }

    return attempts;
}

/**
 * Clear all lockout data (local fallback)
 */
function clearLockoutLocal() {
    localStorage.removeItem(SECURITY_CONFIG.STORAGE_KEY_ATTEMPTS);
    localStorage.removeItem(SECURITY_CONFIG.STORAGE_KEY_LOCKOUT);
}

// ============================================
// UNIFIED API (uses server with local fallback)
// ============================================

/**
 * Check if user is currently locked out
 * @param {string} email - User email (optional for local fallback)
 * @returns {Promise<object>} { locked: boolean, attempts: number, remaining: number, message?: string }
 */
async function checkLockout(email = null) {
    if (email && isSupabaseConfigured()) {
        return await checkLockoutServer(email);
    }
    return checkLockoutLocal();
}

/**
 * Record a login attempt
 * @param {string} email - User email
 * @param {boolean} success - Whether login was successful
 */
async function recordLoginAttempt(email, success = false) {
    if (isSupabaseConfigured()) {
        await recordLoginAttemptServer(email, success);
    } else if (!success) {
        recordFailedAttemptLocal();
    } else {
        clearLockoutLocal();
    }
}

/**
 * Get remaining attempts before lockout (legacy support)
 */
function getRemainingAttempts() {
    const attempts = parseInt(localStorage.getItem(SECURITY_CONFIG.STORAGE_KEY_ATTEMPTS) || '0', 10);
    return Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts);
}

/**
 * Clear lockout (legacy support)
 */
function clearLockout() {
    clearLockoutLocal();
}

/**
 * Record failed attempt (legacy support - sync version)
 */
function recordFailedAttempt() {
    return recordFailedAttemptLocal();
}

/**
 * Get lockout message (legacy support)
 */
function getLockoutMessage() {
    return getLockoutMessageLocal();
}

// ============================================
// ADMIN VERIFICATION
// ============================================

/**
 * Check if email is an authorized admin
 * @param {string} email 
 * @returns {boolean}
 */
function isAuthorizedAdmin(email) {
    if (!email) return false;
    return SECURITY_CONFIG.ALLOWED_ADMINS.includes(email.toLowerCase().trim());
}

/**
 * Verify user has admin access
 * @param {object} user - Supabase user object
 * @returns {boolean}
 */
function verifyAdminAccess(user) {
    if (!user || !user.email) return false;
    return isAuthorizedAdmin(user.email);
}

// ============================================
// SECURITY MESSAGES
// ============================================

/**
 * Get generic error message (doesn't reveal specific details)
 * @param {object} lockoutStatus - Status from checkLockout
 */
function getSecureErrorMessage(lockoutStatus = null) {
    if (lockoutStatus?.locked) {
        return lockoutStatus.message || 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za 15 minut.';
    }

    if (lockoutStatus?.remaining !== undefined && lockoutStatus.remaining <= 2) {
        return `Nieprawidłowe dane logowania. Pozostało prób: ${lockoutStatus.remaining}`;
    }

    return 'Nieprawidłowy email lub hasło';
}

// ============================================
// SESSION TIMEOUT
// ============================================
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let sessionTimeoutId = null;
let sessionWarningId = null;

/**
 * Start session timeout - logs out after inactivity
 * @param {function} onTimeout - Callback when session expires
 */
function startSessionTimeout(onTimeout) {
    // Clear any existing timeouts
    stopSessionTimeout();

    // Reset timeout on user activity
    const resetTimeout = () => {
        if (sessionTimeoutId) {
            clearTimeout(sessionTimeoutId);
            clearTimeout(sessionWarningId);
        }

        // Warning at 25 minutes
        sessionWarningId = setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast('warning', 'Sesja wygasa', 'Zostaniesz wylogowany za 5 minut z powodu nieaktywności');
            }
        }, SESSION_TIMEOUT_MS - (5 * 60 * 1000));

        // Logout at 30 minutes
        sessionTimeoutId = setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast('info', 'Sesja wygasła', 'Zostałeś wylogowany z powodu nieaktywności');
            }
            if (onTimeout) onTimeout();
        }, SESSION_TIMEOUT_MS);
    };

    // Listen for user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetTimeout, { passive: true });
    });

    // Start initial timeout
    resetTimeout();

    // Store cleanup function
    window._sessionTimeoutCleanup = () => {
        activityEvents.forEach(event => {
            document.removeEventListener(event, resetTimeout);
        });
    };
}

/**
 * Stop session timeout (on logout)
 */
function stopSessionTimeout() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (sessionWarningId) clearTimeout(sessionWarningId);
    if (window._sessionTimeoutCleanup) {
        window._sessionTimeoutCleanup();
        delete window._sessionTimeoutCleanup;
    }
}

// ============================================
// EXPORT
// ============================================
window.AdminSecurity = {
    // Server-side lockout (primary)
    checkLockout,
    recordLoginAttempt,

    // Legacy support (sync functions)
    checkLockoutLocal,
    getLockoutMessage,
    recordFailedAttempt,
    clearLockout,
    getRemainingAttempts,

    // Admin verification
    isAuthorizedAdmin,
    verifyAdminAccess,

    // Messages
    getSecureErrorMessage,

    // Session management
    startSessionTimeout,
    stopSessionTimeout,

    // Config
    ALLOWED_ADMINS: SECURITY_CONFIG.ALLOWED_ADMINS
};
