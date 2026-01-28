/**
 * OSK Łuczak - Supabase Configuration
 * 
 * This file contains the Supabase client configuration and helper functions.
 * Replace the placeholder values with your actual Supabase project credentials.
 */

// ============================================
// CONFIGURATION - Replace with your credentials
// ============================================
const SUPABASE_CONFIG = {
    url: 'https://hnspofvhvlmnzhtihyxi.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhuc3BvZnZodmxtbnpodGloeXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MjQ4MzIsImV4cCI6MjA4MjIwMDgzMn0.XTDtURXY2i7Lw7ynyXOShWSb2_m1hsEzJGIjv1ePmLo'
};

// ============================================
// SUPABASE CLIENT
// ============================================

// Load Supabase from CDN (loaded in HTML)
let supabaseClient = null;

/**
 * Initialize Supabase client
 * Call this after the Supabase CDN script loads
 */
function initSupabase() {
    if (typeof supabase !== 'undefined' && SUPABASE_CONFIG.url !== 'https://your-project.supabase.co') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        return true;
    }
    return false;
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured() {
    return SUPABASE_CONFIG.url !== 'https://your-project.supabase.co';
}

/**
 * Get Supabase client
 */
function getSupabase() {
    if (!supabaseClient && isSupabaseConfigured()) {
        initSupabase();
    }
    return supabaseClient;
}

// ============================================
// AUTH HELPERS
// ============================================

/**
 * Sign in with email and password
 */
async function signIn(email, password) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
}

/**
 * Sign out
 */
async function signOut() {
    const client = getSupabase();
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) throw error;
}

/**
 * Get current user
 */
async function getCurrentUser() {
    const client = getSupabase();
    if (!client) return null;

    const { data: { user } } = await client.auth.getUser();
    return user;
}

/**
 * Check if user is authenticated
 */
async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Listen for auth state changes
 */
function onAuthStateChange(callback) {
    const client = getSupabase();
    if (!client) return null;

    return client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

// ============================================
// NEWS HELPERS
// ============================================

/**
 * Fetch published news with optional filters
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of articles to fetch
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.category - Category slug to filter by
 * @param {string} options.search - Search query
 */
async function fetchPublishedNews(options = {}) {
    const client = getSupabase();

    // Return placeholder data if not configured
    if (!client) {
        console.log('Supabase client not available, using placeholder');
        return getPlaceholderNews(options);
    }

    const { limit = 10, offset = 0, category = null, search = null } = options;

    try {
        // If filtering by category, first get the category ID from slug
        let categoryId = null;
        if (category) {
            const { data: categoryData } = await client
                .from('categories')
                .select('id')
                .eq('slug', category)
                .single();

            if (categoryData) {
                categoryId = categoryData.id;
            } else {
                // Category not found, return empty
                return { data: [], count: 0 };
            }
        }

        let query = client
            .from('news')
            .select(`
                *,
                category:categories(*)
            `, { count: 'exact' })
            .eq('status', 'published')
            .lte('published_at', new Date().toISOString())
            .order('published_at', { ascending: false });

        // Filter by category_id (foreign key)
        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            console.warn('Supabase query error:', error);
            return { data: [], count: 0 };
        }

        // Return empty array if no data
        if (!data || data.length === 0) {
            console.log('No published news in DB');
            return { data: [], count: 0 };
        }

        return { data, count: count || data.length };
    } catch (err) {
        console.warn('Error fetching news:', err);
        return getPlaceholderNews(options);
    }
}

/**
 * Fetch single article by slug
 */
async function fetchArticleBySlug(slug) {
    const client = getSupabase();

    if (!client) {
        return getPlaceholderArticle(slug);
    }

    // Check if slug looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    try {
        let query = client
            .from('news')
            .select(`
                *,
                category:categories(*)
            `)
            .eq('status', 'published')
            .lte('published_at', new Date().toISOString());

        // Only search by id if it looks like a UUID, otherwise just by slug
        if (isUUID) {
            query = query.or(`slug.eq.${slug},id.eq.${slug}`);
        } else {
            query = query.eq('slug', slug);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            console.warn('Supabase error, using placeholder:', error);
            return getPlaceholderArticle(slug);
        }

        // If no article found from DB, return placeholder
        if (!data) {
            return getPlaceholderArticle(slug);
        }

        return data;
    } catch (err) {
        console.warn('Error fetching article, using placeholder:', err);
        return getPlaceholderArticle(slug);
    }
}

