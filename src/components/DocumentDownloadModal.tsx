import React, { useState, useMemo } from 'react';
import { Download, Eye, X, CheckCircle2, AlertCircle, Folder, FileText, FileJson } from 'lucide-react';

interface DocumentDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: any;
}

interface DocumentItem {
    name: string;
    url: string | null;
    category: string;
    type: 'image' | 'pdf' | 'document';
}

interface CategoryGroup {
    name: string;
    icon: React.ReactNode;
    documents: DocumentItem[];
}

export const DocumentDownloadModal: React.FC<DocumentDownloadModalProps> = ({
    isOpen,
    onClose,
    customer
}) => {
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);

    // Categorize documents
    const documentCategories = useMemo<CategoryGroup[]>(() => {
        const categories: CategoryGroup[] = [];

        // KYC Documents
        const kycDocs: DocumentItem[] = [
            { name: 'Aadhaar Front', url: customer?.aadhaar_front_url, category: 'KYC', type: 'image' },
            { name: 'Aadhaar Back', url: customer?.aadhaar_back_url, category: 'KYC', type: 'image' },
            { name: 'PAN Card', url: customer?.pan_card_url, category: 'KYC', type: 'image' },
            { name: 'Electric Bill', url: customer?.electric_bill_url, category: 'KYC', type: 'image' },
        ];
        categories.push({
            name: 'KYC & Personal Documents',
            icon: <FileText className="w-5 h-5" />,
            documents: kycDocs
        });

        // Bank & Financial Documents
        const bankDocs: DocumentItem[] = [
            { name: 'Smart Meter Document', url: customer?.smart_meter_doc_url, category: 'Financial', type: 'document' },
            { name: 'Cancel Cheque / Passbook', url: customer?.cancel_cheque_url, category: 'Financial', type: 'image' },
            { name: 'Bank Details Document', url: customer?.bank_details_doc_url, category: 'Financial', type: 'document' },
        ];
        categories.push({
            name: 'Bank & Financial',
            icon: <FileText className="w-5 h-5" />,
            documents: bankDocs
        });

        // COT Documents
        const cotDocs: DocumentItem[] = [
            { name: 'COT Documents (General)', url: customer?.cot_documents, category: 'COT', type: 'document' },
            { name: 'COT Death Certificate', url: customer?.cot_death_certificate_url, category: 'COT', type: 'document' },
            { name: 'COT House Papers', url: customer?.cot_house_papers_url, category: 'COT', type: 'document' },
            { name: 'COT Passport Photo', url: customer?.cot_passport_photo_url, category: 'COT', type: 'image' },
            { name: 'COT Family Registration', url: customer?.cot_family_registration_url, category: 'COT', type: 'document' },
            { name: 'COT Aadhaar Photos', url: customer?.cot_aadhaar_photos_urls, category: 'COT', type: 'image' },
            { name: 'COT Live Aadhaar 1', url: customer?.cot_live_aadhaar_1_url, category: 'COT', type: 'image' },
            { name: 'COT Live Aadhaar 2', url: customer?.cot_live_aadhaar_2_url, category: 'COT', type: 'image' },
        ];
        categories.push({
            name: 'COT Documents',
            icon: <Folder className="w-5 h-5" />,
            documents: cotDocs
        });

        // Application & Feasibility Documents
        const appDocs: DocumentItem[] = [
            { name: 'Application Form', url: customer?.application_form, category: 'Application', type: 'document' },
            { name: 'Feasibility Form', url: customer?.feasibility_form, category: 'Application', type: 'document' },
        ];
        categories.push({
            name: 'Application & Feasibility',
            icon: <FileText className="w-5 h-5" />,
            documents: appDocs
        });

        // Regulatory & Approval Documents
        const regDocs: DocumentItem[] = [
            { name: 'E-Token Document', url: customer?.etoken_document, category: 'Regulatory', type: 'document' },
            { name: 'Net Metering Document', url: customer?.net_metering_document, category: 'Regulatory', type: 'document' },
        ];
        categories.push({
            name: 'Regulatory & Net Metering',
            icon: <FileText className="w-5 h-5" />,
            documents: regDocs
        });

        // Finance Documents
        const financeDocs: DocumentItem[] = [
            { name: 'Finance Quotation', url: customer?.finance_quotation_document, category: 'Finance', type: 'document' },
            { name: 'Finance Digital Approval', url: customer?.finance_digital_approval, category: 'Finance', type: 'document' },
        ];
        categories.push({
            name: 'Finance Documents',
            icon: <FileText className="w-5 h-5" />,
            documents: financeDocs
        });

        // Certification & Installation Documents
        const certDocs: DocumentItem[] = [
            { name: 'UBI Sanction Certificate', url: customer?.ubi_sanction_certificate_document, category: 'Certification', type: 'document' },
            { name: 'Indent Document', url: customer?.indent_document, category: 'Certification', type: 'document' },
            { name: 'Warranty Card', url: customer?.warranty_card_document, category: 'Certification', type: 'document' },
        ];
        categories.push({
            name: 'Certification & Warranty',
            icon: <FileText className="w-5 h-5" />,
            documents: certDocs
        });

        // Installation Site & Equipment Images
        const imageDocs: DocumentItem[] = [
            { name: 'Solar Panels Images', url: customer?.solar_panels_images_url, category: 'Images', type: 'image' },
            { name: 'Inverter Image', url: customer?.inverter_image_url, category: 'Images', type: 'image' },
            { name: 'Logger Image', url: customer?.logger_image_url, category: 'Images', type: 'image' },
        ];
        categories.push({
            name: 'Installation Site & Equipment',
            icon: <FileText className="w-5 h-5" />,
            documents: imageDocs
        });

        // Commissioning & Compliance Documents
        const commissionDocs: DocumentItem[] = [
            { name: 'Pay Bill Document', url: customer?.paybill_document, category: 'Commissioning', type: 'document' },
            { name: 'DCR Document', url: customer?.dcr_document, category: 'Commissioning', type: 'document' },
            { name: 'Commissioning Document', url: customer?.commissioning_document, category: 'Commissioning', type: 'document' },
        ];
        categories.push({
            name: 'Commissioning & Compliance',
            icon: <FileText className="w-5 h-5" />,
            documents: commissionDocs
        });

        return categories;
    }, [customer]);

    const availableDocuments = useMemo(() => {
        return documentCategories.flatMap(cat => cat.documents.filter(doc => doc.url));
    }, [documentCategories]);

    const unavailableDocuments = useMemo(() => {
        return documentCategories.flatMap(cat => cat.documents.filter(doc => !doc.url));
    }, [documentCategories]);

    const handleSelectAll = (category: string, available: boolean) => {
        const newSelected = new Set(selectedDocs);
        const docsInCategory = documentCategories
            .find(c => c.name === category)
            ?.documents.filter(d => available ? d.url : !d.url) || [];

        docsInCategory.forEach(doc => {
            const key = `${category}-${doc.name}`;
            if (available) {
                newSelected.add(key);
            } else {
                newSelected.delete(key);
            }
        });
        setSelectedDocs(newSelected);
    };

    const toggleDocument = (category: string, docName: string) => {
        const key = `${category}-${docName}`;
        const newSelected = new Set(selectedDocs);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedDocs(newSelected);
    };

    const downloadSelected = async () => {
        if (selectedDocs.size === 0) {
            alert('Please select at least one document');
            return;
        }

        setIsDownloading(true);
        try {
            // If only one file, download directly
            if (selectedDocs.size === 1) {
                const [key] = Array.from(selectedDocs);
                const [categoryName, docName] = key.split('-').slice(0, 2);
                const doc = documentCategories
                    .find(c => c.name === categoryName)
                    ?.documents.find(d => d.name === docName);

                if (doc?.url) {
                    window.open(doc.url, '_blank');
                }
            } else {
                // For multiple files, create a zip file
                const filesToDownload = Array.from(selectedDocs).map(key => {
                    const [categoryName, ...docNameParts] = key.split('-');
                    const docName = docNameParts.join('-');
                    const doc = documentCategories
                        .find(c => c.name === categoryName)
                        ?.documents.find(d => d.name === docName);
                    return doc;
                }).filter(Boolean) as DocumentItem[];

                // Open all documents in new tabs
                filesToDownload.forEach(doc => {
                    if (doc.url) {
                        window.open(doc.url, '_blank');
                    }
                });
            }
        } finally {
            setIsDownloading(false);
        }
    };

    const downloadCompleteApplication = async () => {
        try {
            // Dynamic import for html2pdf with type suppression
            // @ts-ignore - html2pdf.js doesn't have TypeScript types, but works at runtime
            const html2pdf = (await import('html2pdf.js')).default;

            // Create HTML content for PDF
            const htmlContent = `
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; }
                        .container { padding: 40px; max-width: 900px; margin: 0 auto; }
                        .header { 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white; 
                            padding: 30px; 
                            border-radius: 10px;
                            margin-bottom: 30px;
                            text-align: center;
                        }
                        .header h1 { font-size: 28px; margin-bottom: 10px; }
                        .header p { font-size: 14px; opacity: 0.9; }
                        
                        .section { 
                            margin-bottom: 25px; 
                            background: #f8f9fa; 
                            padding: 20px; 
                            border-radius: 8px;
                            border-left: 4px solid #667eea;
                        }
                        .section-title { 
                            font-size: 16px; 
                            font-weight: bold; 
                            color: #667eea; 
                            margin-bottom: 15px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                        .info-item { background: white; padding: 12px; border-radius: 5px; }
                        .info-label { font-size: 12px; color: #999; text-transform: uppercase; }
                        .info-value { font-size: 14px; color: #333; font-weight: 600; margin-top: 5px; word-break: break-word; }
                        
                        .document-list { margin-top: 10px; }
                        .document-item { 
                            background: white; 
                            padding: 10px; 
                            margin: 8px 0; 
                            border-radius: 5px;
                            border-left: 3px solid #667eea;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .document-name { font-weight: 500; color: #333; }
                        .document-link { 
                            color: #667eea; 
                            text-decoration: none; 
                            font-size: 12px;
                            word-break: break-all;
                        }
                        
                        .footer { 
                            margin-top: 40px; 
                            padding-top: 20px; 
                            border-top: 2px solid #e0e0e0;
                            text-align: center;
                            color: #999;
                            font-size: 12px;
                        }
                        
                        @media print {
                            body { background: white; }
                            .container { padding: 20px; }
                        }
                        
                        .page-break { page-break-before: always; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Solar Plant Application</h1>
                            <p>Complete Application Document</p>
                        </div>

                        <!-- Applicant Information -->
                        <div class="section">
                            <div class="section-title">Applicant Information</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Full Name</div>
                                    <div class="info-value">${customer?.applicant_name || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Mobile Number</div>
                                    <div class="info-value">${customer?.mobile_number || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Email ID</div>
                                    <div class="info-value">${customer?.email_id || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">District</div>
                                    <div class="info-value">${customer?.district || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Solar Plant Details -->
                        <div class="section">
                            <div class="section-title">Solar Plant Details</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Plant Type</div>
                                    <div class="info-value">${customer?.solar_plant_type || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Plant Size (kW)</div>
                                    <div class="info-value">${customer?.plant_size_kw || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Plant Price</div>
                                    <div class="info-value">₹ ${parseFloat(customer?.plant_price || 0).toLocaleString('en-IN')}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Meter Type</div>
                                    <div class="info-value">${customer?.meter_type || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Installation Details -->
                        <div class="section">
                            <div class="section-title">Installation Details</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Site Address</div>
                                    <div class="info-value">${customer?.site_address || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Pincode</div>
                                    <div class="info-value">${customer?.installation_pincode || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Current Load</div>
                                    <div class="info-value">${customer?.current_load || 'N/A'} kW</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Required Load</div>
                                    <div class="info-value">${customer?.required_load || 'N/A'} kW</div>
                                </div>
                            </div>
                        </div>

                        <!-- Finance Details -->
                        <div class="section">
                            <div class="section-title">Finance & Payment</div>
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Payment Mode</div>
                                    <div class="info-value">${customer?.payment_mode || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">UPI Type</div>
                                    <div class="info-value">${customer?.upi_type || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Application Status</div>
                                    <div class="info-value">${customer?.application_status || 'N/A'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Feasible Installation Date</div>
                                    <div class="info-value">${customer?.installation_date_feasible || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        <div class="page-break"></div>

                        <!-- Document Links -->
                        <div class="section">
                            <div class="section-title">Attached Documents & Links</div>
                            ${documentCategories.map(category => {
                const availableDocs = category.documents.filter(d => d.url);
                if (availableDocs.length === 0) return '';

                return `
                                    <div style="margin-bottom: 20px;">
                                        <h3 style="font-size: 14px; color: #667eea; margin-bottom: 10px; font-weight: 600;">${category.name}</h3>
                                        <div class="document-list">
                                            ${availableDocs.map(doc => `
                                                <div class="document-item">
                                                    <span class="document-name">📄 ${doc.name}</span>
                                                    <a href="${doc.url}" class="document-link" target="_blank">View Document →</a>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>

                        <div class="footer">
                            <p>This is an automatically generated document from Datasphere Solar Plant Management System</p>
                            <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            // Generate PDF
            const element = document.createElement('div');
            element.innerHTML = htmlContent;
            const opt: any = {
                margin: 10,
                filename: `Application_${customer.applicant_name}_${customer.id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
            };

            html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback: download as JSON
            const completeData = {
                customer: customer,
                downloadedAt: new Date().toISOString(),
                documentManifest: documentCategories.map(cat => ({
                    category: cat.name,
                    documents: cat.documents
                        .filter(d => d.url)
                        .map(d => ({ name: d.name, url: d.url }))
                }))
            };

            const blob = new Blob([JSON.stringify(completeData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `complete_application_${customer.applicant_name}_${customer.id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-blue px-6 py-6 flex items-center justify-between sticky top-0 z-10 shadow-lg">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Document Manager</h2>
                        <p className="text-blue-100 text-sm mt-2">📋 {customer.applicant_name} • 📱 {customer.mobile_number}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-white hover:scale-110"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Content - Scrollable Area */}
                <div className="overflow-y-auto flex-1 px-6 py-6 bg-gradient-to-b from-gray-50 to-white">
                    {/* Download Options */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Download className="w-6 h-6 text-blue-600" />
                            Download Options
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={downloadCompleteApplication}
                                className="group p-5 border-2 border-blue-400 rounded-xl hover:bg-blue-50 hover:border-blue-600 transition-all duration-300 text-left shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                        <FileJson className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-base">Complete Application</p>
                                        <p className="text-sm text-gray-600 mt-1">Download as PDF with all data and linked documents</p>
                                    </div>
                                </div>
                            </button>

                            <div className="p-5 border-2 border-green-400 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-base">Select & Download</p>
                                        <p className="text-sm text-gray-600 mt-1">Choose specific documents to download individually</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Available Documents Section */}
                    {availableDocuments.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Available Documents</h3>
                                <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    {availableDocuments.length}
                                </span>
                            </div>

                            <div className="space-y-5">
                                {documentCategories.map(category => {
                                    const availableInCategory = category.documents.filter(d => d.url);
                                    if (availableInCategory.length === 0) return null;

                                    return (
                                        <div key={category.name} className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                        {category.icon}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{category.name}</h4>
                                                        <p className="text-xs text-gray-500 mt-1">{availableInCategory.length} document(s)</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleSelectAll(category.name, true)}
                                                    className="text-sm px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                                                >
                                                    ✓ Select All
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {availableInCategory.map(doc => {
                                                    const key = `${category.name}-${doc.name}`;
                                                    const isSelected = selectedDocs.has(key);
                                                    return (
                                                        <div
                                                            key={key}
                                                            className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${isSelected
                                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                                                }`}
                                                            onClick={() => toggleDocument(category.name, doc.name)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleDocument(category.name, doc.name)}
                                                                    className="mt-1 w-5 h-5 cursor-pointer accent-blue-600"
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-gray-800 text-sm truncate">{doc.name}</p>
                                                                    <div className="flex items-center gap-2 mt-3">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (doc.url) {
                                                                                    setPreviewUrl(doc.url);
                                                                                    setPreviewTitle(doc.name);
                                                                                }
                                                                            }}
                                                                            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 font-medium"
                                                                        >
                                                                            <Eye size={14} /> Preview
                                                                        </button>
                                                                        <a
                                                                            href={doc.url || '#'}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 font-medium"
                                                                        >
                                                                            <Download size={14} /> Download
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Unavailable Documents Section */}
                    {unavailableDocuments.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Not Available</h3>
                                <span className="ml-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                                    {unavailableDocuments.length}
                                </span>
                            </div>

                            <div className="space-y-5">
                                {documentCategories.map(category => {
                                    const unavailableInCategory = category.documents.filter(d => !d.url);
                                    if (unavailableInCategory.length === 0) return null;

                                    return (
                                        <div key={category.name} className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-5">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                                                    {category.icon}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800">{category.name}</h4>
                                                    <p className="text-xs text-gray-500 mt-1">{unavailableInCategory.length} document(s)</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {unavailableInCategory.map(doc => (
                                                    <div key={`${category.name}-${doc.name}`} className="p-4 border-2 border-orange-200 rounded-lg bg-white/60">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-gray-400 mt-1">○</span>
                                                            <div>
                                                                <p className="font-semibold text-gray-500 text-sm">{doc.name}</p>
                                                                <p className="text-xs text-orange-600 mt-1.5 font-medium">⏳ Awaiting Upload</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t-2 border-gray-200 bg-gray-100 px-6 py-5 flex items-center justify-between sticky bottom-0 shadow-lg">
                    <p className="text-sm font-medium text-gray-700">
                        {selectedDocs.size > 0 ? (
                            <span>✓ <strong>{selectedDocs.size}</strong> document(s) selected</span>
                        ) : (
                            <span className="text-gray-500">No documents selected</span>
                        )}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-200 transition-all duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={downloadSelected}
                            disabled={selectedDocs.size === 0 || isDownloading}
                            className={`px-6 py-2.5 rounded-lg text-white font-semibold flex items-center gap-2 transition-all duration-200 ${selectedDocs.size === 0 || isDownloading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                                }`}
                        >
                            <Download size={18} />
                            {isDownloading ? 'Downloading...' : `Download (${selectedDocs.size})`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
                    onClick={() => setPreviewUrl(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[85vh] overflow-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between sticky top-0">
                            <p className="text-white font-bold">{previewTitle}</p>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            {previewUrl.endsWith('.pdf') || previewUrl.includes('pdf') ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-96"
                                    title={previewTitle}
                                />
                            ) : (
                                <img src={previewUrl} alt={previewTitle} className="max-w-full h-auto rounded-lg" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentDownloadModal;
