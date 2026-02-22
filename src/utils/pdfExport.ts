// PDF Export Utility for Task and Application Data
import type { Task } from '../__tests__/data/mockTasks';

interface PDFOptions {
    filename?: string;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Format task type for display
 */
function formatTaskType(workType: string): string {
    return workType.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Generate and download PDF with task and customer application data.
 * Uses native jsPDF drawing APIs (no html2canvas) so text never
 * gets sliced across page boundaries.
 */
export async function exportTaskApplicationToPDF(task: Task, options: PDFOptions = {}): Promise<void> {
    const { filename = `Application_${task.customerName.replace(/\s+/g, '_')}.pdf` } = options;

    if (!task.registered_customer_data) {
        alert('No customer data available to export');
        return;
    }

    try {
        const { jsPDF } = await import('jspdf');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const customer = task.registered_customer_data;

        // ── Layout constants ──────────────────────────────────────────────
        const PAGE_W = 210;
        const PAGE_H = 297;
        const MARGIN = 14;
        const COL_W = PAGE_W - MARGIN * 2;
        const LABEL_W = COL_W * 0.42;
        const VAL_W = COL_W - LABEL_W;
        const ROW_H = 8.5;
        const SEC_H = 13;

        // ── Colour palette (RGB tuples) ───────────────────────────────────
        type RGB = [number, number, number];
        const C_HEADER_BG: RGB = [31, 41, 55];   // #1f2937
        const C_SEC_BG: RGB = [243, 244, 246];  // #f3f4f6
        const C_ALT_BG: RGB = [255, 255, 255];  // white
        const C_BORDER: RGB = [229, 231, 235];  // #e5e7eb
        const C_DARK: RGB = [31, 41, 55];
        const C_MID: RGB = [55, 65, 81];
        const C_LIGHT: RGB = [107, 114, 128];
        const C_WHITE: RGB = [255, 255, 255];

        let y = MARGIN;

        // ── Helpers ───────────────────────────────────────────────────────

        /** Add a new page and reset y if remaining space < needed */
        const guard = (needed: number) => {
            if (y + needed > PAGE_H - MARGIN - 10) {
                pdf.addPage();
                y = MARGIN;
            }
        };

        /** Draw a section heading with grey background + underline */
        const section = (title: string) => {
            guard(SEC_H + ROW_H * 2);
            pdf.setFillColor(...C_SEC_BG);
            pdf.rect(MARGIN, y, COL_W, SEC_H, 'F');
            pdf.setDrawColor(...C_HEADER_BG);
            pdf.setLineWidth(0.6);
            pdf.line(MARGIN, y + SEC_H, MARGIN + COL_W, y + SEC_H);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(...C_DARK);
            pdf.text(title, MARGIN + 4, y + SEC_H - 3.5);
            y += SEC_H + 1;
        };

        /** Draw a key/value table row with alternating background */
        const row = (label: string, value: string, alt: boolean) => {
            // Measure wrapped value height first
            pdf.setFontSize(9.5);
            const lines = pdf.splitTextToSize(String(value || 'N/A'), VAL_W - 4);
            const cellH = Math.max(ROW_H, lines.length * 5 + 3);

            guard(cellH);

            if (alt) {
                pdf.setFillColor(...C_ALT_BG);
                pdf.rect(MARGIN, y, COL_W, cellH, 'F');
            }
            pdf.setDrawColor(...C_BORDER);
            pdf.setLineWidth(0.25);
            pdf.line(MARGIN, y + cellH, MARGIN + COL_W, y + cellH);

            // Label
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9.5);
            pdf.setTextColor(...C_DARK);
            pdf.text(label, MARGIN + 3, y + cellH / 2 + 1.5);

            // Value
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(...C_MID);
            pdf.text(lines, MARGIN + LABEL_W + 2, y + cellH / 2 - ((lines.length - 1) * 5) / 2 + 1.5);

            y += cellH;
        };

        const gap = () => { y += 5; };

        // ── COVER HEADER ─────────────────────────────────────────────────
        pdf.setFillColor(...C_HEADER_BG);
        pdf.rect(0, 0, PAGE_W, 30, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(19);
        pdf.setTextColor(...C_WHITE);
        pdf.text('TATA Solar Application', PAGE_W / 2, 13, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(190, 210, 230);
        pdf.text(`Task Reference: TASK-${task.id}`, PAGE_W / 2, 22, { align: 'center' });
        y = 37;

        // ── TASK DETAILS ─────────────────────────────────────────────────
        section('Task Details');
        row('Task Type:', formatTaskType(task.workTitle), false);
        row('Assigned To:', task.assignedRole, true);
        row('Assigned Date:', formatDate(task.assignedOn), false);
        gap();

        // ── APPLICANT INFORMATION ─────────────────────────────────────────
        section('Applicant Information');
        row('Name:', customer.applicant_name, false);
        row('Mobile:', customer.mobile_number, true);
        row('Email:', customer.email_id || 'N/A', false);
        gap();

        // ── LOCATION DETAILS ──────────────────────────────────────────────
        section('Location Details');
        row('District:', customer.district, false);
        row('Pincode:', customer.installation_pincode, true);
        row('Address:', customer.site_address || 'N/A', false);
        row('Coordinates:', `${customer.site_latitude}, ${customer.site_longitude}`, true);
        gap();

        // ── SOLAR SYSTEM INFORMATION ──────────────────────────────────────
        section('Solar System Information');
        row('System Type:', customer.solar_system_type, false);
        row('Plant Category:', customer.plant_category, true);
        row('System Capacity:', `${customer.plant_size_kw} kW`, false);
        row('Meter Type:', customer.meter_type, true);
        gap();

        // ── ELECTRICAL REQUIREMENTS ───────────────────────────────────────
        section('Electrical Requirements');
        row('Current Load:', `${customer.current_load || 'N/A'} kW`, false);
        row('Required Load:', `${customer.required_load || 'N/A'} kW`, true);
        row('Load Enhancement Required:', customer.load_enhancement_required, false);
        gap();

        // ── PAYMENT & FINANCE ─────────────────────────────────────────────
        section('Payment & Finance');
        row('Payment Mode:', customer.payment_mode, false);
        row('Advance Payment:', customer.advance_payment_mode, true);
        row('Finance Required:', customer.special_finance_required, false);
        gap();

        // ── ADDITIONAL DETAILS ────────────────────────────────────────────
        section('Additional Details');
        row('COT Required:', customer.cot_required, false);
        row('Name Correction:', customer.name_correction_required, true);
        gap();

        // ── FOOTER + PAGE NUMBERS ─────────────────────────────────────────
        guard(18);
        pdf.setDrawColor(...C_HEADER_BG);
        pdf.setLineWidth(0.5);
        pdf.line(MARGIN, y, MARGIN + COL_W, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...C_LIGHT);
        pdf.text(`Generated on ${formatDate(new Date().toISOString())}`, PAGE_W / 2, y, { align: 'center' });
        y += 5;
        pdf.text('This is a digitally generated document. Please retain for your records.', PAGE_W / 2, y, { align: 'center' });

        // Stamp page numbers on every page
        const total = pdf.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(...C_LIGHT);
            pdf.text(`Page ${i} of ${total}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' });
        }

        pdf.save(filename);

    } catch (error) {
        console.error('PDF export error:', error);
        alert('Failed to export PDF. Please ensure jsPDF is installed.');
    }
}

