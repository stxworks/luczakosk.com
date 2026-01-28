/**
 * OSK Łuczak - Course Registrations Management
 * Handles displaying registrations and PDF export
 */

// Global state
let selectedRegistrations = [];
let currentRegistrations = [];

// ============================================
// LOAD REGISTRATIONS
// ============================================

async function loadRegistrations(status = 'new') {
    const tableBody = document.getElementById('registrations-table-body');
    const countDiv = document.getElementById('registrations-count');

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px;">
                <div class="loading-spinner" style="margin: 0 auto;"></div>
            </td>
        </tr>
    `;

    try {
        const { data, count } = await fetchRegistrations(status);
        currentRegistrations = data || [];

        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; display: block; opacity: 0.5;">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Brak zapisów${status === 'new' ? ' oczekujących na eksport' : ''}
                    </td>
                </tr>
            `;
            countDiv.textContent = 'Brak zapisów';
            updateBadge(0);
            return;
        }

        tableBody.innerHTML = data.map(reg => `
            <tr data-id="${reg.id}">
                <td>
                    <input type="checkbox" class="registration-checkbox" data-id="${reg.id}" 
                           onchange="toggleRegistrationSelection('${reg.id}')">
                </td>
                <td>
                    <strong>${escapeHtml(reg.first_name)} ${escapeHtml(reg.last_name)}</strong>
                    ${reg.pesel ? `<br><small style="color: #64748b;">PESEL: ${escapeHtml(reg.pesel)}</small>` : ''}
                </td>
                <td>
                    <a href="tel:${reg.phone}" style="color: #1a56db; text-decoration: none;">${escapeHtml(reg.phone)}</a>
                    <br><small style="color: #64748b;">${escapeHtml(reg.email)}</small>
                </td>
                <td>
                    <span style="background: #eff6ff; color: #1a56db; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${escapeHtml(reg.course)}
                    </span>
                </td>
                <td>${getCityDisplayName(reg.city)}</td>
                <td>${formatDateShort(reg.created_at)}</td>
                <td>
                    <span class="status-badge status-badge--${reg.status === 'new' ? 'success' : 'secondary'}">
                        ${reg.status === 'new' ? 'Nowy' : 'Wyeksportowany'}
                    </span>
                </td>
            </tr>
        `).join('');

        countDiv.textContent = `Pokazano ${data.length} z ${count || data.length} zapisów`;

        // Update badge for new registrations
        if (status === 'new' || status === 'all') {
            const newCount = status === 'new' ? data.length : data.filter(r => r.status === 'new').length;
            updateBadge(newCount);
        }

    } catch (error) {
        console.error('Error loading registrations:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc2626;">
                    Błąd podczas ładowania zapisów. Sprawdź konsolę.
                </td>
            </tr>
        `;
    }
}

// ============================================
// SELECTION HANDLING
// ============================================

function toggleRegistrationSelection(id) {
    const checkbox = document.querySelector(`.registration-checkbox[data-id="${id}"]`);
    if (checkbox.checked) {
        selectedRegistrations.push(id);
    } else {
        selectedRegistrations = selectedRegistrations.filter(rid => rid !== id);
    }
    updateSelectionUI();
}

function toggleAllRegistrations() {
    const selectAllCheckbox = document.getElementById('select-all-registrations');
    const checkboxes = document.querySelectorAll('.registration-checkbox');

    if (selectAllCheckbox.checked) {
        // Select ALL registrations (not just 'new')
        selectedRegistrations = currentRegistrations.map(r => r.id);
        checkboxes.forEach(cb => {
            cb.checked = true;
        });
    } else {
        selectedRegistrations = [];
        checkboxes.forEach(cb => cb.checked = false);
    }
    updateSelectionUI();
}

function updateSelectionUI() {
    const selectedDiv = document.getElementById('registrations-selected');
    const selectedCount = document.getElementById('selected-count');
    const exportBtn = document.getElementById('export-pdf-btn');

    if (selectedRegistrations.length > 0) {
        selectedDiv.style.display = 'block';
        selectedCount.textContent = selectedRegistrations.length;
        exportBtn.textContent = `Eksportuj PDF (${selectedRegistrations.length})`;
    } else {
        selectedDiv.style.display = 'none';
        exportBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15l3 3 3-3" />
            </svg>
            Eksportuj PDF
        `;
    }
}

