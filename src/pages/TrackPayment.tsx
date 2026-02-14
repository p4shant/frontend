import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { transactionLogsAPI } from '../services/api';

interface PaymentTrackingRecord {
    id: number;
    registered_customer_id: number;
    customer_name: string;
    district: string;
    plant_size_kw: string;
    payment_mode: string;
    total_amount: string;
    paid_amount: string;
    remaining_amount: string;
    sales_person_name: string;
    sales_person_mobile: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    created_at: string;
    updated_at: string;
}

const TrackPayment: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [records, setRecords] = useState<PaymentTrackingRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<PaymentTrackingRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [districtFilter, setDistrictFilter] = useState<string>('all');
    const [paymentModeFilter, setPaymentModeFilter] = useState<string>('all');

    useEffect(() => {
        fetchPaymentTracking();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, statusFilter, districtFilter, paymentModeFilter, records]);

    const fetchPaymentTracking = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const data = await transactionLogsAPI.getPaymentTracking(token);
            setRecords(data);
            setFilteredRecords(data);
        } catch (error) {
            console.error('Error fetching payment tracking:', error);
            showToast('Failed to load payment tracking data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...records];

        // Apply search filter
        if (searchTerm.trim() !== '') {
            const lowerSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(record =>
                record.customer_name.toLowerCase().includes(lowerSearch) ||
                record.district.toLowerCase().includes(lowerSearch) ||
                record.sales_person_name.toLowerCase().includes(lowerSearch) ||
                record.payment_mode.toLowerCase().includes(lowerSearch)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(record => record.status === statusFilter);
        }

        // Apply district filter
        if (districtFilter !== 'all') {
            filtered = filtered.filter(record => record.district === districtFilter);
        }

        // Apply payment mode filter
        if (paymentModeFilter !== 'all') {
            filtered = filtered.filter(record => record.payment_mode === paymentModeFilter);
        }

        setFilteredRecords(filtered);
    };

    const getUniqueDistricts = () => {
        const districts = records.map(r => r.district);
        return Array.from(new Set(districts)).sort();
    };

    const getUniquePaymentModes = () => {
        const paymentModes = records.map(r => r.payment_mode);
        return Array.from(new Set(paymentModes)).sort();
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
        }).format(num);
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
            'Completed': 'bg-green-100 text-green-800 border-green-300',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const downloadAsCSV = () => {
        if (filteredRecords.length === 0) {
            showToast('No data to download', 'warning');
            return;
        }

        const headers = [
            'Customer Name',
            'District',
            'Sales Person Name',
            'Plant Size (kW)',
            'Payment Mode',
            'Total Amount',
            'Collected Amount',
            'Remaining Amount',
            'Status',
            'Created At'
        ];

        const rows = filteredRecords.map(record => [
            record.customer_name,
            record.district,
            record.sales_person_name,
            record.plant_size_kw,
            record.payment_mode,
            record.total_amount,
            record.paid_amount,
            record.remaining_amount,
            record.status,
            new Date(record.created_at).toLocaleDateString('en-IN')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma
                    const cellStr = String(cell || '');
                    return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `payment-tracking-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Payment data downloaded successfully', 'success');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    <p className="text-text-dim text-sm">Loading payment tracking...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Track Payment</h1>
                    <p className="text-sm text-text-dim mt-1">Monitor customer payment status and transactions</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-2">
                    <div className="text-sm text-text-dim">
                        Total Records: <span className="font-semibold text-text-primary">{filteredRecords.length}</span>
                    </div>
                    {filteredRecords.length > 0 && (
                        <button
                            onClick={downloadAsCSV}
                            className="px-3 py-2 text-xs font-medium text-white bg-blue rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Download Excel
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-panel rounded-lg border border-border p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="flex-1">
                        <label htmlFor="search" className="block text-xs font-medium text-text-dim mb-1">
                            Search
                        </label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Search by customer, district, sales person..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label htmlFor="status-filter" className="block text-xs font-medium text-text-dim mb-1">
                            Status
                        </label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    {/* District Filter */}
                    <div>
                        <label htmlFor="district-filter" className="block text-xs font-medium text-text-dim mb-1">
                            District
                        </label>
                        <select
                            id="district-filter"
                            value={districtFilter}
                            onChange={(e) => setDistrictFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Districts</option>
                            {getUniqueDistricts().map(district => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                    </div>

                    {/* Payment Mode Filter */}
                    <div>
                        <label htmlFor="payment-mode-filter" className="block text-xs font-medium text-text-dim mb-1">
                            Payment Mode
                        </label>
                        <select
                            id="payment-mode-filter"
                            value={paymentModeFilter}
                            onChange={(e) => setPaymentModeFilter(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Payment Modes</option>
                            {getUniquePaymentModes().map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || statusFilter !== 'all' || districtFilter !== 'all' || paymentModeFilter !== 'all') && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                            setDistrictFilter('all');
                            setPaymentModeFilter('all');
                        }}
                        className="text-xs text-blue-600 hover:text-blue font-medium"
                    >
                        Clear all filters
                    </button>
                )}
            </div>

            {/* Table - Desktop View */}
            <div className="hidden lg:block bg-panel rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-blue">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                    Customer Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                    District
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                    Sales Person Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                    Plant Size (kW)
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                                    Payment Mode
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                                    Total Amount
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                                    Collected
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                                    Remaining
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-text-dim">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-blue transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-text-primary">
                                            {record.customer_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-dim">
                                            {record.district}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-dim">
                                            {record.sales_person_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-dim">
                                            {record.plant_size_kw} kW
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-dim">
                                            {record.payment_mode}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-text-primary">
                                            {formatCurrency(record.total_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                                            {formatCurrency(record.paid_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-orange-600 font-medium">
                                            {formatCurrency(record.remaining_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(record.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cards - Mobile/Tablet View */}
            <div className="lg:hidden space-y-3">
                {filteredRecords.length === 0 ? (
                    <div className="bg-panel rounded-lg border border-border p-8 text-center text-text-dim">
                        No records found
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div key={record.id} className="bg-panel rounded-lg border border-border p-4 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-text-primary">{record.customer_name}</h3>
                                    <p className="text-xs text-text-dim mt-0.5">{record.district}</p>
                                </div>
                                {getStatusBadge(record.status)}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                <div>
                                    <p className="text-xs text-text-dim">Sales Person</p>
                                    <p className="text-sm font-medium text-text-primary">{record.sales_person_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-text-dim">Total Amount</p>
                                    <p className="text-sm font-semibold text-text-primary">{formatCurrency(record.total_amount)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                <div>
                                    <p className="text-xs text-text-dim">Plant Size</p>
                                    <p className="text-sm font-medium text-text-primary">{record.plant_size_kw} kW</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-text-dim">Payment Mode</p>
                                    <p className="text-sm font-medium text-text-primary">{record.payment_mode}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                <div>
                                    <p className="text-xs text-text-dim">Collected</p>
                                    <p className="text-sm font-medium text-green-600">{formatCurrency(record.paid_amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-text-dim">Remaining</p>
                                    <p className="text-sm font-medium text-orange-600">{formatCurrency(record.remaining_amount)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TrackPayment;
