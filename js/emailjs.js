/**
 * OSK Łuczak - EmailJS Integration
 * Obsługa wysyłania formularzy przez EmailJS
 * 
 * KONFIGURACJA - DWA OSOBNE KONTA:
 * 
 * KONTO 1 - Formularz kontaktowy (kontakt.html)
 * 1. Załóż konto na https://www.emailjs.com/
 * 2. Dodaj Email Service (Gmail, Outlook, etc.)
 * 3. Stwórz szablon "contact_form"
 * 4. Skopiuj klucze i wklej do CONTACT_CONFIG
 * 
 * KONTO 2 - Formularz rejestracji (zapisy.html)
 * 1. Załóż DRUGIE konto na https://www.emailjs.com/
 * 2. Dodaj Email Service
 * 3. Stwórz szablon "registration_form"
 * 4. Skopiuj klucze i wklej do REGISTRATION_CONFIG
 */

// ============================================
// KONFIGURACJA KONTA 1 - FORMULARZ KONTAKTOWY
// ============================================
const CONTACT_CONFIG = {
    publicKey: 'q0dnfrWD-XoxGUUZu',
    serviceId: 'service_bwe7h7g',
    templateId: 'template_73d2x8l',
    autoReplyTemplateId: 'template_yfothch'  // Auto-reply do klienta
};

// ============================================
// KONFIGURACJA KONTA 2 - FORMULARZ REJESTRACJI
// ============================================
const REGISTRATION_CONFIG = {
    publicKey: 'AEupvnmKzlj47XvV9',
    serviceId: 'service_ompbqui',
    templateId: 'template_xaueu3r',
    autoReplyTemplateId: 'template_rv5616a'  // Auto-reply do kursanta
};

// ============================================
// WYSYŁANIE FORMULARZA KONTAKTOWEGO
// ============================================
async function sendContactForm(formData) {
    // Inicjalizacja z kluczem konta kontaktowego
    if (typeof emailjs !== 'undefined') {
        emailjs.init(CONTACT_CONFIG.publicKey);
    } else {
        return { success: false, error: 'EmailJS nie załadowany' };
    }

    const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || 'Nie podano',
        subject: getSubjectLabel(formData.subject),
        message: formData.message,
        date: new Date().toLocaleString('pl-PL')
    };

    try {
        // Wyślij powiadomienie do właściciela
        const response = await emailjs.send(
            CONTACT_CONFIG.serviceId,
            CONTACT_CONFIG.templateId,
            templateParams
        );
        console.log('Contact form sent successfully:', response);

        // Wyślij auto-reply do klienta
        try {
            await emailjs.send(
                CONTACT_CONFIG.serviceId,
                CONTACT_CONFIG.autoReplyTemplateId,
                templateParams
            );
            console.log('Auto-reply sent successfully');
        } catch (autoReplyError) {
            console.warn('Auto-reply failed (non-critical):', autoReplyError);
        }

        return { success: true, response };
    } catch (error) {
        console.error('Failed to send contact form:', error);
        return { success: false, error };
    }
}

