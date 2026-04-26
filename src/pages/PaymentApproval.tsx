import { useState, useEffect, useMemo } from 'react';
import { Search, Download, X, CheckCircle2, Eye, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type ApprovalEntry = {
    id: number;
    registered_customer_id: number;
    customer_name: string;
    district: string;
    plant_size_kw: number;
    payment_mode: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    amount_submitted_details: string;
    amount_submitted_images_url: string;
    payment_approved: number;
    approved_by: number | null;
    approved_at: string | null;
    approved_by_name: string | null;
    sales_person_name: string;
    sales_person_mobile: string;
    status: string;
    created_at: string;
    updated_at: string;
};

function PaymentApproval() {
    const [data, setData] = useState<ApprovalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [districtFilter, setDistrictFilter] = useState('');
    const [approvalFilter, setApprovalFilter] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<ApprovalEntry | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [approving, setApproving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const { token } = useAuth();
    const { showToast } = useToast();

    const fetchData = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const result = await paymentAPI.getApprovals(token);
            setData(result);
        } catch (err: any) {
            showToast(err.message || 'Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const filtered = useMemo(() => {
        return data.filter(entry => {
            const searchLower = search.toLowerCase();
            const matchesSearch = !search ||
                entry.customer_name?.toLowerCase().includes(searchLower) ||
                entry.district?.toLowerCase().includes(searchLower) ||
                entry.sales_person_name?.toLowerCase().includes(searchLower);
            const matchesStatus = !statusFilter || entry.status === statusFilter;
            const matchesDistrict = !districtFilter || entry.district === districtFilter;
            const matchesApproval = !approvalFilter ||
                (approvalFilter === 'approved' && entry.payment_approved) ||
                (approvalFilter === 'pending' && !entry.payment_approved);
            return matchesSearch && matchesStatus && matchesDistrict && matchesApproval;
        });
    }, [data, search, statusFilter, districtFilter, approvalFilter]);

    const districts = useMemo(() => [...new Set(data.map(d => d.district).filter(Boolean))], [data]);

    const handleApprove = async (entry: ApprovalEntry) => {
        try {
            setApproving(true);
            await paymentAPI.approve(entry.registered_customer_id, token!);
            showToast('Payment approved & bill generation task created', 'success');
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Failed to approve payment', 'error');
        } finally {
            setApproving(false);
        }
    };

    const parsePaymentHistory = (entry: ApprovalEntry) => {
        try {
            return JSON.parse(entry.amount_submitted_details || '[]');
        } catch { return []; }
    };

    const parseProofImages = (entry: ApprovalEntry) => {
        try {
            return JSON.parse(entry.amount_submitted_images_url || '[]');
        } catch { return []; }
    };

    const getFullUrl = (url: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_BASE.replace('/api', '')}${url}`;
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Completed': 'bg-green-100 text-green-800',
            'Finance': 'bg-purple-100 text-purple-800',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    const downloadCSV = () => {
        const headers = ['Customer', 'District', 'Sales Person', 'Plant (kW)', 'Mode', 'Total', 'Collected', 'Remaining', 'Status', 'Approved'];
        const rows = filtered.map(e => [e.customer_name, e.district, e.sales_person_name, e.plant_size_kw, e.payment_mode, e.total_amount, e.paid_amount, e.remaining_amount, e.status, e.payment_approved ? 'Yes' : 'No']);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `payment_approval_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Approval</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and approve collected payments</p>
                </div>
                <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Finance">Finance</option>
                </select>
                <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="">All Districts</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="">All</option>
                    <option value="pending">Not Approved</option>
                    <option value="approved">Approved</option>
                </select>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Total Entries</p>
                    <p className="text-2xl font-bold">{filtered.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Pending Approval</p>
                    <p className="text-2xl font-bold text-yellow-600">{filtered.filter(e => !e.payment_approved).length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{filtered.filter(e => e.payment_approved).length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Finance Cases</p>
                    <p className="text-2xl font-bold text-purple-600">{filtered.filter(e => e.payment_mode === 'Finance').length}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">District</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Sales Person</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Mode</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Collected</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Remaining</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600">Approved</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedEntry(entry); setShowModal(true); }}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{entry.customer_name}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.district}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.sales_person_name}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.payment_mode}</td>
                                    <td className="px-4 py-3 text-right font-medium">₹{(entry.total_amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-medium">₹{(entry.paid_amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right text-red-600 font-medium">₹{(entry.remaining_amount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-center">{statusBadge(entry.status)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {entry.payment_approved ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                                <CheckCircle2 size={12} /> Approved
                                            </span>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); setSelectedEntry(entry); setShowModal(true); }}
                                                className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600 font-medium">
                                                Review
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {showModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setPreviewUrl(''); }}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>
                                <p className="text-sm text-gray-500">{selectedEntry.customer_name} — {selectedEntry.district}</p>
                            </div>
                            <button onClick={() => { setShowModal(false); setPreviewUrl(''); }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-blue-600">Total</p>
                                    <p className="text-lg font-bold text-blue-800">₹{(selectedEntry.total_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-green-600">Collected</p>
                                    <p className="text-lg font-bold text-green-800">₹{(selectedEntry.paid_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-red-600">Remaining</p>
                                    <p className="text-lg font-bold text-red-800">₹{(selectedEntry.remaining_amount || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Sales Person: <strong>{selectedEntry.sales_person_name}</strong></span>
                                <span>• Mode: <strong>{selectedEntry.payment_mode}</strong></span>
                            </div>

                            {/* Payment History */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment History</h3>
                                {parsePaymentHistory(selectedEntry).length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">
                                        {selectedEntry.payment_mode === 'Finance' ? 'Finance case — verify externally and approve' : 'No payments recorded yet'}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {parsePaymentHistory(selectedEntry).map((payment: any, idx: number) => {
                                            const proofImages = parseProofImages(selectedEntry);
                                            const proofUrl = proofImages[idx] ? getFullUrl(proofImages[idx]) : null;
                                            return (
                                                <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800">₹{(payment.amount || 0).toLocaleString('en-IN')}</p>
                                                        <p className="text-xs text-gray-500">{payment.date ? new Date(payment.date).toLocaleDateString('en-IN') : 'N/A'} • {payment.mode || 'N/A'}</p>
                                                    </div>
                                                    {proofUrl && (
                                                        <button onClick={() => setPreviewUrl(proofUrl)} className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                                                            <Eye size={12} /> Proof
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Preview */}
                            {previewUrl && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Payment Proof</span>
                                        <button onClick={() => setPreviewUrl('')} className="text-xs text-blue-600 hover:underline">Close</button>
                                    </div>
                                    {previewUrl.match(/\.pdf/i) ? (
                                        <iframe src={previewUrl} className="w-full h-64" />
                                    ) : (
                                        <img src={previewUrl} alt="Proof" className="w-full max-h-64 object-contain" />
                                    )}
                                </div>
                            )}

                            {/* Approval Status */}
                            {selectedEntry.payment_approved ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                                    <CheckCircle2 size={24} className="text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Payment Approved</p>
                                        <p className="text-xs text-green-600">
                                            By {selectedEntry.approved_by_name || 'Admin'} on {selectedEntry.approved_at ? new Date(selectedEntry.approved_at).toLocaleDateString('en-IN') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => handleApprove(selectedEntry)} disabled={approving}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Shield size={18} />
                                    {approving ? 'Approving...' : 'Approve Payment & Create Bill Task'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PaymentApproval;
