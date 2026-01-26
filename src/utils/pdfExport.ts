// PDF Export Utility for Task and Application Data
import type { Task } from '../__tests__/data/mockTasks';

interface PDFOptions {
    filename?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(value: any): string {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
    }).format(Number(value));
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
 * Generate and download PDF with task and customer application data
 */
export async function exportTaskApplicationToPDF(task: Task, options: PDFOptions = {}): Promise<void> {
    const { filename = `Application_${task.customerName.replace(/\s+/g, '_')}.pdf` } = options;

    if (!task.registered_customer_data) {
        alert('No customer data available to export');
        return;
    }

    try {
        // Dynamically import jsPDF and html2canvas
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        // Create a temporary container with the formatted content
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.padding = '20px';
        tempContainer.style.backgroundColor = '#ffffff';
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        tempContainer.style.fontSize = '12px';
        tempContainer.style.lineHeight = '1.6';

        const customer = task.registered_customer_data;

        tempContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1f2937; padding-bottom: 15px;">
                <h1 style="margin: 0; color: #1f2937; font-size: 24px;">TATA Solar Application</h1>
                <p style="margin: 5px 0; color: #666; font-size: 14px;">Task Reference: TASK-${task.id}</p>
            </div>

            <!-- Task Information -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Task Details</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Task Type:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatTaskType(task.workTitle)}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Assigned To:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${task.assignedRole}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Assigned Date:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatDate(task.assignedOn)}</td>
                    </tr>
                </table>
            </div>

            <!-- Applicant Information -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Applicant Information</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top;"><strong>Name:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">${customer.applicant_name}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Mobile:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.mobile_number}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.email_id || 'N/A'}</td>
                    </tr>
                </table>
            </div>

            <!-- Location Information -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Location Details</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>District:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.district}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Pincode:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.installation_pincode}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Address:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.site_address || 'N/A'}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px;"><strong>Coordinates:</strong></td>
                        <td style="width: 50%; padding: 8px;">${customer.site_latitude}, ${customer.site_longitude}</td>
                    </tr>
                </table>
            </div>

            <!-- Solar System Details -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Solar System Information</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>System Type:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.solar_system_type}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Plant Category:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.plant_category}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>System Capacity:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.plant_size_kw} kW</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Estimated Cost:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${formatCurrency(customer.plant_price)}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Meter Type:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.meter_type}</td>
                    </tr>
                </table>
            </div>

            <!-- Electrical Requirements -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Electrical Requirements</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Current Load:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.current_load || 'N/A'} kW</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Required Load:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.required_load || 'N/A'} kW</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Load Enhancement Required:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.load_enhancement_required}</td>
                    </tr>
                </table>
            </div>

            <!-- Payment & Finance Details -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Payment & Finance</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Payment Mode:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.payment_mode}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Advance Payment:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.advance_payment_mode}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Finance Required:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.special_finance_required}</td>
                    </tr>
                </table>
            </div>

            <!-- Additional Details -->
            <div style="background-color: #f3f4f6; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; border-bottom: 2px solid #1f2937; padding-bottom: 5px;">Additional Details</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>COT Required:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.cot_required}</td>
                    </tr>
                    <tr style="background-color: white;">
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Name Correction:</strong></td>
                        <td style="width: 50%; padding: 8px; border-bottom: 1px solid #e5e7eb;">${customer.name_correction_required}</td>
                    </tr>
                </table>
            </div>

            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 15px; border-top: 2px solid #1f2937; text-align: center; font-size: 11px; color: #666;">
                <p style="margin: 0;">Generated on ${formatDate(new Date().toISOString())}</p>
                <p style="margin: 5px 0 0 0;">This is a digitally generated document. Please retain for your records.</p>
            </div>
        `;

        document.body.appendChild(tempContainer);

        // Convert HTML to canvas
        const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
        });

        // Create PDF from canvas
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate proportional height
        const imgData = canvas.toDataURL('image/png');
        const ratio = canvasWidth / canvasHeight;
        const imgHeight = pageWidth / ratio;

        // Add pages as needed
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Download PDF
        pdf.save(filename);

        // Cleanup
        document.body.removeChild(tempContainer);
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Failed to export PDF. Please ensure jsPDF and html2canvas are installed.');
    }
}