// ============================================
// WYSYŁANIE FORMULARZA REJESTRACJI NA KURS
// ============================================
async function sendRegistrationForm(formData) {
    // Inicjalizacja z kluczem konta rejestracyjnego
    if (typeof emailjs !== 'undefined') {
        emailjs.init(REGISTRATION_CONFIG.publicKey);
    } else {
        return { success: false, error: 'EmailJS nie załadowany' };
    }

    const templateParams = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        from_email: formData.email,
        phone: formData.phone,
        pesel: formData.pesel || 'Nie podano',
        pkk: formData.pkk || 'Nie posiada jeszcze',
        course: getCourseLabel(formData.course),
        city: getCityLabel(formData.city),
        source: formData.source || 'Nie podano',
        message: formData.message || 'Brak dodatkowych uwag',
        date: new Date().toLocaleString('pl-PL')
    };

    try {
        // Wyślij powiadomienie do właściciela
        const response = await emailjs.send(
            REGISTRATION_CONFIG.serviceId,
            REGISTRATION_CONFIG.templateId,
            templateParams
        );
        console.log('Registration form sent successfully:', response);

        // Wyślij auto-reply do kursanta
        try {
            await emailjs.send(
                REGISTRATION_CONFIG.serviceId,
                REGISTRATION_CONFIG.autoReplyTemplateId,
                templateParams
            );
            console.log('Registration auto-reply sent successfully');
        } catch (autoReplyError) {
            console.warn('Registration auto-reply failed (non-critical):', autoReplyError);
        }

        return { success: true, response };
    } catch (error) {
        console.error('Failed to send registration form:', error);
        return { success: false, error };
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Mapowanie wartości kursu na czytelną etykietę z dynamiczną ceną z bazy
function getCourseLabel(courseValue) {
    // Mapowanie wartości formularza na slugi z bazy danych
    const courseToSlug = {
        'B': 'course-b',
        'B-express': 'course-b-express',
        'BE': 'course-be',
        'BE-express': 'course-be-express',
        'doszkolenie-b': 'refresher-b',
        'doszkolenie-be': 'refresher-be'
    };

    const courseNames = {
        'B': 'Kategoria B',
        'B-express': 'Kategoria B (ekspresowy)',
        'BE': 'Kategoria B+E',
        'BE-express': 'Kategoria B+E (ekspresowy)',
        'doszkolenie-b': 'Jazdy doszkalające kategorii B',
        'doszkolenie-be': 'Jazdy doszkalające kategorii B+E'
    };

    const slug = courseToSlug[courseValue];
    const courseName = courseNames[courseValue] || courseValue;

    // Próba pobrania ceny z cache (jeśli prices.js załadowany)
    if (typeof getPrice === 'function' && slug) {
        const priceData = getPrice(slug);
        if (priceData) {
            // Użyj getCurrentPrice jeśli dostępna (uwzględnia promocje)
            const currentPrice = typeof getCurrentPrice === 'function'
                ? getCurrentPrice(priceData)
                : priceData.base_price;
            // Formatuj cenę
            const formatted = typeof formatPriceValue === 'function'
                ? formatPriceValue(currentPrice, priceData.price_unit)
                : `${currentPrice.toLocaleString('pl-PL')} ${priceData.price_unit}`;
            return `${courseName} - ${formatted}`;
        }
    }

    // Fallback na statyczne ceny gdy baza niedostępna
    const fallbackCourses = {
        'B': 'Kategoria B - 3 300 zł',
        'B-express': 'Kategoria B (ekspresowy) - 3 800 zł',
        'BE': 'Kategoria B+E - 2 400 zł',
        'BE-express': 'Kategoria B+E (ekspresowy) - 2 800 zł',
        'doszkolenie-b': 'Jazdy doszkalające kategorii B - 120 zł/h',
        'doszkolenie-be': 'Jazdy doszkalające kategorii B+E - 150 zł/h'
    };
    return fallbackCourses[courseValue] || courseValue;
}

// Mapowanie wartości tematu na czytelną etykietę
function getSubjectLabel(subjectValue) {
    const subjects = {
        'kursy': 'Pytanie o kursy',
        'ceny': 'Pytanie o ceny',
        'terminy': 'Dostępne terminy',
        'doszkolenie': 'Jazdy doszkalające kategorii B',
        'inne': 'Inne'
    };
    return subjects[subjectValue] || subjectValue;
}

// Mapowanie wartości miasta na czytelną etykietę z polskimi znakami
function getCityLabel(cityValue) {
    const cities = {
        'pila': 'Piła',
        'poznan': 'Poznań',
    };
    return cities[cityValue] || cityValue;
}

// Walidacja konfiguracji kontaktowej
function isContactConfigured() {
    return CONTACT_CONFIG.publicKey !== 'TWOJ_PUBLIC_KEY_KONTAKT' &&
        CONTACT_CONFIG.serviceId !== 'TWOJ_SERVICE_ID_KONTAKT';
}

// Walidacja konfiguracji rejestracyjnej
function isRegistrationConfigured() {
    return REGISTRATION_CONFIG.publicKey !== 'TWOJ_PUBLIC_KEY_REJESTRACJA' &&
        REGISTRATION_CONFIG.serviceId !== 'TWOJ_SERVICE_ID_REJESTRACJA';
}

// Pokazanie stanu ładowania na przycisku
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                </path>
            </svg>
            Wysyłanie...
        `;
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
    }
}

// Pokazanie komunikatu błędu
function showFormError(form, message) {
    // Usuń poprzedni błąd jeśli istnieje
    const existingError = form.querySelector('.form-error-message');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error-message';
    errorDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>${message}</span>
    `;
    errorDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px;
        margin-bottom: 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        color: #dc2626;
        font-size: 14px;
        font-weight: 600;
        animation: fadeIn 0.3s ease;
    `;

    form.insertBefore(errorDiv, form.firstChild);

    // Auto-usuń po 5 sekundach
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.style.opacity = '0';
            setTimeout(() => errorDiv.remove(), 300);
        }
    }, 5000);
}

// ============================================
// EKSPORT DLA UŻYCIA W HTML
// ============================================
window.EmailJSHandler = {
    sendContactForm,
    sendRegistrationForm,
    isContactConfigured,
    isRegistrationConfigured,
    setButtonLoading,
    showFormError
};

// Info w konsoli
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        if (!isContactConfigured()) {
            console.warn('⚠️ EmailJS (kontakt) nie skonfigurowany. Uzupełnij CONTACT_CONFIG w js/emailjs.js');
        }
        if (!isRegistrationConfigured()) {
            console.warn('⚠️ EmailJS (rejestracja) nie skonfigurowany. Uzupełnij REGISTRATION_CONFIG w js/emailjs.js');
        }
    }, 500);
});
