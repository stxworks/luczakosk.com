/**
 * OSK Łuczak - Public Review Submission Form
 *
 * Handles verified review submissions from the public opinie.html page
 */

// ============================================
// STATE
// ============================================
let verifiedCodeData = null;

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setupPublicReviewListeners();
});

function setupPublicReviewListeners() {
    // Open modal button
    const addReviewBtn = document.getElementById('add-review-public-btn');
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', openPublicReviewModal);
    }

    // Verify code form
    const verifyForm = document.getElementById('verify-code-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerifyCode);
    }

    // Review form
    const reviewForm = document.getElementById('public-review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handlePublicReviewSubmit);
    }

    // Star rating
    const starInputs = document.querySelectorAll('.public-review-form__stars input');
    starInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const hiddenInput = document.getElementById('public-review-rating');
            if (hiddenInput) {
                hiddenInput.value = e.target.value;
            }
        });
    });

    // Close modal
    const closeBtn = document.querySelector('.public-review-modal__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePublicReviewModal);
    }

    // Close on overlay click
    const modal = document.getElementById('public-review-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePublicReviewModal();
            }
        });
    }

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePublicReviewModal();
        }
    });
}

// ============================================
// MODAL CONTROL
// ============================================

function openPublicReviewModal() {
    const modal = document.getElementById('public-review-modal');
    if (!modal) return;

    // Reset to step 1
    resetModalToStep1();

    modal.classList.add('is-visible');
    document.body.style.overflow = 'hidden';

    // Focus on code input
    setTimeout(() => {
        document.getElementById('verification-code-input')?.focus();
    }, 100);
}

function closePublicReviewModal() {
    const modal = document.getElementById('public-review-modal');
    if (modal) {
        modal.classList.remove('is-visible');
        document.body.style.overflow = '';
    }
    verifiedCodeData = null;
}

function resetModalToStep1() {
    // Show step 1, hide step 2
    document.getElementById('review-step-1')?.classList.remove('is-hidden');
    document.getElementById('review-step-2')?.classList.add('is-hidden');

    // Reset forms
    document.getElementById('verify-code-form')?.reset();
    document.getElementById('public-review-form')?.reset();

    // Clear errors
    const errorEl = document.getElementById('code-verify-error');
    if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
    }

    // Reset code data
    verifiedCodeData = null;
}

function showStep2() {
    document.getElementById('review-step-1')?.classList.add('is-hidden');
    document.getElementById('review-step-2')?.classList.remove('is-hidden');

    // Pre-fill category if available from code
    if (verifiedCodeData?.course_category) {
        const categorySelect = document.getElementById('public-review-category');
        if (categorySelect) {
            categorySelect.value = verifiedCodeData.course_category;
        }
    }

    // Pre-fill name if available
    if (verifiedCodeData?.student_name) {
        const nameInput = document.getElementById('public-review-author');
        if (nameInput && !nameInput.value) {
            // Extract first name and last initial
            const parts = verifiedCodeData.student_name.split(' ');
            if (parts.length >= 2) {
                nameInput.value = `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
            } else {
                nameInput.value = verifiedCodeData.student_name;
            }
        }
    }

    // Set current year
    const yearInput = document.getElementById('public-review-year');
    if (yearInput) {
        yearInput.value = new Date().getFullYear();
    }

    // Focus on content
    setTimeout(() => {
        document.getElementById('public-review-content')?.focus();
    }, 100);
}

// ============================================
// CODE VERIFICATION
// ============================================

async function handleVerifyCode(e) {
    e.preventDefault();

    const codeInput = document.getElementById('verification-code-input');
    const errorEl = document.getElementById('code-verify-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const code = codeInput?.value.trim().toUpperCase();

    if (!code) {
        showCodeError('Wprowadź kod weryfikacyjny');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
        </svg>
        Sprawdzanie...
    `;

    try {
        // Verify code via Supabase
        const result = await verifyCode(code);

        if (!result.valid) {
            showCodeError(result.error || 'Nieprawidłowy kod');
            return;
        }

        // Code is valid - save data and proceed
        verifiedCodeData = result.data;
        showStep2();

    } catch (error) {
        console.error('Verification error:', error);
        showCodeError('Błąd weryfikacji. Spróbuj ponownie.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showCodeError(message) {
    const errorEl = document.getElementById('code-verify-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    // Shake effect on input
    const input = document.getElementById('verification-code-input');
    if (input) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
    }
}

// ============================================
// REVIEW SUBMISSION
// ============================================

async function handlePublicReviewSubmit(e) {
    e.preventDefault();

    if (!verifiedCodeData) {
        showReviewError('Błąd weryfikacji. Spróbuj ponownie.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const authorName = document.getElementById('public-review-author')?.value.trim();
    const content = document.getElementById('public-review-content')?.value.trim();
    const rating = parseInt(document.getElementById('public-review-rating')?.value);
    const category = document.getElementById('public-review-category')?.value;
    const year = parseInt(document.getElementById('public-review-year')?.value);

    // Validation
    if (!authorName || authorName.length < 2) {
        showReviewError('Podaj swoje imię');
        return;
    }

    if (!content || content.length < 20) {
        showReviewError('Opinia musi mieć minimum 20 znaków');
        return;
    }

    if (!rating || rating < 1 || rating > 5) {
        showReviewError('Wybierz ocenę');
        return;
    }

    if (!category) {
        showReviewError('Wybierz kategorię kursu');
        return;
    }

    if (!year || year < 2000 || year > new Date().getFullYear()) {
        showReviewError('Podaj prawidłowy rok ukończenia kursu');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
        </svg>
        Wysyłanie...
    `;

    try {
        // Create review data
        const reviewData = {
            author_name: authorName,
            author_initials: authorName.split(' ').map(n => n[0]).join('').toUpperCase(),
            content: content,
            rating: rating,
            course_category: category,
            course_year: year,
            verification_code_id: verifiedCodeData.id
        };


        // Save review
        const newReview = await createVerifiedReview(reviewData);

        // Mark code as used
        await markCodeAsUsed(verifiedCodeData.id, newReview.id);

        // Show success
        showSuccessMessage();

    } catch (error) {
        console.error('Submit error:', error);
        showReviewError('Błąd wysyłania opinii. Spróbuj ponownie.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showReviewError(message) {
    const errorEl = document.getElementById('review-submit-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';

        // Scroll to error
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-hide after 5s
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
}

function showSuccessMessage() {
    const step2 = document.getElementById('review-step-2');
    if (step2) {
        step2.innerHTML = `
            <div class="public-review-success">
                <div class="public-review-success__icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 12l3 3 5-6"/>
                    </svg>
                </div>
                <h3 class="public-review-success__title">Dziękujemy za opinię!</h3>
                <p class="public-review-success__text">
                    Twoja opinia została przesłana i oczekuje na weryfikację.
                    Po zatwierdzeniu przez administratora pojawi się na stronie.
                </p>
                <button type="button" class="btn btn--primary" onclick="closePublicReviewModal()">
                    Zamknij
                </button>
            </div>
        `;
    }
}

// ============================================
// SUPABASE HELPERS (extend existing)
// ============================================

/**
 * Create a verified review (from public form)
 */
async function createVerifiedReview(reviewData) {
    const client = getSupabase();
    if (!client) throw new Error('System niedostępny');

    const { data, error } = await client
        .from('reviews')
        .insert([reviewData])
        .select()
        .single();
    if (error) throw error;
    return data;

}
