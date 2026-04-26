import { useState, useEffect, useMemo } from 'react';
import { Search, Download, X, Upload, IndianRupee, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

type PaymentEntry = {
    id: number;
    registered_customer_id: number;
    customer_name: string;
    district: string;
    plant_size_kw: number;
    payment_mode: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    sales_person_name: string;
    sales_person_mobile: string;
    status: string;
    created_at: string;
    updated_at: string;
};

function PaymentCollection() {
    const [data, setData] = useState<PaymentEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [districtFilter, setDistrictFilter] = useState('');
    const [paymentModeFilter, setPaymentModeFilter] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<PaymentEntry | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { token } = useAuth();
    const { showToast } = useToast();

    const fetchData = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const result = await paymentAPI.getCollection(token);
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
            const matchesMode = !paymentModeFilter || entry.payment_mode === paymentModeFilter;
            return matchesSearch && matchesStatus && matchesDistrict && matchesMode;
        });
    }, [data, search, statusFilter, districtFilter, paymentModeFilter]);

    const districts = useMemo(() => [...new Set(data.map(d => d.district).filter(Boolean))], [data]);
    const paymentModes = useMemo(() => [...new Set(data.map(d => d.payment_mode).filter(Boolean))], [data]);

    const handleRecordPayment = async () => {
        if (!selectedEntry || !paymentAmount || !proofFile) {
            showToast('Amount and proof file are required', 'error');
            return;
        }
        const amount = parseFloat(paymentAmount);
        const remaining = parseFloat(String(selectedEntry.remaining_amount)) || 0;
        if (amount <= 0 || amount > remaining) {
            showToast(`Amount must be between ₹1 and ₹${remaining.toLocaleString('en-IN')}`, 'error');
            return;
        }
        try {
            setSubmitting(true);
            await paymentAPI.recordCollection(selectedEntry.registered_customer_id, paymentAmount, proofFile, token!);
            showToast('Payment recorded successfully', 'success');
            setShowModal(false);
            setPaymentAmount('');
            setProofFile(null);
            setSelectedEntry(null);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Failed to record payment', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Completed': 'bg-green-100 text-green-800',
        };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
    };

    const downloadCSV = () => {
        const headers = ['Customer Name', 'District', 'Sales Person', 'Plant Size (kW)', 'Payment Mode', 'Total Amount', 'Collected', 'Remaining', 'Status'];
        const rows = filtered.map(e => [e.customer_name, e.district, e.sales_person_name, e.plant_size_kw, e.payment_mode, e.total_amount, e.paid_amount, e.remaining_amount, e.status]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `payment_collection_${new Date().toISOString().split('T')[0]}.csv`; a.click();
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
                    <h1 className="text-2xl font-bold text-gray-900">Payment Collection</h1>
                    <p className="text-sm text-gray-500 mt-1">Record payments collected from customers</p>
                </div>
                <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                    <Download size={16} /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search name, district, sales person..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>
                <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">All Districts</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={paymentModeFilter} onChange={e => setPaymentModeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">All Payment Modes</option>
                    {paymentModes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-blue-600">₹{filtered.reduce((s, e) => s + (parseFloat(String(e.total_amount)) || 0), 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Collected</p>
                    <p className="text-xl font-bold text-green-600">₹{filtered.reduce((s, e) => s + (parseFloat(String(e.paid_amount)) || 0), 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-xl font-bold text-red-600">₹{filtered.reduce((s, e) => s + (parseFloat(String(e.remaining_amount)) || 0), 0).toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">District</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Sales Person</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Plant (kW)</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-600">Mode</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Collected</th>
                                <th className="text-right px-4 py-3 font-medium text-gray-600">Remaining</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedEntry(entry); setShowModal(true); }}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{entry.customer_name}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.district}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.sales_person_name}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{entry.plant_size_kw}</td>
                                    <td className="px-4 py-3 text-gray-600">{entry.payment_mode}</td>
                                    <td className="px-4 py-3 text-right font-medium">₹{(parseFloat(String(entry.total_amount)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-medium">₹{(parseFloat(String(entry.paid_amount)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right text-red-600 font-medium">₹{(parseFloat(String(entry.remaining_amount)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-center">{statusBadge(entry.status)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {entry.status === 'Completed' ? (
                                            <span className="text-xs text-green-600 font-medium">✅ Done</span>
                                        ) : entry.payment_mode === 'Finance' ? (
                                            <span className="text-xs text-purple-500 font-medium">Finance</span>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); setSelectedEntry(entry); setShowModal(true); }}
                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm whitespace-nowrap">
                                                💰 Collect
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {showModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
                                <p className="text-sm text-gray-500">{selectedEntry.customer_name} — {selectedEntry.district}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-blue-600">Total</p>
                                    <p className="text-lg font-bold text-blue-800">₹{(parseFloat(String(selectedEntry.total_amount)) || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-green-600">Collected</p>
                                    <p className="text-lg font-bold text-green-800">₹{(parseFloat(String(selectedEntry.paid_amount)) || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-red-600">Remaining</p>
                                    <p className="text-lg font-bold text-red-800">₹{(parseFloat(String(selectedEntry.remaining_amount)) || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {selectedEntry.status === 'Completed' || selectedEntry.payment_mode === 'Finance' ? (
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
                                    <p className="text-gray-600">{selectedEntry.payment_mode === 'Finance' ? 'Finance case — no collection required' : 'Payment fully collected'}</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                        <div className="relative">
                                            <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                                max={selectedEntry.remaining_amount} min={1} placeholder={`Max ₹${selectedEntry.remaining_amount.toLocaleString('en-IN')}`}
                                                className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Proof</label>
                                        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                                            <Upload size={16} className="text-gray-400" />
                                            <span className="text-sm text-gray-500">{proofFile ? proofFile.name : 'Upload receipt/proof image'}</span>
                                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                    <button onClick={handleRecordPayment} disabled={submitting || !paymentAmount || !proofFile}
                                        className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {submitting ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PaymentCollection;
