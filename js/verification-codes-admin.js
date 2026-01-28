/**
 * OSK Łuczak - Verification Codes Admin Management
 * 
 * Handles generation and management of verification codes for reviews
 */

// Current verification codes data
let verificationCodesData = [];

// ============================================
// INITIALIZE
// ============================================

function setupVerificationCodesListeners() {
    // Generate code button
    const generateBtn = document.getElementById('generate-code-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', () => openGenerateCodeModal());
    }

    // Generate code form
    const generateForm = document.getElementById('generate-code-form');
    if (generateForm) {
        generateForm.addEventListener('submit', handleGenerateCode);
    }

    // Status filter
    const statusFilter = document.getElementById('codes-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderCodesTable());
    }
}

// ============================================
// CODE GENERATION
// ============================================

/**
 * Generate unique verification code
 * Format: OSK-XXXX-XXXX (where X is alphanumeric)
 */
function generateUniqueCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters like 0,O,1,I
    let code = 'OSK-';

    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

// ============================================
// LOAD CODES
// ============================================

async function loadVerificationCodes() {
    const tableBody = document.getElementById('codes-table-body');
    const countEl = document.getElementById('codes-count');

    if (!tableBody) return;

    try {
        // Show loading
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                </td>
            </tr>
        `;

        // Fetch codes
        const result = await fetchAllVerificationCodes();

        if (result && result.data) {
            verificationCodesData = result.data;
            renderCodesTable();

            // Update count
            const activeCount = verificationCodesData.filter(c => c.status === 'active').length;
            const usedCount = verificationCodesData.filter(c => c.status === 'used').length;
            const totalCount = result.count || verificationCodesData.length;

            // Polish pluralization: 1=kod, 2-4=kody, 5+=kodów
            const pluralizeKod = (n) => {
                if (n === 1) return 'kod';
                if (n >= 2 && n <= 4) return 'kody';
                return 'kodów';
            };

            if (countEl) {
                countEl.innerHTML = `Łącznie: ${totalCount} ${pluralizeKod(totalCount)} | <strong style="color: #22c55e;">Aktywne: ${activeCount}</strong> | <span style="color: #64748b;">Użyte: ${usedCount}</span>`;
            }
        } else {
            verificationCodesData = [];
            renderCodesTable();
            if (countEl) {
                countEl.innerHTML = 'Brak kodów';
            }
        }
    } catch (error) {
        console.error('Error loading verification codes:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #ef4444;">
                    Błąd ładowania kodów: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ============================================
// RENDER TABLE
// ============================================

function renderCodesTable() {
    const tableBody = document.getElementById('codes-table-body');
    const statusFilter = document.getElementById('codes-status-filter');

    if (!tableBody) return;

    // Filter codes
    let filtered = [...verificationCodesData];
    const filterValue = statusFilter?.value || 'all';

    if (filterValue === 'active') {
        filtered = filtered.filter(c => c.status === 'active');
    } else if (filterValue === 'used') {
        filtered = filtered.filter(c => c.status === 'used');
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">
                    Brak kodów do wyświetlenia
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filtered.map(code => {
        // Format dates
        const createdDate = code.created_at ? new Date(code.created_at).toLocaleDateString('pl-PL') : '-';
        const usedDate = code.used_at ? new Date(code.used_at).toLocaleDateString('pl-PL') : '-';

        const statusBadge = code.status === 'active'
            ? '<span class="status-badge status-badge--success">✓ Aktywny</span>'
            : '<span class="status-badge" style="background: rgba(148, 163, 184, 0.1); color: #64748b;">Użyty</span>';

        return `
        <tr>
            <td>
                <code style="
                    background: #f1f5f9; 
                    padding: 6px 12px; 
                    border-radius: 6px; 
                    font-weight: 600;
                    font-size: 14px;
                    letter-spacing: 1px;
                ">${code.code}</code>
            </td>
            <td>${code.student_name || '<span style="color: #94a3b8;">-</span>'}</td>
            <td>
                ${code.course_category
                ? `<span class="badge badge--primary">${code.course_category}</span>`
                : '<span style="color: #94a3b8;">-</span>'}
            </td>
            <td style="color: #64748b; font-size: 13px;">${createdDate}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn--icon btn--danger" onclick="confirmDeleteCode('${code.id}')" title="Usuń kod">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                    ${code.status === 'active' ? `
                        <button class="btn btn--icon btn--secondary" onclick="copyCodeToClipboard('${code.code}')" title="Kopiuj kod">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        </button>
                    ` : `
                        <span style="color: #64748b; font-size: 12px; margin-left: 12px;">Użyto: ${usedDate}</span>
                    `}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openGenerateCodeModal() {
    const modal = document.getElementById('generate-code-modal');
    const form = document.getElementById('generate-code-form');
    const codePreview = document.getElementById('code-preview');

    if (!modal || !form) return;

    // Reset form
    form.reset();

    // Generate and show preview code
    const newCode = generateUniqueCode();
    if (codePreview) {
        codePreview.textContent = newCode;
        codePreview.dataset.code = newCode;
    }

    modal.classList.add('is-visible');
}

function closeGenerateCodeModal() {
    const modal = document.getElementById('generate-code-modal');
    if (modal) {
        modal.classList.remove('is-visible');
    }
}

function regenerateCodePreview() {
    const codePreview = document.getElementById('code-preview');
    if (codePreview) {
        const newCode = generateUniqueCode();
        codePreview.textContent = newCode;
        codePreview.dataset.code = newCode;
    }
}

// ============================================
// FORM SUBMIT
// ============================================

async function handleGenerateCode(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading-spinner" style="width: 18px; height: 18px;"></div> Generowanie...';

        // Get code from preview
        const codePreview = document.getElementById('code-preview');
        const code = codePreview?.dataset.code || generateUniqueCode();

        // Get optional fields
        const studentName = document.getElementById('code-student-name')?.value.trim() || null;
        const courseCategory = document.getElementById('code-course-category')?.value || null;

        // Calculate expiration (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Save to database
        const codeData = {
            code: code,
            student_name: studentName,
            course_category: courseCategory,
            status: 'active',
            expires_at: expiresAt.toISOString()
        };

        await createVerificationCode(codeData);

        showNotification('Kod został wygenerowany: ' + code, 'success');

        // Close modal and reload
        closeGenerateCodeModal();
        await loadVerificationCodes();

    } catch (error) {
        console.error('Error generating code:', error);
        showNotification('Błąd generowania kodu: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ============================================
// DELETE CODE
// ============================================

function confirmDeleteCode(id) {
    const code = verificationCodesData.find(c => c.id === id);
    if (!code) return;

    if (confirm(`Czy na pewno chcesz usunąć kod "${code.code}"?\n\nTa operacja jest nieodwracalna.`)) {
        deleteCodeById(id);
    }
}

async function deleteCodeById(id) {
    try {
        await deleteVerificationCode(id);
        showNotification('Kod został usunięty', 'success');
        await loadVerificationCodes();
    } catch (error) {
        console.error('Error deleting code:', error);
        showNotification('Błąd usuwania: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function copyCodeToClipboard(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Kod skopiowany do schowka: ' + code, 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Kod skopiowany do schowka: ' + code, 'success');
    });
}

function copyGeneratedCode() {
    const codePreview = document.getElementById('code-preview');
    const code = codePreview?.dataset.code || codePreview?.textContent;

    if (!code || code === 'OSK-XXXX-XXXX') {
        showNotification('Najpierw wygeneruj kod', 'error');
        return;
    }

    const copyBtn = document.getElementById('copy-code-btn');
    const originalHTML = copyBtn?.innerHTML;

    navigator.clipboard.writeText(code).then(() => {
        // Change button to show success
        if (copyBtn) {
            copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Skopiowano!
            `;
            copyBtn.classList.add('btn--success');

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('btn--success');
            }, 2000);
        }
        showNotification('Kod skopiowany do schowka: ' + code, 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Kod skopiowany do schowka: ' + code, 'success');
    });
}

function showNotification(message, type = 'info') {
    // Use existing toast system if available (from admin.js)
    if (typeof showToast === 'function') {
        showToast(type, type === 'success' ? 'Sukces' : 'Błąd', message);
    } else {
        alert(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Verification Codes Admin: Setting up event listeners');
    setupVerificationCodesListeners();
});
