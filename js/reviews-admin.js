/**
 * OSK Łuczak - Reviews Admin Management
 * 
 * Handles CRUD operations for reviews in the admin panel
 */

// Current reviews data
let reviewsData = [];
let editingReviewId = null;

// ============================================
// INITIALIZE REVIEWS
// ============================================

async function initReviewsAdmin() {
    // Setup event listeners
    setupReviewEventListeners();

    // Load reviews when view is shown
    await loadReviewsAdmin();
}

function setupReviewEventListeners() {
    // Add review buttons
    const addReviewBtn = document.getElementById('add-review-btn');
    const newReviewBtn = document.getElementById('new-review-btn');

    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', () => openReviewModal());
    }

    if (newReviewBtn) {
        newReviewBtn.addEventListener('click', () => {
            navigateTo('reviews');
            setTimeout(() => openReviewModal(), 100);
        });
    }

    // Review form submit
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    // Status filter
    const statusFilter = document.getElementById('reviews-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderReviewsTable());
    }

    // Set default year to current year
    const yearInput = document.getElementById('review-year');
    if (yearInput) {
        yearInput.value = new Date().getFullYear();
    }
}

// ============================================
// LOAD REVIEWS
// ============================================

async function loadReviewsAdmin() {
    const tableBody = document.getElementById('reviews-table-body');
    const countEl = document.getElementById('reviews-count');

    if (!tableBody) return;

    try {
        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                </td>
            </tr>
        `;

        // Fetch reviews
        const result = await fetchAllReviews();

        if (result && result.data) {
            reviewsData = result.data;
            renderReviewsTable();

            // Count featured reviews
            const featuredCount = reviewsData.filter(r => r.is_featured).length;

            if (countEl) {
                countEl.innerHTML = `Łącznie: ${result.count || reviewsData.length} opinii | <strong style="color: ${featuredCount >= 5 ? '#ef4444' : '#3b82f6'}">Na stronie głównej: ${featuredCount}/5</strong>`;
            }
        } else {
            reviewsData = [];
            renderReviewsTable();
            if (countEl) {
                countEl.innerHTML = 'Brak opinii | <strong>Na stronie głównej: 0/5</strong>';
            }
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
                    Błąd ładowania opinii: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================
// RENDER TABLE
// ============================================

function renderReviewsTable() {
    const tableBody = document.getElementById('reviews-table-body');
    const statusFilter = document.getElementById('reviews-status-filter');

    if (!tableBody) return;

    // Filter reviews
    let filtered = [...reviewsData];
    const filterValue = statusFilter?.value || 'all';

    if (filterValue === 'published') {
        filtered = filtered.filter(r => r.is_published);
    } else if (filterValue === 'draft') {
        filtered = filtered.filter(r => !r.is_published && !r.is_verified);
    } else if (filterValue === 'pending') {
        filtered = filtered.filter(r => !r.is_published && r.is_verified);
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #64748b;">
                    Brak opinii do wyświetlenia
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(review => {
        // Format date
        const createdDate = review.created_at ? new Date(review.created_at).toLocaleDateString('pl-PL') : '-';

        // Determine status: pending (verified but not published), published, or draft
        const isPending = review.is_verified && !review.is_published;
        const statusBadge = review.is_published
            ? '<span class="status-badge status-badge--success">Opublikowana</span>'
            : isPending
                ? '<span class="status-badge" style="background: rgba(245, 158, 11, 0.1); color: #d97706;">⏳ Do akceptacji</span>'
                : '<span class="status-badge status-badge--draft">Szkic</span>';

        // Different actions for pending reviews
        const actionButtons = isPending ? `
            <button class="btn btn--icon btn--success" onclick="approveReview('${review.id}')" title="Akceptuj i opublikuj">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </button>
            <button class="btn btn--icon btn--secondary" onclick="editReview('${review.id}')" title="Sprawdź całość">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
            </button>
            <button class="btn btn--icon btn--danger" onclick="rejectReview('${review.id}')" title="Odrzuć">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        ` : `
            <button class="btn btn--icon ${review.is_featured ? 'btn--warning' : 'btn--secondary'}" 
                onclick="toggleFeatured('${review.id}')" 
                title="${review.is_featured ? 'Usuń ze strony głównej' : 'Dodaj na stronę główną'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${review.is_featured ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </button>
            <button class="btn btn--icon btn--secondary" onclick="editReview('${review.id}')" title="Edytuj">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
            <button class="btn btn--icon btn--danger" onclick="confirmDeleteReview('${review.id}')" title="Usuń">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
            </button>
        `;

        return `
        <tr${isPending ? ' style="background: rgba(245, 158, 11, 0.03);"' : ''}>
            <td>
                <strong>${escapeHtml(review.author_name)}</strong>
                ${review.is_verified ? '<span style="color: #22c55e; font-size: 11px; margin-left: 6px;" title="Zweryfikowany kursant">✓</span>' : ''}
            </td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(review.content.substring(0, 80))}${review.content.length > 80 ? '...' : ''}
            </td>
            <td>
                <span style="color: #f59e0b;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
            </td>
            <td>
                <span class="badge badge--primary">${review.course_category}</span>
            </td>
            <td>${review.course_year}</td>
            <td style="color: #64748b; font-size: 13px;">${createdDate}</td>
            <td>
                ${review.is_featured
                ? '<span class="status-badge" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;" title="Widoczna na stronie głównej">★ Główna</span> '
                : ''}
                ${statusBadge}
            </td>
            <td>
                <div class="table-actions">
                    ${actionButtons}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openReviewModal(review = null) {
    const modal = document.getElementById('review-modal');
    const title = document.getElementById('review-modal-title');
    const form = document.getElementById('review-form');

    if (!modal || !form) return;

    // Reset form
    form.reset();
    document.getElementById('review-id').value = '';
    document.getElementById('review-year').value = new Date().getFullYear();
    document.getElementById('review-date').value = new Date().toISOString().split('T')[0]; // Today's date
    document.getElementById('review-published').checked = true;
    document.getElementById('review-featured').checked = false;

    if (review) {
        // Edit mode
        editingReviewId = review.id;
        title.textContent = 'Edytuj opinię';

        document.getElementById('review-id').value = review.id;
        document.getElementById('review-author').value = review.author_name;
        document.getElementById('review-content').value = review.content;
        document.getElementById('review-rating').value = review.rating;
        document.getElementById('review-category').value = review.course_category;
        document.getElementById('review-year').value = review.course_year;
        // Set date from created_at if available
        if (review.created_at) {
            document.getElementById('review-date').value = review.created_at.split('T')[0];
        }
        document.getElementById('review-featured').checked = review.is_featured;
        document.getElementById('review-published').checked = review.is_published;
    } else {
        // New review mode
        editingReviewId = null;
        title.textContent = 'Nowa opinia';
    }

    modal.classList.add('is-visible');
}

function closeReviewModal() {
    const modal = document.getElementById('review-modal');
    if (modal) {
        modal.classList.remove('is-visible');
    }
    editingReviewId = null;
}

function editReview(id) {
    const review = reviewsData.find(r => r.id === id);
    if (review) {
        openReviewModal(review);
    }
}

// ============================================
// FORM SUBMIT
// ============================================

async function handleReviewSubmit(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width: 18px; height: 18px;"></div> Zapisywanie...';

        // Gather form data
        const reviewId = document.getElementById('review-id').value;
        const authorName = document.getElementById('review-author').value.trim();
        const isFeatured = document.getElementById('review-featured').checked;

        // Check featured limit (max 5)
        if (isFeatured) {
            const currentFeaturedCount = reviewsData.filter(r => r.is_featured).length;
            const isEditingFeatured = reviewId && reviewsData.find(r => r.id === reviewId)?.is_featured;

            // If adding new featured or changing non-featured to featured
            if (!isEditingFeatured && currentFeaturedCount >= 5) {
                showNotification('Osiągnięto limit 5 opinii na stronie głównej. Usuń wyróżnienie z innej opinii przed dodaniem nowej.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
        }

        // Get the custom date or use current date
        const dateValue = document.getElementById('review-date').value;
        const createdAt = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();

        const reviewData = {
            author_name: authorName,
            author_initials: authorName.split(' ').map(n => n[0]).join('').toUpperCase(),
            content: document.getElementById('review-content').value.trim(),
            rating: parseInt(document.getElementById('review-rating').value),
            course_category: document.getElementById('review-category').value,
            course_year: parseInt(document.getElementById('review-year').value),
            is_featured: isFeatured,
            is_published: document.getElementById('review-published').checked,
            created_at: createdAt
        };

        if (reviewId) {
            // Update existing review
            await updateReview(reviewId, reviewData);
            showNotification('Opinia została zaktualizowana', 'success');
        } else {
            // Create new review
            await createReview(reviewData);
            showNotification('Opinia została dodana', 'success');
        }

        // Close modal and reload
        closeReviewModal();
        await loadReviewsAdmin();

    } catch (error) {
        console.error('Error saving review:', error);
        showNotification('Błąd zapisu: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================
// DELETE REVIEW
// ============================================

function confirmDeleteReview(id) {
    const review = reviewsData.find(r => r.id === id);
    if (!review) return;

    if (confirm(`Czy na pewno chcesz usunąć opinię od "${review.author_name}"?\n\nTa operacja jest nieodwracalna.`)) {
        deleteReviewById(id);
    }
}

async function deleteReviewById(id) {
    try {
        await deleteReview(id);
        showNotification('Opinia została usunięta', 'success');
        await loadReviewsAdmin();
    } catch (error) {
        console.error('Error deleting review:', error);
        showNotification('Błąd usuwania: ' + error.message, 'error');
    }
}

// ============================================
// TOGGLE FEATURED
// ============================================

async function toggleFeatured(id) {
    const review = reviewsData.find(r => r.id === id);
    if (!review) return;

    const newFeaturedStatus = !review.is_featured;

    // Check limit when adding to featured
    if (newFeaturedStatus) {
        const currentFeaturedCount = reviewsData.filter(r => r.is_featured).length;
        if (currentFeaturedCount >= 5) {
            showNotification('Osiągnięto limit 5 opinii na stronie głównej. Usuń wyróżnienie z innej opinii.', 'error');
            return;
        }
    }

    try {
        await updateReview(id, { is_featured: newFeaturedStatus });
        showNotification(newFeaturedStatus ? 'Opinia dodana na stronę główną' : 'Opinia usunięta ze strony głównej', 'success');
        await loadReviewsAdmin();
    } catch (error) {
        console.error('Error toggling featured:', error);
        showNotification('Błąd: ' + error.message, 'error');
    }
}

// ============================================
// APPROVE / REJECT REVIEW
// ============================================

async function approveReview(id) {
    const review = reviewsData.find(r => r.id === id);
    if (!review) return;

    if (confirm(`Czy na pewno chcesz zaakceptować i opublikować opinię od "${review.author_name}"?`)) {
        try {
            await updateReview(id, { is_published: true });
            showNotification('Opinia została zaakceptowana i opublikowana', 'success');
            await loadReviewsAdmin();
        } catch (error) {
            console.error('Error approving review:', error);
            showNotification('Błąd: ' + error.message, 'error');
        }
    }
}

async function rejectReview(id) {
    const review = reviewsData.find(r => r.id === id);
    if (!review) return;

    if (confirm(`Czy na pewno chcesz odrzucić opinię od "${review.author_name}"?\n\nOpinia zostanie trwale usunięta.`)) {
        try {
            await deleteReview(id);
            showNotification('Opinia została odrzucona i usunięta', 'success');
            await loadReviewsAdmin();
        } catch (error) {
            console.error('Error rejecting review:', error);
            showNotification('Błąd: ' + error.message, 'error');
        }
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Use existing toast system if available (from admin.js)
    if (typeof showToast === 'function') {
        showToast(type, type === 'success' ? 'Sukces' : 'Błąd', message);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Setup listeners immediately
    console.log('Reviews Admin: Setting up event listeners');
    setupReviewEventListeners();
});
