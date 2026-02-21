import React from 'react';
import { AlertCircle, Edit2, X, Upload, Check } from 'lucide-react';
import RegisterCustomerForm from '../register/RegisterCustomerForm';
import { transactionLogsAPI, additionalDocumentsAPI } from '../../services/api';

const getAdditionalDocUrl = (customer: any, key: string): string => {
    return customer?.additional_documents?.[key] || customer?.[key] || '';
};

const getFileTypeFromUrl = (url: string) => {
    if (!url) return 'unknown';
    const ext = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'document';
};

const API_BASE = import.meta.env.VITE_API_BASE;

const getFullFileUrl = (url: string): string => {
    if (!url) return '';
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    // Remove leading slash if present
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

    // Use VITE_API_ORIGIN for file URLs (not VITE_API_BASE which includes /api)
    const baseUrl = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
    return `${baseUrl}/${cleanUrl}`;
};

interface WorkTypeDetailsProps {
    task: any;
    customer: any;
}

// Default component for unmapped work types
export const WorkTypeDetails: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer: _customer }) => {
    return (
        <div className="flex items-start gap-3 bg-yellow/5 border border-yellow/20 rounded-lg p-3">
            <AlertCircle size={20} className="text-yellow flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-1">Additional Details</p>
                <p className="text-sm text-text">No additional details available for this work type.</p>
            </div>
        </div>
    );
};