/**
 * Fetch all news (for admin)
 */
async function fetchAllNews(options = {}) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { limit = 50, offset = 0, status = null, search = null } = options;

    let query = client
        .from('news')
        .select(`
            *,
            category:categories(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    if (search) {
        query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
}

/**
 * Create new article
 */
async function createArticle(articleData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('news')
        .insert([articleData])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update article
 */
async function updateArticle(id, articleData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('news')
        .update(articleData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete article
 */
async function deleteArticle(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('news')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// CATEGORIES HELPERS
// ============================================

/**
 * Fetch all categories
 */
async function fetchCategories() {
    const client = getSupabase();

    if (!client) {
        return getPlaceholderCategories();
    }

    const { data, error } = await client
        .from('categories')
        .select('*')
        .order('name');

    if (error) throw error;
    return data;
}

/**
 * Create category
 */
async function createCategory(categoryData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('categories')
        .insert([categoryData])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update category
 */
async function updateCategory(id, categoryData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete category
 */
async function deleteCategory(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// COURSE REGISTRATIONS HELPERS
// ============================================

/**
 * Save new course registration
 * @param {Object} registrationData - Registration form data
 */
async function saveRegistration(registrationData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('course_registrations')
        .insert([{
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            email: registrationData.email,
            phone: registrationData.phone,
            pesel: registrationData.pesel || null,
            pkk: registrationData.pkk || null,
            course: registrationData.course,
            city: registrationData.city,
            source: registrationData.source || null,
            message: registrationData.message || null,
            status: 'new'
        }]);

    if (error) throw error;
}

/**
 * Fetch registrations by status
 * @param {string} status - 'new', 'exported', or 'all'
 */
async function fetchRegistrations(status = 'new') {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    let query = client
        .from('course_registrations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (status !== 'all') {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
}

/**
 * Update registration status
 * @param {Array<string>} ids - Array of registration IDs
 * @param {string} newStatus - New status value
 */
async function updateRegistrationStatus(ids, newStatus) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('course_registrations')
        .update({
            status: newStatus,
            exported_at: newStatus === 'exported' ? new Date().toISOString() : null
        })
        .in('id', ids)
        .select();

    if (error) throw error;
    return data;
}

/**
 * Delete registration
 * @param {string} id - Registration ID
 */
async function deleteRegistration(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('course_registrations')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// REVIEWS HELPERS
// ============================================

/**
 * Fetch published reviews
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of reviews to fetch (default: all)
 * @param {string} options.category - Category to filter by (B, B+E)
 * @param {number} options.rating - Rating to filter by (1-5)
 */
async function fetchPublishedReviews(options = {}) {
    const client = getSupabase();

    if (!client) {
        console.log('Supabase not configured');
        return { success: false, data: [] };
    }

    const { limit = null, category = null, rating = null, featured = null } = options;

    try {
        let query = client
            .from('reviews')
            .select('*', { count: 'exact' })
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        // Filter by featured (for homepage)
        if (featured === true) {
            query = query.eq('is_featured', true);
        }

        if (category) {
            query = query.eq('course_category', category);
        }

        if (rating) {
            query = query.eq('rating', rating);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error, count } = await query;

        if (error) {
            console.warn('Supabase query error:', error);
            return { success: false, data: [], count: 0 };
        }

        return { success: true, data: data || [], count: count || 0 };
    } catch (err) {
        console.warn('Error fetching reviews:', err);
        return { success: false, data: [], count: 0 };
    }
}

/**
 * Fetch all reviews (for admin)
 * @param {Object} options - Query options
 */
async function fetchAllReviews(options = {}) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { limit = 50, offset = 0, isPublished = null } = options;

    let query = client
        .from('reviews')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (isPublished !== null) {
        query = query.eq('is_published', isPublished);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
}

/**
 * Create new review
 */
async function createReview(reviewData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('reviews')
        .insert([{
            author_name: reviewData.author_name,
            author_initials: reviewData.author_initials || null,
            content: reviewData.content,
            rating: reviewData.rating,
            course_category: reviewData.course_category,
            course_year: reviewData.course_year,
            is_featured: reviewData.is_featured || false,
            is_published: reviewData.is_published || false
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update review
 */
async function updateReview(id, reviewData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('reviews')
        .update(reviewData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete review
 */
async function deleteReview(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// STORAGE HELPERS
// ============================================

/**
 * Upload image to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - Storage bucket name (default: 'news-images')
 * @returns {string} Public URL of uploaded image
 */
async function uploadImage(file, bucket = 'news-images') {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await client.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = client.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return publicUrl;
}

/**
 * Delete image from Supabase Storage
 */
async function deleteImage(imageUrl, bucket = 'news-images') {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    // Extract filename from URL
    const fileName = imageUrl.split('/').pop();

    const { error } = await client.storage
        .from(bucket)
        .remove([fileName]);

    if (error) throw error;
}

// ============================================
// PRICES HELPERS
// ============================================

/**
 * Fetch all prices
 * @returns {Object} { success: boolean, data: array }
 */
async function fetchAllPrices() {
    const client = getSupabase();

    if (!client) {
        console.log('Supabase not configured, using fallback prices');
        return { success: false, data: getFallbackPrices() };
    }

    try {
        const { data, error } = await client
            .from('prices')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            console.warn('Error fetching prices:', error);
            return { success: false, data: getFallbackPrices() };
        }

        // Check and update promo status for each price
        const processedData = data.map(price => processPromoStatus(price));

        return { success: true, data: processedData };
    } catch (err) {
        console.warn('Error fetching prices:', err);
        return { success: false, data: getFallbackPrices() };
    }
}

/**
 * Fetch single price by slug
 * @param {string} slug - Price slug (e.g., 'course-b')
 */
async function fetchPriceBySlug(slug) {
    const client = getSupabase();

    if (!client) {
        const fallback = getFallbackPrices().find(p => p.slug === slug);
        return fallback || null;
    }

    try {
        const { data, error } = await client
            .from('prices')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            console.warn('Error fetching price:', error);
            return null;
        }

        return processPromoStatus(data);
    } catch (err) {
        console.warn('Error fetching price:', err);
        return null;
    }
}

/**
 * Update price (admin only)
 * @param {string} id - Price UUID
 * @param {Object} priceData - Price data to update
 */
async function updatePrice(id, priceData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { data, error } = await client
        .from('prices')
        .update(priceData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Process promo status - check if promo has expired
 * @param {Object} price - Price object from database
 */
function processPromoStatus(price) {
    if (!price.promo_active || !price.promo_end_date) {
        return price;
    }

    const now = new Date();
    const promoEnd = new Date(price.promo_end_date);

    // If promo has expired, treat as inactive
    if (promoEnd <= now) {
        return {
            ...price,
            promo_active: false,
            _promo_expired: true
        };
    }

    return {
        ...price,
        _promo_remaining_ms: promoEnd - now
    };
}

/**
 * Get current display price (considering active promo)
 * @param {Object} price - Price object
 */
function getCurrentPrice(price) {
    if (price.promo_active && price.promo_price && !price._promo_expired) {
        return price.promo_price;
    }
    return price.base_price;
}

/**
 * Format price with unit
 * @param {number} amount - Price amount
 * @param {string} unit - Price unit (default: 'zł')
 */
function formatPrice(amount, unit = 'zł') {
    // Format with space as thousands separator
    const formatted = amount.toLocaleString('pl-PL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return `${formatted} ${unit}`;
}

/**
 * Fallback prices if Supabase is unavailable
 */
function getFallbackPrices() {
    return [
        { slug: 'course-b', name: 'Kurs kat. B', base_price: 3300, price_unit: 'zł', promo_active: false },
        { slug: 'course-b-express', name: 'Kurs kat. B (ekspresowy)', base_price: 3800, price_unit: 'zł', promo_active: false },
        { slug: 'course-be', name: 'Kurs kat. B+E', base_price: 2400, price_unit: 'zł', promo_active: false },
        { slug: 'course-be-express', name: 'Kurs kat. B+E (ekspresowy)', base_price: 2800, price_unit: 'zł', promo_active: false },
        { slug: 'refresher-b', name: 'Jazdy doszkalające kat. B', base_price: 120, price_unit: 'zł/h', promo_active: false },
        { slug: 'refresher-b-student', name: 'Jazdy doszkalające kat. B (kursanci)', base_price: 110, price_unit: 'zł/h', promo_active: false },
        { slug: 'refresher-be', name: 'Jazdy doszkalające kat. B+E', base_price: 150, price_unit: 'zł/h', promo_active: false },
        { slug: 'refresher-be-student', name: 'Jazdy doszkalające kat. B+E (kursanci)', base_price: 140, price_unit: 'zł/h', promo_active: false },
        { slug: 'pickup-fee', name: 'Dojazd poza Kłecko', base_price: 150, price_unit: 'zł', promo_active: false }
    ];
}

// ============================================
// VERIFICATION CODES HELPERS
// ============================================

/**
 * Fetch all verification codes (for admin)
 */
async function fetchAllVerificationCodes(options = {}) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { limit = 100, offset = 0, status = null } = options;

    let query = client
        .from('verification_codes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
}

/**
 * Create new verification code
 */
async function createVerificationCode(codeData) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    // Generate UUID client-side as fallback
    const uuid = crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

    const { data, error } = await client
        .from('verification_codes')
        .insert([{
            id: uuid,
            code: codeData.code,
            student_name: codeData.student_name || null,
            course_category: codeData.course_category || null,
            status: codeData.status || 'active',
            expires_at: codeData.expires_at || null
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Verify code and mark as used
 * @param {string} code - The verification code to check
 * @returns {Object} { valid: boolean, data?: object, error?: string }
 */
async function verifyCode(code) {
    const client = getSupabase();
    if (!client) return { valid: false, error: 'System niedostępny' };

    try {
        // Find the code
        const { data, error } = await client
            .from('verification_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !data) {
            return { valid: false, error: 'Nieprawidłowy kod' };
        }

        // Check if already used
        if (data.status === 'used') {
            return { valid: false, error: 'Ten kod został już wykorzystany' };
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return { valid: false, error: 'Kod wygasł' };
        }

        return { valid: true, data };
    } catch (err) {
        console.error('Error verifying code:', err);
        return { valid: false, error: 'Błąd weryfikacji kodu' };
    }
}

/**
 * Mark verification code as used
 * @param {string} codeId - The code UUID
 * @param {string} reviewId - The review UUID that used this code
 */
async function markCodeAsUsed(codeId, reviewId) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('verification_codes')
        .update({
            status: 'used',
            used_at: new Date().toISOString(),
            review_id: reviewId
        })
        .eq('id', codeId);

    if (error) throw error;
}

/**
 * Delete verification code
 */
async function deleteVerificationCode(id) {
    const client = getSupabase();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
        .from('verification_codes')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================
// PLACEHOLDER DATA (disabled for production)
// Returns empty data - use real Supabase data
// ============================================


function getPlaceholderNews(options = {}) {
    // Return empty data in production - no fake articles
    return { data: [], count: 0 };
}

function getPlaceholderArticle(slug) {
    // Return null in production - will trigger error state
    return null;
}

function getPlaceholderCategories() {
    // Return empty array in production
    return [];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate URL-friendly slug from text
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/ł/g, 'l')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Format date to Polish locale
 */
function formatDatePL(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Format date for input fields (local timezone)
 */
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    // Use local timezone instead of UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initSupabase,
        isSupabaseConfigured,
        getSupabase,
        signIn,
        signOut,
        getCurrentUser,
        isAuthenticated,
        onAuthStateChange,
        fetchPublishedNews,
        fetchArticleBySlug,
        fetchAllNews,
        createArticle,
        updateArticle,
        deleteArticle,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        uploadImage,
        deleteImage,
        generateSlug,
        formatDatePL,
        formatDateForInput
    };
}