function updateBadge(count) {
    const badge = document.getElementById('new-registrations-badge');
    if (badge) {
        if (count > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }
}

// ============================================
// PDF EXPORT
// ============================================

async function exportRegistrationsToPDF() {
    // Get registrations to export
    let toExport = [];

    if (selectedRegistrations.length > 0) {
        toExport = currentRegistrations.filter(r => selectedRegistrations.includes(r.id));
    } else {
        // Export all new
        toExport = currentRegistrations.filter(r => r.status === 'new');
    }

    if (toExport.length === 0) {
        alert('Brak zapisow do eksportu');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Page dimensions
    const pageWidth = doc.internal.pageSize.width; // 210mm for A4
    const centerX = pageWidth / 2;

    // Colors
    const blue = [26, 86, 219];
    const yellow = [245, 196, 0];
    const dark = [15, 23, 42];
    const white = [255, 255, 255];

    // Helper - remove Polish chars for PDF
    function removePL(text) {
        if (!text) return '';
        return String(text)
            .replace(/ą/g, 'a').replace(/Ą/g, 'A')
            .replace(/ć/g, 'c').replace(/Ć/g, 'C')
            .replace(/ę/g, 'e').replace(/Ę/g, 'E')
            .replace(/ł/g, 'l').replace(/Ł/g, 'L')
            .replace(/ń/g, 'n').replace(/Ń/g, 'N')
            .replace(/ó/g, 'o').replace(/Ó/g, 'O')
            .replace(/ś/g, 's').replace(/Ś/g, 'S')
            .replace(/ź/g, 'z').replace(/Ź/g, 'Z')
            .replace(/ż/g, 'z').replace(/Ż/g, 'Z');
    }

    // Header background
    doc.setFillColor(...blue);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo text - centered
    doc.setTextColor(...white);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('OSK LUCZAK', centerX, 18, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Nowe zapisy na kurs', centerX, 32, { align: 'center' });

    // Date info section
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.text('Data eksportu: ' + new Date().toLocaleDateString('pl-PL'), 20, 52);
    doc.setTextColor(...blue);
    doc.setFont('helvetica', 'bold');
    doc.text('Liczba zapisow: ' + toExport.length, 20, 60);

    // Table data - remove Polish chars
    const tableData = toExport.map(reg => [
        removePL(reg.first_name + ' ' + reg.last_name),
        reg.phone || '-',
        reg.email || '-',
        removePL(reg.course) || '-',
        removePL(getCityDisplayName(reg.city)),
        formatDateShort(reg.created_at)
    ]);

    // AutoTable - centered with no borders
    doc.autoTable({
        startY: 70,
        head: [['Imie i nazwisko', 'Telefon', 'Email', 'Kurs', 'Miasto', 'Data']],
        body: tableData,
        headStyles: {
            fillColor: blue,
            textColor: white,
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'left',
            cellPadding: 5
        },
        bodyStyles: {
            fontSize: 8,
            textColor: dark,
            cellPadding: 4
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 26 },
            2: { cellWidth: 42 },
            3: { cellWidth: 28 },
            4: { cellWidth: 28 },
            5: { cellWidth: 28 }
        },
        margin: { left: 13, right: 13 },
        tableWidth: 'auto',
        styles: {
            overflow: 'linebreak',
            font: 'helvetica',
            lineColor: [255, 255, 255],
            lineWidth: 0
        },
        showHead: 'everyPage'
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(...dark);
    doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
    doc.setTextColor(...yellow);
    doc.setFontSize(9);
    doc.text('OSK Luczak - Szkola Jazdy | oskluczak.pl | tel. 795 499 047', centerX, pageHeight - 7, { align: 'center' });

    // Save PDF
    const fileName = 'zapisy_' + new Date().toISOString().split('T')[0] + '.pdf';
    doc.save(fileName);

    // Update status to exported
    try {
        const ids = toExport.map(r => r.id);
        await updateRegistrationStatus(ids, 'exported');

        // Reload table
        const currentFilter = document.getElementById('registrations-status-filter').value;
        await loadRegistrations(currentFilter);

        // Clear selection
        selectedRegistrations = [];
        updateSelectionUI();
        document.getElementById('select-all-registrations').checked = false;

        console.log('Exported ' + toExport.length + ' registrations to PDF');
    } catch (error) {
        console.error('Error updating status:', error);
        alert('PDF zostal wygenerowany, ale nie udalo sie zaktualizowac statusu.');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCityDisplayName(city) {
    const cities = {
        'pila': 'Piła',
        'poznan': 'Poznań',
    };
    return cities[city] || city || '-';
}

function formatDateShort(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Filter change handler
    const statusFilter = document.getElementById('registrations-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            selectedRegistrations = [];
            updateSelectionUI();
            loadRegistrations(e.target.value);
        });
    }

    // Select all handler
    const selectAll = document.getElementById('select-all-registrations');
    if (selectAll) {
        selectAll.addEventListener('change', toggleAllRegistrations);
    }

    // Load initial count for badge (check for new registrations)
    setTimeout(async () => {
        try {
            const { count } = await fetchRegistrations('new');
            updateBadge(count || 0);
        } catch (e) {
            console.warn('Could not load registrations count');
        }
    }, 1000);
});

// Make functions available globally
window.loadRegistrations = loadRegistrations;
window.exportRegistrationsToPDF = exportRegistrationsToPDF;