// Customer Data Gathering Component
export const CustomerDataGathering: React.FC<WorkTypeDetailsProps> = ({ task, customer }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleOpenForm = () => {
        setIsModalOpen(true);
    };

    const handleCloseForm = () => {
        setIsModalOpen(false);
    };

    // Get sales executive name and id from task assignment
    const salesExecutiveName = task?.assigned_to_name || 'Unknown';
    const salesExecutiveId = task?.assigned_to_id || '';

    return (
        <>
            {/* Open Form Button Section */}
            <div className="flex items-start gap-3 bg-blue border border-indigo/20 rounded-lg p-3">
                <button
                    onClick={handleOpenForm}
                    className="flex text-black items-center gap-2 px-4 py-2.5 bg-indigo text-white rounded-lg font-semibold hover:bg-indigo/90 transition-colors w-full sm:w-auto justify-center"
                >
                    <Edit2 size={16} />
                    Open Form
                </button>
            </div>

            {/* Modal with Registration Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-text/40 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-panel rounded-xl shadow-2xl w-full max-w-2xl my-8">
                        {/* Modal Header */}
                        <div className="bg-blue px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-white">Edit Application Details</h2>
                            <button
                                onClick={handleCloseForm}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <RegisterCustomerForm
                                session={{
                                    employeeId: salesExecutiveId,
                                    name: salesExecutiveName
                                }}
                                preFilledData={customer}
                                onSuccess={handleCloseForm}
                                onCancel={handleCloseForm}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Fallback simple display (if needed elsewhere)
// Payment Collection Component
export const PaymentCollection: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [paidAmount, setPaidAmount] = React.useState('');
    const [proofFile, setProofFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const remainingAmount = (customer?.plant_price || 0) - (customer?.transaction_information?.paid_amount || 0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (!paidAmount || parseFloat(paidAmount) <= 0) {
            setMessage('Please enter a valid amount');
            return;
        }

        if (!proofFile) {
            setMessage('Please upload payment proof');
            return;
        }

        if (parseFloat(paidAmount) > remainingAmount) {
            setMessage(`Amount cannot exceed remaining amount (₹${remainingAmount.toLocaleString()})`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setMessage('Authentication required. Please login.');
                return;
            }

            const result = await transactionLogsAPI.recordPayment(
                customer?.id,
                paidAmount,
                proofFile,
                token
            );

            if (result.success) {
                setMessage('Payment recorded successfully!');
                setPaidAmount('');
                setProofFile(null);
                setPreviewUrl('');
                setTimeout(() => {
                    setIsFormOpen(false);
                    setMessage('');
                    window.location.reload();
                }, 1500);
            } else {
                setMessage(result.message || 'Failed to record payment');
            }
        } catch (error: any) {
            setMessage(error.message || 'Error submitting payment. Please try again.');
            console.error('Payment submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Payment Summary */}
            <div className="flex items-start gap-3 bg-green/5 border border-green/20 rounded-lg p-3 flex-shrink-0">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted uppercase mb-2">Payment Information</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Plant Price:</span>
                            <span className="text-right">₹{customer?.plant_price?.toLocaleString() || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-semibold">Paid Amount:</span>
                            <span className="text-right text-green-600 font-semibold">₹{customer?.transaction_information?.paid_amount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-green/20">
                            <span className="font-semibold text-orange">Remaining:</span>
                            <span className="text-right text-orange font-bold">₹{remainingAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Form */}
            {!isFormOpen ? (
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full text-black  px-4 py-2.5 bg-green rounded-lg font-semibold hover:bg-green/90 transition-colors text-sm flex-shrink-0"
                >
                    + Record Payment
                </button>
            ) : (
                <div className="bg-green/5 border border-green/20 rounded-lg p-3 space-y-3 flex-shrink-0">
                    <p className="text-xs font-semibold text-muted uppercase">Record New Payment</p>

                    {/* Amount and File Upload in a row */}
                    <div className="flex gap-4">
                        {/* Amount Input */}
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">
                                Amount to Pay (₹)
                            </label>
                            <input
                                type="number"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                max={remainingAmount}
                                step="0.01"
                                placeholder="Enter amount"
                                className="w-full border border-green/30 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green outline-none"
                            />
                            <p className="text-xs text-muted mt-1">Max: ₹{remainingAmount.toLocaleString()}</p>
                        </div>

                        {/* File Upload */}
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-muted uppercase mb-1">
                                Payment Proof
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="w-full border border-green/30 rounded-lg px-3 py-2 text-xs"
                            />
                            {previewUrl && (
                                <div className="mt-2 overflow-hidden rounded-lg">
                                    <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message */}
                    {message && (
                        <p className={`text-xs font-semibold px-2 py-1 rounded ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? '⏳ Saving...' : '✓ Save'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsFormOpen(false);
                                setPaidAmount('');
                                setProofFile(null);
                                setPreviewUrl('');
                                setMessage('');
                            }}
                            className="flex-1 px-3 py-2 border border-green-600 text-slate-700 bg-white rounded-lg font-semibold hover:bg-green-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Customer Data Gathering Component
export const FinanceRegistration: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [quotationFile, setQuotationFile] = React.useState<File | null>(null);
    const [approvalFile, setApprovalFile] = React.useState<File | null>(null);
    const [quotationPreview, setQuotationPreview] = React.useState<string>('');
    const [approvalPreview, setApprovalPreview] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    const existingQuotationUrl = getAdditionalDocUrl(customer, 'finance_quotation_document');
    const existingApprovalUrl = getAdditionalDocUrl(customer, 'finance_digital_approval');

    const handleQuotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setQuotationFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setQuotationPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setQuotationPreview('');
            }
        }
    };

    const handleApprovalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setApprovalFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setApprovalPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setApprovalPreview('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!quotationFile || !approvalFile) {
            setMessage('Both documents are required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('auth_token') || '';
            await additionalDocumentsAPI.uploadFinanceDocuments(
                customer.id,
                quotationFile,
                approvalFile,
                token
            );
            setMessage('Documents uploaded successfully');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload documents');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePreview = (url: string, title: string) => {
        setPreviewUrl(getFullFileUrl(url));
        setPreviewTitle(title);
    };

    const closePreview = () => {
        setPreviewUrl('');
        setPreviewTitle('');
    };

    return (
        <div className="max-h-[500px] overflow-y-auto bg-blue/5 border border-blue/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-text mb-4">Finance Documents Upload</h3>

            <div className="space-y-4">
                {(existingQuotationUrl || existingApprovalUrl) && (
                    <div className="bg-white/60 rounded-lg p-3 border border-blue/10">
                        <p className="text-xs font-semibold text-muted uppercase mb-2">Already Uploaded</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {existingQuotationUrl && (
                                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg">{getFileTypeFromUrl(existingQuotationUrl) === 'image' ? '🖼️' : '📄'}</span>
                                        <span className="text-xs font-medium text-slate-700 truncate">Finance Quotation</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handlePreview(existingQuotationUrl, 'Finance Quotation')}
                                            className="flex-shrink-0 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Preview"
                                        >
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <a
                                            href={getFullFileUrl(existingQuotationUrl)}
                                            download={`${customer?.applicant_name?.replace(/\s+/g, '_') || 'customer'}_finance_quotation.${existingQuotationUrl.split('.').pop()}`}
                                            className="flex-shrink-0 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            )}
                            {existingApprovalUrl && (
                                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-lg">{getFileTypeFromUrl(existingApprovalUrl) === 'image' ? '🖼️' : '📄'}</span>
                                        <span className="text-xs font-medium text-slate-700 truncate">Digital Approval</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handlePreview(existingApprovalUrl, 'Digital Approval')}
                                            className="flex-shrink-0 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Preview"
                                        >
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        <a
                                            href={getFullFileUrl(existingApprovalUrl)}
                                            download={`${customer?.applicant_name?.replace(/\s+/g, '_') || 'customer'}_digital_approval.${existingApprovalUrl.split('.').pop()}`}
                                            className="flex-shrink-0 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Submit Quotation */}
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        Submit Quotation
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleQuotationChange}
                        className="w-full border border-blue/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {quotationFile && (
                        <div className="mt-2">
                            {quotationPreview ? (
                                <div className="overflow-hidden rounded-lg">
                                    <img src={quotationPreview} alt="Quotation Preview" className="h-24 w-24 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {quotationFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Digital Approval */}
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        Digital Approval
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleApprovalChange}
                        className="w-full border border-blue/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {approvalFile && (
                        <div className="mt-2">
                            {approvalPreview ? (
                                <div className="overflow-hidden rounded-lg">
                                    <img src={approvalPreview} alt="Approval Preview" className="h-24 w-24 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {approvalFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {message}
                    </p>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !quotationFile || !approvalFile}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-dark text-white rounded-lg font-semibold hover:bg-blue-dark/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                    <Upload size={16} />
                    {isSubmitting ? 'Uploading...' : 'Submit Documents'}
                </button>
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-blue-500 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={closePreview}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            {getFileTypeFromUrl(previewUrl) === 'image' ? (
                                <img
                                    src={previewUrl}
                                    alt={previewTitle}
                                    className="max-w-full h-auto rounded-lg"
                                />
                            ) : getFileTypeFromUrl(previewUrl) === 'pdf' ? (
                                <div className="relative w-full h-[70vh]">
                                    <iframe
                                        src={`${previewUrl}#toolbar=0`}
                                        className="w-full h-full rounded-lg border-0"
                                        title={previewTitle}
                                        onError={() => {
                                            console.error('Failed to load PDF');
                                        }}
                                    />
                                    <div className="mt-2 text-center">
                                        <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:text-blue-700 underline"
                                        >
                                            Open PDF in New Tab
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted mb-4">Cannot preview this file type</p>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const RegistrationComplete: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [applicationFormFile, setApplicationFormFile] = React.useState<File | null>(null);
    const [feasibilityFormFile, setFeasibilityFormFile] = React.useState<File | null>(null);
    const [etokenDocumentFile, setEtokenDocumentFile] = React.useState<File | null>(null);
    const [netMeteringDocumentFile, setNetMeteringDocumentFile] = React.useState<File | null>(null);

    const [applicationFormPreview, setApplicationFormPreview] = React.useState<string>('');
    const [feasibilityFormPreview, setFeasibilityFormPreview] = React.useState<string>('');
    const [etokenDocumentPreview, setEtokenDocumentPreview] = React.useState<string>('');
    const [netMeteringDocumentPreview, setNetMeteringDocumentPreview] = React.useState<string>('');

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const existingApplicationFormUrl = getAdditionalDocUrl(customer, 'application_form');
    const existingFeasibilityFormUrl = getAdditionalDocUrl(customer, 'feasibility_form');
    const existingEtokenDocumentUrl = getAdditionalDocUrl(customer, 'etoken_document');
    const existingNetMeteringDocumentUrl = getAdditionalDocUrl(customer, 'net_metering_document');

    const handleFileChange = (
        file: File,
        setFile: (file: File | null) => void,
        setPreview: (preview: string) => void
    ) => {
        setFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview('');
        }
    };

    const handleSubmit = async () => {
        if (!applicationFormFile || !feasibilityFormFile || !etokenDocumentFile || !netMeteringDocumentFile) {
            setMessage('All 4 documents are required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('auth_token') || '';
            await additionalDocumentsAPI.uploadRegistrationDocuments(
                customer.id,
                applicationFormFile,
                feasibilityFormFile,
                etokenDocumentFile,
                netMeteringDocumentFile,
                token
            );
            setMessage('Documents uploaded successfully');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload documents');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            // Build the download URL — append ?download=true to force Content-Disposition: attachment from backend
            let fullUrl = getFullFileUrl(url);

            // Extract the /uploads/... path from the full URL to rebuild it via our own backend
            const uploadsMatch = fullUrl.match(/\/uploads\/.+/);
            if (uploadsMatch) {
                // Route through our own backend origin with ?download=true to force attachment headers
                const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000';
                const uploadPath = uploadsMatch[0].split('?')[0]; // clean path without query params
                fullUrl = `${apiOrigin}${uploadPath}?download=true`;
            }

            console.log('Downloading from:', fullUrl);

            const response = await fetch(fullUrl, {
                method: 'GET',
                cache: 'no-cache',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();

            // Ensure filename has an extension
            let finalFilename = filename;
            if (!finalFilename.includes('.')) {
                const urlPath = url.split('?')[0];
                const urlExt = urlPath.split('.').pop()?.toLowerCase();
                if (urlExt && urlExt.length <= 5) {
                    finalFilename = `${filename}.${urlExt}`;
                }
            }

            // Force octet-stream MIME to guarantee download behavior
            const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
            const blobUrl = window.URL.createObjectURL(downloadBlob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = finalFilename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 200);
        } catch (error) {
            console.error('Download failed:', error);
            // Last resort fallback — open in new tab (at least user can right-click > Save As)
            const fullUrl = getFullFileUrl(url);
            window.open(fullUrl, '_blank');
        }
    };

    const getFileType = (url: string) => {
        if (!url) return 'unknown';
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        return 'document';
    };

    const documentFields = [
        { label: 'Aadhaar Front', url: customer?.aadhaar_front_url },
        { label: 'Aadhaar Back', url: customer?.aadhaar_back_url },
        { label: 'PAN Card', url: customer?.pan_card_url },
        { label: 'Electric Bill', url: customer?.electric_bill_url },
        { label: 'Ceiling Paper Photo', url: customer?.ceiling_paper_photo_url },
        { label: 'Cancel Cheque / Passbook', url: customer?.cancel_cheque_url },
        { label: 'Site Image with GPS Geo Location', url: customer?.site_image_gps_url },
        { label: 'COT Death Certificate', url: customer?.cot_death_certificate_url },
        { label: 'COT House Papers', url: customer?.cot_house_papers_url },
        { label: 'COT Passport Photo', url: customer?.cot_passport_photo_url },
        { label: 'COT Family Registration', url: customer?.cot_family_registration_url },
        { label: 'COT Live Aadhaar 1', url: customer?.cot_live_aadhaar_1_url },
        { label: 'COT Live Aadhaar 2', url: customer?.cot_live_aadhaar_2_url },
        { label: 'Application Form', url: existingApplicationFormUrl },
        { label: 'Feasibility Form', url: existingFeasibilityFormUrl },
        { label: 'E-Token Document', url: existingEtokenDocumentUrl },
        { label: 'Net Metering Document', url: existingNetMeteringDocumentUrl },
    ].filter(doc => doc.url);

    // Parse aadhaar photos URLs if available
    const aadhaarPhotosUrls = React.useMemo(() => {
        try {
            return customer?.cot_aadhaar_photos_urls ? JSON.parse(customer.cot_aadhaar_photos_urls) : [];
        } catch {
            return [];
        }
    }, [customer?.cot_aadhaar_photos_urls]);

    const renderFileInput = (
        label: string,
        file: File | null,
        preview: string,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    ) => (
        <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-2">
                {label}
            </label>
            <input
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={onChange}
                className="w-full border border-blue/30 rounded-lg px-3 py-2 text-sm"
            />
            {file && (
                <div className="mt-2">
                    {preview ? (
                        <div className="overflow-hidden rounded-lg">
                            <img src={preview} alt={`${label} Preview`} className="h-20 w-20 object-cover" />
                        </div>
                    ) : (
                        <p className="text-xs text-muted flex items-center gap-1">
                            <span>📄</span> {file.name}
                        </p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="max-h-[500px] overflow-y-auto bg-blue/5 border border-blue/20 rounded-lg p-4 space-y-4">
            {/* Existing Documents Section */}
            {(documentFields.length > 0 || aadhaarPhotosUrls.length > 0) && (
                <div className="bg-white/50 rounded-lg p-3 border border-blue/10">
                    <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                        <span>📁</span> Uploaded Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {documentFields.map((doc, index) => {
                            const fileType = getFileType(doc.url!);
                            return (
                                <div key={index} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-lg flex-shrink-0">
                                            {fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📄' : '📎'}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700 truncate">{doc.label}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc.url!, `${customer?.applicant_name?.replace(/\s+/g, '_') || 'customer'}_${doc.label.toLowerCase().replace(/\s+/g, '_')}.${doc.url!.split('.').pop()}`)}
                                        className="flex-shrink-0 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                        {aadhaarPhotosUrls.map((url: string, index: number) => {
                            const fileType = getFileType(url);
                            return (
                                <div key={`aadhaar-${index}`} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-lg flex-shrink-0">
                                            {fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📄' : '📎'}
                                        </span>
                                        <span className="text-xs font-medium text-slate-700 truncate">COT Aadhaar Photo {index + 1}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(url, `${customer?.applicant_name?.replace(/\s+/g, '_') || 'customer'}_cot_aadhaar_photo_${index + 1}.${url.split('.').pop()}`)}
                                        className="flex-shrink-0 p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                        title="Download"
                                    >
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upload New Documents Section */}
            <div>
                <h3 className="text-sm font-bold text-text mb-4">Registration Documents Upload</h3>

                <div className="space-y-4">
                    {/* Application Form */}
                    {renderFileInput(
                        'Application Form',
                        applicationFormFile,
                        applicationFormPreview,
                        (e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(file, setApplicationFormFile, setApplicationFormPreview);
                        }
                    )}

                    {/* Feasibility Form */}
                    {renderFileInput(
                        'Feasibility Form',
                        feasibilityFormFile,
                        feasibilityFormPreview,
                        (e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(file, setFeasibilityFormFile, setFeasibilityFormPreview);
                        }
                    )}

                    {/* E-Token Document */}
                    {renderFileInput(
                        'E-Token Document',
                        etokenDocumentFile,
                        etokenDocumentPreview,
                        (e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(file, setEtokenDocumentFile, setEtokenDocumentPreview);
                        }
                    )}

                    {/* Net Metering Document */}
                    {renderFileInput(
                        'Net Metering Document',
                        netMeteringDocumentFile,
                        netMeteringDocumentPreview,
                        (e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(file, setNetMeteringDocumentFile, setNetMeteringDocumentPreview);
                        }
                    )}

                    {/* Message */}
                    {message && (
                        <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
                            {message}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !applicationFormFile || !feasibilityFormFile || !etokenDocumentFile || !netMeteringDocumentFile}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-dark text-white rounded-lg font-semibold hover:bg-blue-dark/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                    >
                        <Upload size={16} />
                        {isSubmitting ? 'Uploading...' : 'Submit All Documents'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Plant Installation Component
export const PlantInstallation: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [numTechnicians, setNumTechnicians] = React.useState(1);
    const [numTechnicalAssistants, setNumTechnicalAssistants] = React.useState(1);
    const [technicians, setTechnicians] = React.useState<Array<{ type: 'internal' | 'external', employeeId?: number, name?: string }>>([{ type: 'internal' }]);
    const [technicalAssistants, setTechnicalAssistants] = React.useState<Array<{ employeeId?: number }>>([{}]);
    const [installationDate, setInstallationDate] = React.useState('');
    const [photoTakerId, setPhotoTakerId] = React.useState<number | ''>('');
    const [technicianEmployees, setTechnicianEmployees] = React.useState<Array<{ id: number, name: string }>>([]);
    const [technicalAssistantEmployees, setTechnicalAssistantEmployees] = React.useState<Array<{ id: number, name: string }>>([]);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    // Fetch technician and technical assistant employees
    React.useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const token = localStorage.getItem('auth_token');

                // Fetch Technicians
                const techResponse = await fetch(`${API_BASE}/employees?role=Technician`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const techData = await techResponse.json();
                if (techData.data) {
                    setTechnicianEmployees(techData.data.map((emp: any) => ({ id: emp.id, name: emp.name })));
                }

                // Fetch Technical Assistants
                const assistantResponse = await fetch(`${API_BASE}/employees?role=Technical Assistant`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const assistantData = await assistantResponse.json();
                if (assistantData.data) {
                    setTechnicalAssistantEmployees(assistantData.data.map((emp: any) => ({ id: emp.id, name: emp.name })));
                }
            } catch (error) {
                console.error('Error fetching employees:', error);
            }
        };
        if (isFormOpen) fetchEmployees();
    }, [isFormOpen]);

    const handleNumTechniciansChange = (num: number) => {
        const newNum = Math.max(0, Math.min(10, num));
        setNumTechnicians(newNum);
        const newTechnicians = Array(newNum).fill(null).map((_, i) =>
            technicians[i] || { type: 'internal' as const }
        );
        setTechnicians(newTechnicians);
    };

    const handleNumTechnicalAssistantsChange = (num: number) => {
        const newNum = Math.max(0, Math.min(10, num));
        setNumTechnicalAssistants(newNum);
        const newAssistants = Array(newNum).fill(null).map((_, i) =>
            technicalAssistants[i] || {}
        );
        setTechnicalAssistants(newAssistants);
    };

    const updateTechnician = (index: number, field: string, value: any) => {
        const updated = [...technicians];
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'type') {
            // Reset fields when type changes
            if (value === 'internal') {
                delete updated[index].name;
            } else {
                delete updated[index].employeeId;
            }
        }
        setTechnicians(updated);
    };

    const updateTechnicalAssistant = (index: number, employeeId: number) => {
        const updated = [...technicalAssistants];
        updated[index] = { employeeId };
        setTechnicalAssistants(updated);
    };

    // Get available photo takers - only selected internal technicians and technical assistants
    const availablePhotoTakers = React.useMemo(() => {
        const selectedTechnicianIds = technicians
            .filter(t => t.type === 'internal' && t.employeeId)
            .map(t => t.employeeId as number);

        const selectedAssistantIds = technicalAssistants
            .filter(a => a.employeeId)
            .map(a => a.employeeId as number);

        const allSelectedIds = [...selectedTechnicianIds, ...selectedAssistantIds];

        // Filter employees to only show selected ones
        const selectedTechnicians = technicianEmployees.filter(emp =>
            allSelectedIds.includes(emp.id)
        );
        const selectedAssistants = technicalAssistantEmployees.filter(emp =>
            allSelectedIds.includes(emp.id)
        );

        return [...selectedTechnicians, ...selectedAssistants];
    }, [technicians, technicalAssistants, technicianEmployees, technicalAssistantEmployees]);

    const handleSubmit = async () => {
        if (!installationDate) {
            setMessage('Installation date is required');
            return;
        }

        if (!photoTakerId) {
            setMessage('Photo taker must be selected');
            return;
        }

        // Validate technicians
        for (let i = 0; i < technicians.length; i++) {
            const tech = technicians[i];
            if (tech.type === 'internal' && !tech.employeeId) {
                setMessage(`Please select employee for technician ${i + 1}`);
                return;
            }
            if (tech.type === 'external' && !tech.name) {
                setMessage(`Please provide name for external technician ${i + 1}`);
                return;
            }
        }

        // Validate technical assistants
        for (let i = 0; i < technicalAssistants.length; i++) {
            if (!technicalAssistants[i].employeeId) {
                setMessage(`Please select technical assistant ${i + 1}`);
                return;
            }
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('auth_token');

            // Separate internal and external technicians
            const internalTechs = technicians
                .filter(t => t.type === 'internal')
                .map(t => t.employeeId);
            const externalTechs = technicians
                .filter(t => t.type === 'external')
                .map(t => ({ name: t.name }));

            const assistantIds = technicalAssistants.map(a => a.employeeId);

            const response = await fetch(`${API_BASE}/plant-installation-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    registered_customer_id: customer?.id,
                    date_of_installation: installationDate,
                    internal_technician: JSON.stringify(internalTechs),
                    external_technician: JSON.stringify(externalTechs),
                    technical_assistant_ids: JSON.stringify(assistantIds),
                    photo_taker_employee_id: photoTakerId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save plant installation details');
            }

            setMessage('Plant installation details saved successfully!');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage(error.message || 'Error saving details');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-h-[600px] overflow-y-auto bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-5 shadow-sm">
            {/* Plant Details Header */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-purple-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs sm:text-sm">⚡</span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-purple-900 uppercase tracking-wide">Plant Details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Plant Type</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.solar_plant_type || '-'}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">System Type</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.solar_system_type || '-'}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Capacity</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.plant_size_kw || '-'} kW</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Category</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.plant_category || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Building/Structure Details */}
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-purple-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-xs sm:text-sm">🏢</span>
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold text-purple-900 uppercase tracking-wide">Building/Structure Details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-sm">
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Floor Number</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.building_floor_number || '-'}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Structure Type</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.structure_type || '-'}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 sm:p-2.5">
                        <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mb-1">Free Shadow Area</p>
                        <p className="font-semibold text-gray-800 text-xs sm:text-sm">{customer?.free_shadow_area || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Installation Form */}
            {!isFormOpen ? (
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full text-white px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-xs sm:text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    <span className="text-base sm:text-lg mr-2">+</span> Record Installation Details
                </button>
            ) : (
                <div className="bg-white rounded-xl p-3 sm:p-5 border border-purple-200 shadow-sm space-y-3 sm:space-y-5">
                    <h4 className="text-sm sm:text-base font-bold text-purple-900 flex items-center gap-2">
                        <span className="text-purple-600">📋</span> Installation Details Form
                    </h4>

                    {/* Installation Date */}
                    <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                        <label className="block text-[10px] sm:text-xs font-bold text-purple-900 uppercase tracking-wide mb-2">
                            Installation Date *
                        </label>
                        <input
                            type="date"
                            value={installationDate}
                            onChange={(e) => setInstallationDate(e.target.value)}
                            className="w-full border-2 border-purple-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                        />
                    </div>

                    {/* Technicians Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 sm:p-4 border border-blue-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                            <label className="text-[10px] sm:text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-2">
                                <span className="text-blue-600">👷</span> Technicians
                            </label>
                            <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-blue-200 self-start sm:self-auto">
                                <button
                                    onClick={() => handleNumTechniciansChange(numTechnicians - 1)}
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold transition-colors flex items-center justify-center text-sm sm:text-base"
                                    disabled={numTechnicians <= 0}
                                >
                                    −
                                </button>
                                <span className="text-xs sm:text-sm font-bold text-blue-900 w-6 sm:w-8 text-center">{numTechnicians}</span>
                                <button
                                    onClick={() => handleNumTechniciansChange(numTechnicians + 1)}
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold transition-colors flex items-center justify-center text-sm sm:text-base"
                                    disabled={numTechnicians >= 10}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {technicians.length > 0 && (
                            <div className="space-y-2 sm:space-y-3">
                                {technicians.map((tech, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200 shadow-sm space-y-2 sm:space-y-3">
                                        <p className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wide">Technician #{index + 1}</p>

                                        {/* Type Selection */}
                                        <div>
                                            <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-1.5">Type *</label>
                                            <select
                                                value={tech.type}
                                                onChange={(e) => updateTechnician(index, 'type', e.target.value)}
                                                className="w-full border-2 border-blue-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                            >
                                                <option value="internal">Internal Employee</option>
                                                <option value="external">External Contractor</option>
                                            </select>
                                        </div>

                                        {/* Internal - Employee Dropdown */}
                                        {tech.type === 'internal' && (
                                            <div>
                                                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-1.5">Select Employee *</label>
                                                <select
                                                    value={tech.employeeId || ''}
                                                    onChange={(e) => updateTechnician(index, 'employeeId', parseInt(e.target.value))}
                                                    className="w-full border-2 border-blue-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                                >
                                                    <option value="">-- Select Technician --</option>
                                                    {technicianEmployees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* External - Name Only */}
                                        {tech.type === 'external' && (
                                            <div>
                                                <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-1.5">Name *</label>
                                                <input
                                                    type="text"
                                                    value={tech.name || ''}
                                                    onChange={(e) => updateTechnician(index, 'name', e.target.value)}
                                                    placeholder="Enter technician name"
                                                    className="w-full border-2 border-blue-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Technical Assistants Section */}
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-teal-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
                            <label className="text-[10px] sm:text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-2">
                                <span className="text-teal-600">🔧</span> Technical Assistants
                            </label>
                            <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-teal-200 self-start sm:self-auto">
                                <button
                                    onClick={() => handleNumTechnicalAssistantsChange(numTechnicalAssistants - 1)}
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-700 font-bold transition-colors flex items-center justify-center text-sm sm:text-base"
                                    disabled={numTechnicalAssistants <= 0}
                                >
                                    −
                                </button>
                                <span className="text-xs sm:text-sm font-bold text-teal-900 w-6 sm:w-8 text-center">{numTechnicalAssistants}</span>
                                <button
                                    onClick={() => handleNumTechnicalAssistantsChange(numTechnicalAssistants + 1)}
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-700 font-bold transition-colors flex items-center justify-center text-sm sm:text-base"
                                    disabled={numTechnicalAssistants >= 10}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {technicalAssistants.length > 0 && (
                            <div className="space-y-2 sm:space-y-3">
                                {technicalAssistants.map((assistant, index) => (
                                    <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-teal-200 shadow-sm">
                                        <p className="text-[10px] sm:text-xs font-bold text-teal-600 uppercase tracking-wide mb-2 sm:mb-3">Technical Assistant #{index + 1}</p>
                                        <div>
                                            <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1 sm:mb-1.5">Select Employee *</label>
                                            <select
                                                value={assistant.employeeId || ''}
                                                onChange={(e) => updateTechnicalAssistant(index, parseInt(e.target.value))}
                                                className="w-full border-2 border-teal-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                                            >
                                                <option value="">-- Select Technical Assistant --</option>
                                                {technicalAssistantEmployees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Photo Taker */}
                    <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                        <label className="block text-[10px] sm:text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="text-indigo-600">📸</span> Photo Taker (Internal) *
                        </label>
                        <select
                            value={photoTakerId}
                            onChange={(e) => setPhotoTakerId(parseInt(e.target.value))}
                            className="w-full border-2 border-indigo-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                        >
                            <option value="">-- Select Photo Taker --</option>
                            {availablePhotoTakers.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                        {availablePhotoTakers.length === 0 && (
                            <p className="text-[10px] sm:text-xs text-amber-600 mt-2">
                                ⚠️ Please select technicians or technical assistants first
                            </p>
                        )}
                    </div>

                    {/* Message */}
                    {message && (
                        <div className={`rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold ${message.includes('successfully')
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                            {message}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {isSubmitting ? '⏳ Saving...' : '✓ Save Installation Details'}
                        </button>
                        <button
                            onClick={() => {
                                setIsFormOpen(false);
                                setMessage('');
                            }}
                            className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 border-2 border-purple-300 text-purple-700 bg-white rounded-lg font-bold hover:bg-purple-50 transition-all duration-200 text-xs sm:text-sm shadow-sm hover:shadow-md"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// COT Request Component
export const COTRequest: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-orange/5 border border-orange/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">COT Request Details</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">COT Required:</span> {customer?.cot_required ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">COT Type:</span> {customer?.cot_type || '-'}</p>
                    <p><span className="font-semibold">Documents:</span> {customer?.cot_documents || 'Not specified'}</p>
                </div>
            </div>
        </div>
    );
};

// Load Request Component
export const LoadRequest: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-cyan/5 border border-cyan/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">Load Enhancement Details</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Load Enhancement Required:</span> {customer?.load_enhancement_required ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">Current Load:</span> {customer?.current_load || '-'} kW</p>
                    <p><span className="font-semibold">Required Load:</span> {customer?.required_load || '-'} kW</p>
                </div>
            </div>
        </div>
    );
};

// Name Correction Request Component
export const NameCorrectionRequest: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-indigo/5 border border-indigo/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">Name Correction</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Name Correction Required:</span> {customer?.name_correction_required ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">Original Name:</span> {customer?.applicant_name || '-'}</p>
                    <p><span className="font-semibold">Correct Name:</span> {customer?.correct_name || '-'}</p>
                </div>
            </div>
        </div>
    );
};

// Hard Copy Indent Creation Task
export const CreateHardCopyIndentCreation: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const existingIndentUrl = getAdditionalDocUrl(customer, 'indent_document');
    const [indentDocumentFile, setIndentDocumentFile] = React.useState<File | null>(null);
    const [indentDocumentPreview, setIndentDocumentPreview] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleIndentDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIndentDocumentFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setIndentDocumentPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setIndentDocumentPreview('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!indentDocumentFile) {
            setMessage('Indent document is required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('auth_token') || '';
            const formData = new FormData();
            formData.append('indent_document', indentDocumentFile);

            const response = await fetch(`${API_BASE}/additional-documents/${customer.id}/indent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload indent document');
            }

            setMessage('Indent document uploaded successfully');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload document');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-h-[300px] overflow-y-auto bg-indigo/5 border border-indigo/20 rounded-lg p-4">
            <h3 className="text-sm font-bold text-text mb-4">Hard Copy Indent Creation</h3>

            <div className="space-y-4">
                {existingIndentUrl && (
                    <div className="bg-white/60 rounded-lg p-3 border border-indigo/10">
                        <p className="text-xs font-semibold text-muted uppercase mb-2">Already Uploaded</p>
                        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg">{getFileTypeFromUrl(existingIndentUrl) === 'image' ? '🖼️' : '📄'}</span>
                                <span className="text-xs font-medium text-slate-700 truncate">Indent Document</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <a
                                    href={getFullFileUrl(existingIndentUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Preview
                                </a>
                                <a
                                    href={getFullFileUrl(existingIndentUrl)}
                                    download
                                    className="text-xs text-green-600 hover:text-green-700"
                                >
                                    Download
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Indent Document Upload */}
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        Indent Document *
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={handleIndentDocumentChange}
                        className="w-full border border-indigo/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {indentDocumentFile && (
                        <div className="mt-2">
                            {indentDocumentPreview ? (
                                <div className="overflow-hidden rounded-lg">
                                    <img src={indentDocumentPreview} alt="Indent Document Preview" className="h-24 w-24 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {indentDocumentFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {message}
                    </p>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !indentDocumentFile}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                    <Upload size={16} />
                    {isSubmitting ? 'Uploading...' : 'Submit Indent Document'}
                </button>
            </div>
        </div>
    );
};

// Inspection Component
export const Inspection: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-teal/5 border border-teal/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">Inspection Details</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Meter Type:</span> {customer?.meter_type || '-'}</p>
                    <p><span className="font-semibold">Installation Feasible:</span> {customer?.installation_date_feasible ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">Application Status:</span> {customer?.application_status || '-'}</p>
                </div>
            </div>
        </div>
    );
};

// Subsidy Application Component
export const SubsidyApplication: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-lime/5 border border-lime/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">Subsidy Information</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Special Finance Required:</span> {customer?.special_finance_required ? 'Yes' : 'No'}</p>
                    <p><span className="font-semibold">Plant Price:</span> ₹{customer?.plant_price?.toLocaleString() || '-'}</p>
                    <p><span className="font-semibold">Plant Category:</span> {customer?.plant_category || '-'}</p>
                </div>
            </div>
        </div>
    );
};

// Generate Payment Bill
export const BillGeneration: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const existingPaybillUrl = getAdditionalDocUrl(customer, 'paybill_document');
    const [paybillDocumentFile, setPaybillDocumentFile] = React.useState<File | null>(null);
    const [paybillDocumentPreview, setPaybillDocumentPreview] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handlePaybillDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPaybillDocumentFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setPaybillDocumentPreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setPaybillDocumentPreview('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!paybillDocumentFile) {
            setMessage('Paybill document is required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const token = localStorage.getItem('auth_token') || '';
            const formData = new FormData();
            formData.append('paybill_document', paybillDocumentFile);

            const response = await fetch(`${API_BASE}/additional-documents/${customer.id}/paybill`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload paybill document');
            }

            setMessage('Paybill document uploaded successfully');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload document');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-h-[300px] overflow-y-auto bg-lime/5 border border-lime/20 rounded-lg p-4">
            <h3 className="text-sm font-bold text-text mb-4">Bill Generation - Upload Generated Bill</h3>

            <div className="space-y-4">
                {existingPaybillUrl && (
                    <div className="bg-white/60 rounded-lg p-3 border border-lime/10">
                        <p className="text-xs font-semibold text-muted uppercase mb-2">Already Uploaded</p>
                        <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-lg">{getFileTypeFromUrl(existingPaybillUrl) === 'image' ? '🖼️' : '📄'}</span>
                                <span className="text-xs font-medium text-slate-700 truncate">Generated Bill Document</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <a
                                    href={getFullFileUrl(existingPaybillUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    Preview
                                </a>
                                <a
                                    href={getFullFileUrl(existingPaybillUrl)}
                                    download
                                    className="text-xs text-green-600 hover:text-green-700"
                                >
                                    Download
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Paybill Document Upload */}
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        Generated Bill Document *
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                        onChange={handlePaybillDocumentChange}
                        className="w-full border border-lime/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {paybillDocumentFile && (
                        <div className="mt-2">
                            {paybillDocumentPreview ? (
                                <div className="overflow-hidden rounded-lg">
                                    <img src={paybillDocumentPreview} alt="Paybill Document Preview" className="h-24 w-24 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {paybillDocumentFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully')
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                        }`}>
                        {message}
                    </p>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !paybillDocumentFile}
                    className="flex items-center gap-2 px-4 py-2.5 bg-lime text-white rounded-lg font-semibold hover:bg-lime-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                    <Upload size={16} />
                    {isSubmitting ? 'Uploading...' : 'Submit Bill Document'}
                </button>
            </div>
        </div>
    );
};

// Payment Approval 
export const PaymentApproval: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    const transactionInfo = customer?.transaction_information;

    // Parse amount submitted details
    const amountSubmittedDetails = React.useMemo(() => {
        try {
            return transactionInfo?.amount_submitted_details
                ? JSON.parse(transactionInfo.amount_submitted_details)
                : [];
        } catch {
            return [];
        }
    }, [transactionInfo?.amount_submitted_details]);

    // Parse payment proof images URLs
    const paymentProofUrls = React.useMemo(() => {
        try {
            return transactionInfo?.amount_submitted_images_url
                ? JSON.parse(transactionInfo.amount_submitted_images_url)
                : [];
        } catch {
            return [];
        }
    }, [transactionInfo?.amount_submitted_images_url]);

    const handlePreview = (url: string, title: string) => {
        setPreviewUrl(getFullFileUrl(url));
        setPreviewTitle(title);
    };

    const closePreview = () => {
        setPreviewUrl('');
        setPreviewTitle('');
    };

    const getFileType = (url: string) => {
        if (!url) return 'unknown';
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        return 'document';
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="max-h-[500px] overflow-y-auto bg-purple/5 border border-purple/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-text mb-4">Payment Approval - Transaction Details</h3>

            {/* Payment Summary */}
            <div className="bg-white/50 rounded-lg p-3 border border-purple/10">
                <p className="text-xs font-semibold text-muted uppercase mb-3">Payment Summary</p>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-right">₹{parseFloat(transactionInfo?.total_amount || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">Paid Amount:</span>
                        <span className="text-right text-green-600 font-semibold">₹{parseFloat(transactionInfo?.paid_amount || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-purple/20">
                        <span className="font-semibold text-orange">Remaining Amount:</span>
                        <span className="text-right text-orange font-bold">₹{(transactionInfo?.remaining_amount || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Payment Submissions */}
            {amountSubmittedDetails.length > 0 && (
                <div className="bg-white/50 rounded-lg p-3 border border-purple/10">
                    <h4 className="text-xs font-semibold text-muted uppercase mb-3 flex items-center gap-2">
                        <span>💰</span> Payment Submissions
                    </h4>
                    <div className="space-y-3">
                        {amountSubmittedDetails.map((payment: any, index: number) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-slate-200">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold text-muted">Payment #{index + 1}</span>
                                        <span className="text-xs text-muted">{formatDate(payment.date)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Amount:</span>
                                        <span className="text-right text-green-600 font-bold">₹{parseFloat(payment.amount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Mode:</span>
                                        <span className="text-right">{payment.mode || '-'}</span>
                                    </div>
                                    {payment.note && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <span className="text-xs font-semibold text-muted">Note:</span>
                                            <p className="text-xs text-slate-600 mt-1">{payment.note}</p>
                                        </div>
                                    )}
                                    {paymentProofUrls[index] && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted">Payment Proof:</span>
                                                <button
                                                    onClick={() => handlePreview(paymentProofUrls[index], `Payment Proof #${index + 1}`)}
                                                    className="flex items-center gap-1 px-2 py-1 hover:bg-purple-50 rounded-lg transition-colors text-xs text-purple-600 font-semibold"
                                                    title="Preview Certificate"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View Proof
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Additional Payment Proofs (if more images than payment details) */}
            {paymentProofUrls.length > amountSubmittedDetails.length && (
                <div className="bg-white/50 rounded-lg p-3 border border-purple/10">
                    <h4 className="text-xs font-semibold text-muted uppercase mb-3 flex items-center gap-2">
                        <span>📎</span> Additional Payment Proofs
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {paymentProofUrls.slice(amountSubmittedDetails.length).map((url: string, idx: number) => {
                            const actualIndex = amountSubmittedDetails.length + idx;
                            const fileType = getFileType(url);
                            return (
                                <div key={actualIndex} className="bg-white rounded-lg p-2 border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg flex-shrink-0">
                                                {fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📄' : '📎'}
                                            </span>
                                            <span className="text-xs font-medium text-slate-700 truncate">Proof #{actualIndex + 1}</span>
                                        </div>
                                        <button
                                            onClick={() => handlePreview(url, `Payment Proof #${actualIndex + 1}`)}
                                            className="flex-shrink-0 p-1 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Preview"
                                        >
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* No Payments Message */}
            {amountSubmittedDetails.length === 0 && (
                <div className="bg-white/50 rounded-lg p-4 border border-purple/10 text-center">
                    <p className="text-sm text-muted">No payment submissions recorded yet.</p>
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={closePreview}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            {getFileType(previewUrl) === 'image' ? (
                                <img
                                    src={previewUrl}
                                    alt={previewTitle}
                                    className="max-w-full h-auto rounded-lg"
                                />
                            ) : getFileType(previewUrl) === 'pdf' ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-[70vh] rounded-lg"
                                    title={previewTitle}
                                />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted mb-4">Cannot preview this file type</p>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Upload Warranty Card
export const WarrantyDocument: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const existingWarrantyUrl = customer?.warranty_card_document || customer?.additional_documents?.warranty_card_document;
    const [warrantyFile, setWarrantyFile] = React.useState<File | null>(null);
    const [filePreview, setFilePreview] = React.useState<string>('');
    const [message, setMessage] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    const getFileType = (url: string) => {
        if (!url) return 'unknown';
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        return 'document';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setMessage('');
        if (file) {
            setWarrantyFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!warrantyFile) {
            setMessage('Warranty card document is required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        const token = localStorage.getItem('auth_token') || '';
        if (!token) {
            setMessage('Authentication required. Please login again.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        try {
            const result = await additionalDocumentsAPI.uploadWarrantyDocument(customer.id, warrantyFile, token);
            const uploadedUrl = result?.data?.warranty_card_document || existingWarrantyUrl || '';
            if (uploadedUrl) {
                setPreviewUrl(uploadedUrl);
                setPreviewTitle('Warranty Card Document');
            }
            setMessage('Warranty document uploaded successfully');
            setWarrantyFile(null);
            setFilePreview('');
            setTimeout(() => window.location.reload(), 1200);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload warranty document');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openExisting = () => {
        if (existingWarrantyUrl) {
            setPreviewUrl(existingWarrantyUrl);
            setPreviewTitle('Warranty Card Document');
        }
    };

    const closePreview = () => {
        setPreviewUrl('');
        setPreviewTitle('');
    };

    return (
        <div className="max-h-[400px] overflow-y-auto bg-purple/5 border border-purple/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-text mb-2">Warranty Card Upload</h3>
            <p className="text-xs text-muted mb-2">SFDC Admin must upload the warranty card to complete this task.</p>

            {existingWarrantyUrl && (
                <div className="bg-white/60 border border-purple/10 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{getFileType(existingWarrantyUrl) === 'image' ? '🖼️' : '📄'}</span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Existing warranty document</p>
                            <p className="text-[11px] text-muted truncate">{existingWarrantyUrl.split('/').pop()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={existingWarrantyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-purple-700 hover:text-purple-800"
                        >
                            Open
                        </a>
                        <button
                            onClick={openExisting}
                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Preview
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        Warranty Card Document *
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="w-full border border-purple/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {warrantyFile && (
                        <div className="mt-2 flex items-center gap-3">
                            {filePreview ? (
                                <div className="overflow-hidden rounded-lg border border-purple/20">
                                    <img src={filePreview} alt="Warranty preview" className="h-20 w-20 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {warrantyFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {message && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !warrantyFile}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                    <Upload size={16} />
                    {isSubmitting ? 'Uploading...' : 'Submit Warranty Document'}
                </button>
            </div>

            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={closePreview}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            {getFileType(previewUrl) === 'image' ? (
                                <img src={previewUrl} alt={previewTitle} className="max-w-full h-auto rounded-lg" />
                            ) : getFileType(previewUrl) === 'pdf' ? (
                                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title={previewTitle} />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted mb-4">Cannot preview this file type</p>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Upload DCR Document
export const CDRCreation: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const existingDcrUrl = getAdditionalDocUrl(customer, 'dcr_document');
    const [dcrFile, setDcrFile] = React.useState<File | null>(null);
    const [filePreview, setFilePreview] = React.useState<string>('');
    const [message, setMessage] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    const getFileType = (url: string) => {
        if (!url) return 'unknown';
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        return 'document';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setMessage('');
        if (file) {
            setDcrFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview('');
            }
        }
    };

    const handleSubmit = async () => {
        if (!dcrFile) {
            setMessage('DCR document is required');
            return;
        }

        if (!customer?.id) {
            setMessage('Customer ID not found');
            return;
        }

        const token = localStorage.getItem('auth_token') || '';
        if (!token) {
            setMessage('Authentication required. Please login again.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        try {
            const result = await additionalDocumentsAPI.uploadDcrDocument(customer.id, dcrFile, token);
            const uploadedUrl = result?.data?.dcr_document || existingDcrUrl || '';
            if (uploadedUrl) {
                setPreviewUrl(uploadedUrl);
                setPreviewTitle('DCR Document');
            }
            setMessage('DCR document uploaded successfully');
            setDcrFile(null);
            setFilePreview('');
            setTimeout(() => window.location.reload(), 1200);
        } catch (error: any) {
            setMessage(error.message || 'Failed to upload DCR document');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openExisting = () => {
        if (existingDcrUrl) {
            setPreviewUrl(existingDcrUrl);
            setPreviewTitle('DCR Document');
        }
    };

    const closePreview = () => {
        setPreviewUrl('');
        setPreviewTitle('');
    };

    return (
        <div className="max-h-[400px] overflow-y-auto bg-purple/5 border border-purple/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-text mb-2">DCR Document Upload</h3>
            <p className="text-xs text-muted mb-2">SFDC Admin must upload the DCR document to complete this task.</p>

            {existingDcrUrl && (
                <div className="bg-white/60 border border-purple/10 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{getFileType(existingDcrUrl) === 'image' ? '🖼️' : '📄'}</span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">Existing DCR document</p>
                            <p className="text-[11px] text-muted truncate">{existingDcrUrl.split('/').pop()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={existingDcrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-purple-700 hover:text-purple-800"
                        >
                            Open
                        </a>
                        <button
                            onClick={openExisting}
                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Preview
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-semibold text-muted uppercase mb-2">
                        DCR Document *
                    </label>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="w-full border border-purple/30 rounded-lg px-3 py-2 text-sm"
                    />
                    {dcrFile && (
                        <div className="mt-2 flex items-center gap-3">
                            {filePreview ? (
                                <div className="overflow-hidden rounded-lg border border-purple/20">
                                    <img src={filePreview} alt="DCR preview" className="h-20 w-20 object-cover" />
                                </div>
                            ) : (
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <span>📄</span> {dcrFile.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {message && (
                    <p className={`text-xs font-semibold px-3 py-2 rounded ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !dcrFile}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                >
                    <Upload size={16} />
                    {isSubmitting ? 'Uploading...' : 'Submit DCR Document'}
                </button>
            </div>

            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={closePreview}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            {getFileType(previewUrl) === 'image' ? (
                                <img src={previewUrl} alt={previewTitle} className="max-w-full h-auto rounded-lg" />
                            ) : getFileType(previewUrl) === 'pdf' ? (
                                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title={previewTitle} />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted mb-4">Cannot preview this file type</p>
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Open in New Tab
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// Photo Capture Component for take_installed_item_photos work type
export const PhotoCapture: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    // ============================================
    // STATE MANAGEMENT - Image Upload State
    // ============================================

    // Solar Panel Images (Multiple)
    const [solarPanelImages, setSolarPanelImages] = React.useState<Array<{ file: File; preview: string; isSubmitted: boolean }>>([]);
    const [solarPanelIsSubmitting, setSolarPanelIsSubmitting] = React.useState(false);

    // Applicant with Panel Image (Single)
    const [applicantPanelImage, setApplicantPanelImage] = React.useState<File | null>(null);
    const [applicantPanelPreview, setApplicantPanelPreview] = React.useState<string>('');
    const [applicantPanelIsSubmitted, setApplicantPanelIsSubmitted] = React.useState(false);
    const [applicantPanelIsSubmitting, setApplicantPanelIsSubmitting] = React.useState(false);

    // Invertor Image (Single)
    const [invertorImage, setInvertorImage] = React.useState<File | null>(null);
    const [invertorPreview, setInvertorPreview] = React.useState<string>('');
    const [invertorIsSubmitted, setInvertorIsSubmitted] = React.useState(false);
    const [invertorIsSubmitting, setInvertorIsSubmitting] = React.useState(false);

    // Applicant with Invertor Image (Single)
    const [applicantInvertorImage, setApplicantInvertorImage] = React.useState<File | null>(null);
    const [applicantInvertorPreview, setApplicantInvertorPreview] = React.useState<string>('');
    const [applicantInvertorIsSubmitted, setApplicantInvertorIsSubmitted] = React.useState(false);
    const [applicantInvertorIsSubmitting, setApplicantInvertorIsSubmitting] = React.useState(false);

    // UI Messages
    const [message, setMessage] = React.useState('');
    const [messageType, setMessageType] = React.useState<'success' | 'error'>('success');

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Show message to user
     */
    const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 4000);
    };

    /**
     * File to preview conversion
     */
    const fileToPreview = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    };

    /**
     * Upload file to API
     */
    const uploadImageToAPI = async (
        imageFile: File,
        endpoint: string,
        fieldName: string
    ): Promise<boolean> => {
        try {
            const token = localStorage.getItem('auth_token') || '';
            if (!token) {
                showMessage('Authentication required. Please login again.', 'error');
                return false;
            }

            const formData = new FormData();
            formData.append(fieldName, imageFile);

            const response = await fetch(
                `${API_BASE}/additional-documents/${customer?.id}/${endpoint}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to upload image: ${response.statusText}`);
            }

            return true;
        } catch (error: any) {
            showMessage(error.message || 'Upload failed', 'error');
            return false;
        }
    };

    // ============================================
    // LOAD EXISTING IMAGES
    // ============================================

    React.useEffect(() => {
        const solarPanelsUrl = getAdditionalDocUrl(customer, 'solar_panels_images_url');
        const applicantPanelUrl = getAdditionalDocUrl(customer, 'applicant_with_panel_image_url');
        const invertorUrl = getAdditionalDocUrl(customer, 'inverter_image_url');
        const applicantInvertorUrl = getAdditionalDocUrl(customer, 'applicant_with_invertor_image_url');

        // Load Solar Panel Images (array)
        if (solarPanelsUrl) {
            try {
                const urls = JSON.parse(solarPanelsUrl);
                if (Array.isArray(urls)) {
                    setSolarPanelImages(urls.map((url: string) => ({
                        file: new File([], url),
                        preview: url,
                        isSubmitted: true,
                    })));
                }
            } catch {
                if (solarPanelsUrl) {
                    setSolarPanelImages([{
                        file: new File([], solarPanelsUrl),
                        preview: solarPanelsUrl,
                        isSubmitted: true,
                    }]);
                }
            }
        }

        // Load Applicant with Panel Image
        if (applicantPanelUrl) {
            setApplicantPanelPreview(applicantPanelUrl);
            setApplicantPanelIsSubmitted(true);
        }

        // Load Invertor Image
        if (invertorUrl) {
            setInvertorPreview(invertorUrl);
            setInvertorIsSubmitted(true);
        }

        // Load Applicant with Invertor Image
        if (applicantInvertorUrl) {
            setApplicantInvertorPreview(applicantInvertorUrl);
            setApplicantInvertorIsSubmitted(true);
        }
    }, [customer]);

    // ============================================
    // HANDLE FILE SELECTION - Solar Panels (Multiple)
    // ============================================

    const handleSolarPanelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(async (file) => {
            if (!file.type.startsWith('image/')) {
                showMessage('Only image files are allowed', 'error');
                return;
            }

            try {
                const preview = await fileToPreview(file);
                setSolarPanelImages((prev) => [
                    ...prev,
                    { file, preview, isSubmitted: false },
                ]);
            } catch (error) {
                showMessage('Failed to process image', 'error');
            }
        });

        e.target.value = '';
    };

    // ============================================
    // HANDLE FILE SELECTION - Single Images
    // ============================================

    const handleSingleImageChange = async (
        file: File | undefined,
        setImage: (file: File) => void,
        setPreview: (preview: string) => void
    ) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showMessage('Only image files are allowed', 'error');
            return;
        }

        try {
            const preview = await fileToPreview(file);
            setImage(file);
            setPreview(preview);
        } catch (error) {
            showMessage('Failed to process image', 'error');
        }
    };

    const handleApplicantPanelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSingleImageChange(e.target.files?.[0], setApplicantPanelImage, setApplicantPanelPreview);
        e.target.value = '';
    };

    const handleInvertorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSingleImageChange(e.target.files?.[0], setInvertorImage, setInvertorPreview);
        e.target.value = '';
    };

    const handleApplicantInvertorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSingleImageChange(e.target.files?.[0], setApplicantInvertorImage, setApplicantInvertorPreview);
        e.target.value = '';
    };

    // ============================================
    // HANDLE FILE REMOVAL
    // ============================================

    const removeSolarPanelImage = (index: number) => {
        setSolarPanelImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeSingleImage = (
        setImage: (file: null) => void,
        setPreview: (preview: string) => void,
        setIsSubmitted: (submitted: boolean) => void
    ) => {
        setImage(null);
        setPreview('');
        setIsSubmitted(false);
    };

    // ============================================
    // HANDLE SUBMISSIONS - Individual
    // ============================================

    const submitSolarPanelImages = async () => {
        const newImages = solarPanelImages.filter((img) => !img.isSubmitted);

        if (newImages.length === 0) {
            showMessage('No new images to upload', 'error');
            return;
        }

        setSolarPanelIsSubmitting(true);

        try {
            const allSuccess = await Promise.all(
                newImages.map((img) =>
                    uploadImageToAPI(img.file, 'upload-solar-panels', 'solar_panels_images')
                )
            );

            if (allSuccess.every((success) => success)) {
                setSolarPanelImages((prev) =>
                    prev.map((img) => ({ ...img, isSubmitted: true }))
                );
                showMessage('✓ Solar panel images uploaded successfully', 'success');
            }
        } finally {
            setSolarPanelIsSubmitting(false);
        }
    };

    const submitApplicantPanelImage = async () => {
        if (!applicantPanelImage) {
            showMessage('Please select an image first', 'error');
            return;
        }

        setApplicantPanelIsSubmitting(true);

        try {
            const success = await uploadImageToAPI(
                applicantPanelImage,
                'upload-applicant-panel',
                'applicant_with_panel_image'
            );

            if (success) {
                setApplicantPanelIsSubmitted(true);
                showMessage('✓ Applicant with panel image uploaded successfully', 'success');
            }
        } finally {
            setApplicantPanelIsSubmitting(false);
        }
    };

    const submitInvertorImage = async () => {
        if (!invertorImage) {
            showMessage('Please select an image first', 'error');
            return;
        }

        setInvertorIsSubmitting(true);

        try {
            const success = await uploadImageToAPI(
                invertorImage,
                'upload-invertor',
                'invertor_image'
            );

            if (success) {
                setInvertorIsSubmitted(true);
                showMessage('✓ Invertor image uploaded successfully', 'success');
            }
        } finally {
            setInvertorIsSubmitting(false);
        }
    };

    const submitApplicantInvertorImage = async () => {
        if (!applicantInvertorImage) {
            showMessage('Please select an image first', 'error');
            return;
        }

        setApplicantInvertorIsSubmitting(true);

        try {
            const success = await uploadImageToAPI(
                applicantInvertorImage,
                'upload-applicant-invertor',
                'applicant_with_invertor_image'
            );

            if (success) {
                setApplicantInvertorIsSubmitted(true);
                showMessage('✓ Applicant with invertor image uploaded successfully', 'success');
            }
        } finally {
            setApplicantInvertorIsSubmitting(false);
        }
    };

    // ============================================
    // RENDER INDIVIDUAL IMAGE CARD
    // ============================================

    const ImageCard = ({
        title,
        preview,
        isSubmitted,
        isSubmitting,
        onFileChange,
        onRemove,
        onSubmit,
        isSingleImage = true,
        imageCount = 1,
    }: {
        title: string;
        preview: string;
        isSubmitted: boolean;
        isSubmitting: boolean;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        onRemove?: () => void;
        onSubmit: () => void;
        isSingleImage?: boolean;
        imageCount?: number;
    }) => {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800">{title}</h3>
                        {!isSingleImage && (
                            <p className="text-xs text-gray-500 mt-1">{imageCount} image(s) selected</p>
                        )}
                    </div>
                    {isSubmitted && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-300">
                            <Check size={16} />
                            Uploaded
                        </span>
                    )}
                </div>

                {/* Image Preview */}
                {preview && (
                    <div className="relative group rounded-lg overflow-hidden bg-gray-100 h-40">
                        <img
                            src={preview}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold transition">
                                {imageCount} image{imageCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                {!isSubmitted && (
                    <label className="cursor-pointer block">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onFileChange}
                            multiple={!isSingleImage}
                            disabled={isSubmitting}
                            className="hidden"
                        />
                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:bg-blue-50 hover:border-blue-400 transition-all">
                            <Upload size={24} className="mx-auto text-blue-500 mb-2" />
                            <p className="text-sm text-blue-600 font-medium">
                                {isSingleImage ? 'Click to select image' : 'Click to add images'}
                            </p>
                            <p className="text-xs text-blue-500 mt-1">Supported: JPG, PNG, GIF, WebP</p>
                        </div>
                    </label>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {!isSubmitted && preview && onRemove && (
                        <button
                            onClick={onRemove}
                            disabled={isSubmitting}
                            className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 font-semibold transition disabled:opacity-50"
                        >
                            Clear
                        </button>
                    )}
                    {!isSubmitted && preview && (
                        <button
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-3 py-2 text-xs bg-blue text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Uploading...' : 'Upload'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ============================================
    // RENDER
    // ============================================

    const allImagesSubmitted =
        solarPanelImages.length > 0 &&
        solarPanelImages.every((img) => img.isSubmitted) &&
        applicantPanelIsSubmitted &&
        invertorIsSubmitted &&
        applicantInvertorIsSubmitted;

    return (
        <div className="max-h-[700px] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-blue-900">Photo Capture Progress</h2>
                    {allImagesSubmitted && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-300">
                            <Check size={16} />
                            Complete
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-600">Upload photos for each equipment category individually</p>
            </div>

            {/* Messages */}
            {message && (
                <div
                    className={`p-4 rounded-lg text-sm font-medium border-l-4 ${messageType === 'success'
                        ? 'bg-green-50 text-green-700 border-green-400'
                        : 'bg-red-50 text-red-700 border-red-400'
                        }`}
                >
                    {message}
                </div>
            )}

            {/* Image Upload Cards */}
            <div className="space-y-3">
                {/* 1. Solar Panel Images */}
                <ImageCard
                    title="1. Solar Panel Images"
                    preview={solarPanelImages[0]?.preview || ''}
                    isSubmitted={solarPanelImages.length > 0 && solarPanelImages.every((img) => img.isSubmitted)}
                    isSubmitting={solarPanelIsSubmitting}
                    onFileChange={handleSolarPanelChange}
                    onRemove={() => solarPanelImages.length > 0 && removeSolarPanelImage(0)}
                    onSubmit={submitSolarPanelImages}
                    isSingleImage={false}
                    imageCount={solarPanelImages.length}
                />

                {/* 2. Applicant with Panel Image */}
                <ImageCard
                    title="2. Applicant with Solar Panel Image"
                    preview={applicantPanelPreview}
                    isSubmitted={applicantPanelIsSubmitted}
                    isSubmitting={applicantPanelIsSubmitting}
                    onFileChange={handleApplicantPanelChange}
                    onRemove={() => removeSingleImage(setApplicantPanelImage, setApplicantPanelPreview, setApplicantPanelIsSubmitted)}
                    onSubmit={submitApplicantPanelImage}
                    isSingleImage={true}
                />

                {/* 3. Invertor Image */}
                <ImageCard
                    title="3. Invertor Image"
                    preview={invertorPreview}
                    isSubmitted={invertorIsSubmitted}
                    isSubmitting={invertorIsSubmitting}
                    onFileChange={handleInvertorChange}
                    onRemove={() => removeSingleImage(setInvertorImage, setInvertorPreview, setInvertorIsSubmitted)}
                    onSubmit={submitInvertorImage}
                    isSingleImage={true}
                />

                {/* 4. Applicant with Invertor Image */}
                <ImageCard
                    title="4. Applicant with Invertor Image"
                    preview={applicantInvertorPreview}
                    isSubmitted={applicantInvertorIsSubmitted}
                    isSubmitting={applicantInvertorIsSubmitting}
                    onFileChange={handleApplicantInvertorChange}
                    onRemove={() => removeSingleImage(setApplicantInvertorImage, setApplicantInvertorPreview, setApplicantInvertorIsSubmitted)}
                    onSubmit={submitApplicantInvertorImage}
                    isSingleImage={true}
                />
            </div>

            {/* Completion Message */}
            {allImagesSubmitted && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4 text-center">
                    <p className="text-green-700 font-semibold flex items-center justify-center gap-2">
                        <Check size={20} className="text-green-600" />
                        All images uploaded successfully! Task complete.
                    </p>
                </div>
            )}
        </div>
    );
};

// Serial Number Upload Component - View and Download Installed Item Images
export const SerialNumberUpload: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    const [previewUrl, setPreviewUrl] = React.useState<string>('');
    const [previewTitle, setPreviewTitle] = React.useState<string>('');

    // Get existing image URLs
    const solarPanelsImagesUrl = getAdditionalDocUrl(customer, 'solar_panels_images_url');
    const invertorImageUrl = getAdditionalDocUrl(customer, 'inverter_image_url');
    const applicantWithPanelImageUrl = getAdditionalDocUrl(customer, 'applicant_with_panel_image_url');
    const applicantWithInvertorImageUrl = getAdditionalDocUrl(customer, 'applicant_with_invertor_image_url');

    // Parse solar panel images array
    const solarPanelsImages = React.useMemo(() => {
        try {
            if (solarPanelsImagesUrl) {
                const parsed = JSON.parse(solarPanelsImagesUrl);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch {
            return [];
        }
    }, [solarPanelsImagesUrl]);

    const handlePreview = (url: string, title: string) => {
        setPreviewUrl(getFullFileUrl(url));
        setPreviewTitle(title);
    };

    const closePreview = () => {
        setPreviewUrl('');
        setPreviewTitle('');
    };

    const handleDownload = async (url: string, fileName: string) => {
        try {
            const fullUrl = getFullFileUrl(url);
            const safeName = fileName || 'image';
            const downloadUrl = `${API_BASE}/download?url=${encodeURIComponent(fullUrl)}&name=${encodeURIComponent(safeName)}`;
            const token = localStorage.getItem('auth_token') || '';

            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = safeName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(getFullFileUrl(url), '_blank');
        }
    };

    const getFileType = (url: string) => {
        if (!url) return 'unknown';
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
        if (ext === 'pdf') return 'pdf';
        return 'document';
    };

    const getFileNameFromUrl = (url: string) => {
        return url.split('/').pop() || 'image';
    };

    return (
        <div className="max-h-[700px] overflow-y-auto bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4 space-y-4">
            <div className="bg-white rounded-lg p-4 border border-cyan-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-cyan-900">Installed Item Images</h2>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-semibold border border-cyan-300">
                        <Check size={16} />
                        Ready to View
                    </span>
                </div>
                <p className="text-sm text-gray-600">View and download all uploaded equipment images for serial number verification</p>
            </div>

            {/* Solar Panel Images */}
            {solarPanelsImages.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700">1. Solar Panel Images ({solarPanelsImages.length})</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Submitted</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {solarPanelsImages.map((imageUrl: string, idx: number) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                <div className="relative group overflow-hidden rounded-lg bg-gray-100 h-32">
                                    <img
                                        src={imageUrl}
                                        alt={`Solar Panel ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                        onClick={() => handlePreview(imageUrl, `Solar Panel Image ${idx + 1}`)}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="text-white text-xs font-semibold">Click to Preview</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePreview(imageUrl, `Solar Panel Image ${idx + 1}`)}
                                        className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => handleDownload(imageUrl, `solar_panel_${idx + 1}_${getFileNameFromUrl(imageUrl)}`)}
                                        className="flex-1 px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invertor Image */}
            {invertorImageUrl && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700">2. Invertor Image</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Submitted</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="relative group overflow-hidden rounded-lg bg-gray-100 h-40">
                            <img
                                src={invertorImageUrl}
                                alt="Invertor Image"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => handlePreview(invertorImageUrl, 'Invertor Image')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs font-semibold">Click to Preview</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePreview(invertorImageUrl, 'Invertor Image')}
                                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => handleDownload(invertorImageUrl, `invertor_image_${getFileNameFromUrl(invertorImageUrl)}`)}
                                className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Applicant with Panel Image */}
            {applicantWithPanelImageUrl && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700">3. Applicant with Solar Panel Image</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Submitted</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="relative group overflow-hidden rounded-lg bg-gray-100 h-40">
                            <img
                                src={applicantWithPanelImageUrl}
                                alt="Applicant with Panel"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => handlePreview(applicantWithPanelImageUrl, 'Applicant with Solar Panel Image')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs font-semibold">Click to Preview</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePreview(applicantWithPanelImageUrl, 'Applicant with Solar Panel Image')}
                                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => handleDownload(applicantWithPanelImageUrl, `applicant_with_panel_${getFileNameFromUrl(applicantWithPanelImageUrl)}`)}
                                className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Applicant with Invertor Image */}
            {applicantWithInvertorImageUrl && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700">4. Applicant with Invertor Image</h3>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Submitted</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="relative group overflow-hidden rounded-lg bg-gray-100 h-40">
                            <img
                                src={applicantWithInvertorImageUrl}
                                alt="Applicant with Invertor"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => handlePreview(applicantWithInvertorImageUrl, 'Applicant with Invertor Image')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="text-white text-xs font-semibold">Click to Preview</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePreview(applicantWithInvertorImageUrl, 'Applicant with Invertor Image')}
                                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Preview
                            </button>
                            <button
                                onClick={() => handleDownload(applicantWithInvertorImageUrl, `applicant_with_invertor_${getFileNameFromUrl(applicantWithInvertorImageUrl)}`)}
                                className="flex-1 px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold"
                            >
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* No Images Message */}
            {!solarPanelsImages.length && !invertorImageUrl && !applicantWithPanelImageUrl && !applicantWithInvertorImageUrl && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-700 font-semibold">No images uploaded yet. Please wait for the upload process to complete.</p>
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                    onClick={closePreview}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={closePreview}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center bg-gray-100">
                            {getFileType(previewUrl) === 'image' ? (
                                <img
                                    src={previewUrl}
                                    alt={previewTitle}
                                    className="max-w-full h-auto rounded-lg shadow-lg"
                                />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">Cannot preview this file type</p>
                                    <button
                                        onClick={() => handleDownload(previewUrl, getFileNameFromUrl(previewUrl))}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Download
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                            <p className="text-xs text-gray-600">{getFileNameFromUrl(previewUrl)}</p>
                            <button
                                onClick={() => handleDownload(previewUrl, getFileNameFromUrl(previewUrl))}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                            >
                                Download Image
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export const PlantInstallationApproval: React.FC<WorkTypeDetailsProps> = ({ task: _task, customer }) => {
    return (
        <div className="flex items-start gap-3 bg-teal/5 border border-teal/20 rounded-lg p-3">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted uppercase mb-2">Plant Installation Details</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Solar Plant Type:</span> {customer?.solar_plant_type || '-'}</p>
                    <p><span className="font-semibold">Solar System Type:</span> {customer?.solar_system_type || '-'}</p>
                    <p><span className="font-semibold">Plant Size (kW):</span> {customer?.plant_size_kw || '-'}</p>
                    <p><span className="font-semibold">Plant Price:</span> {customer?.plant_price || '-'}</p>
                    <p><span className="font-semibold">Payment Mode:</span> {customer?.payment_mode || '-'}</p>
                </div>
                <p className="text-xs font-semibold text-muted uppercase mb-2 mt-4">Building/Structure Details</p>
                <div className="space-y-2 text-sm">
                    <p><span className="font-semibold">Building Floor Number:</span> {customer?.building_floor_number || '-'}</p>
                    <p><span className="font-semibold">Structure Type:</span> {customer?.structure_type || '-'}</p>
                    <p><span className="font-semibold">Free Shadow Area (sq.m):</span> {customer?.free_shadow_area || '-'}</p>
                </div>
            </div>
        </div>
    );
};