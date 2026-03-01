import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import RegisterCustomerForm from '../components/register/RegisterCustomerForm';
import DocumentDownloadModal from '../components/DocumentDownloadModal';
import { useAuth } from '../context/AuthContext';
import { registeredCustomersAPI } from '../services/api';

type Customer = {
    id: string;
    applicant_name: string;
    mobile_number: string;
    district: string;
    payment_mode?: string;
    created_at?: string;
};

function RegisterCustomer() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [filterName, setFilterName] = useState('');
    const [filterPhone, setFilterPhone] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const { user, token } = useAuth();

    // Prepare session object from logged-in user
    const session = user ? { employeeId: user.id, name: user.name } : undefined;

    // Filter customers based on search criteria
    const filteredCustomers = useMemo(() => {
        return customers.filter(customer => {
            const nameMatch = customer.applicant_name.toLowerCase().includes(filterName.toLowerCase());
            const phoneMatch = customer.mobile_number.toLowerCase().includes(filterPhone.toLowerCase());
            const districtMatch = customer.district.toLowerCase().includes(filterDistrict.toLowerCase());
            return nameMatch && phoneMatch && districtMatch;
        });
    }, [customers, filterName, filterPhone, filterDistrict]);

    useEffect(() => {
        const fetchCustomers = async () => {
            if (!user || !token) { setLoading(false); return; }
            try {
                setLoading(true);
                let data;

                // Check if user is Master Admin or System Admin
                if (user.employee_role === 'Master Admin' || user.employee_role === 'System Admin') {
                    // Fetch all registered customers
                    data = await registeredCustomersAPI.list(token, { page: 1, limit: 10000 });
                } else {
                    // Fetch only customers registered by this employee
                    data = await registeredCustomersAPI.getByEmployee(user.id, token);
                }

                const rows = Array.isArray(data) ? data : data.data || [];
                setCustomers(rows);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed to load customers';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, [user, token]);

    const openEdit = (id: string) => {
        setSelectedId(id);
        setIsOpen(true);
    };

    const openCreate = () => {
        setSelectedId(null);
        setIsOpen(true);
    };

    const handleSuccess = async () => {
        setIsOpen(false);
        setSelectedId(null);
        // Refresh the customer list
        if (user && token) {
            try {
                let data;

                // Check if user is Master Admin or System Admin
                if (user.employee_role === 'Master Admin' || user.employee_role === 'System Admin') {
                    // Fetch all registered customers
                    data = await registeredCustomersAPI.list(token, { page: 1, limit: 10000 });
                } else {
                    // Fetch only customers registered by this employee
                    data = await registeredCustomersAPI.getByEmployee(user.id, token);
                }

                const rows = Array.isArray(data) ? data : data.data || [];
                setCustomers(rows);
            } catch (e) {
                console.error('Failed to refresh customers:', e);
            }
        }
    };

    const openDocumentModal = async (id: string) => {
        try {
            if (!token) throw new Error('Missing auth token');
            const data = await registeredCustomersAPI.getById(id, token);
            setSelectedCustomer(data);
            setIsDocumentModalOpen(true);
        } catch (e) {
            console.error('Failed to load customer details:', e);
            setError('Failed to load customer documents');
        }
    };

    const clearFilters = () => {
        setFilterName('');
        setFilterPhone('');
        setFilterDistrict('');
    };

    return (
        <div className="p-4 sm:p-6">
            <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl border border-blue/18 bg-blue/10 px-4 py-3 text-blue-dark font-semibold shadow-sm hover:bg-blue/14 hover:border-blue/26 transition-colors"
            >
                <Plus size={18} />
                <span>Register Customer</span>
            </button>

            {/* Table of customers */}
            <div className="mt-6">
                {loading ? (
                    <div className="text-sm text-muted">Loading customers…</div>
                ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        {/* Filter Section */}
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Search className="w-5 h-5 text-slate-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Filter Customers</h3>
                                {(filterName || filterPhone || filterDistrict) && (
                                    <button
                                        onClick={clearFilters}
                                        className="ml-auto px-3 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1"
                                    >
                                        <X size={14} /> Clear Filters
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        value={filterName}
                                        onChange={(e) => setFilterName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="Search by phone..."
                                        value={filterPhone}
                                        onChange={(e) => setFilterPhone(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">District</label>
                                    <input
                                        type="text"
                                        placeholder="Search by district..."
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            {(filterName || filterPhone || filterDistrict) && (
                                <p className="text-xs text-slate-600 mt-3">
                                    📊 Showing {filteredCustomers.length} of {customers.length} customer(s)
                                </p>
                            )}
                        </div>

                        <table className="min-w-full divide-y divide-slate-200 hidden md:table">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">District</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Payment Mode</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Created Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredCustomers.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 text-sm text-slate-900">{c.applicant_name}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{c.mobile_number}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{c.district}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{c.payment_mode || '-'}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(String(c.id))}
                                                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                                                >Open</button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDocumentModal(String(c.id))}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300 transition-colors"
                                                >Download</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-sm text-muted" colSpan={6}>
                                            {customers.length === 0 ? 'No customers found.' : 'No customers match your filters.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100 bg-white">
                            {filteredCustomers.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted">
                                    {customers.length === 0 ? 'No customers found.' : 'No customers match your filters.'}
                                </div>
                            ) : (
                                filteredCustomers.map((c) => (
                                    <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">{c.applicant_name}</p>
                                                <p className="text-sm text-slate-600">{c.mobile_number}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                    {c.district}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <p className="text-slate-500 font-medium">Payment Mode</p>
                                                <p className="text-slate-900 font-semibold">{c.payment_mode || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 font-medium">Created Date</p>
                                                <p className="text-slate-900 font-semibold">
                                                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', {
                                                        year: '2-digit',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    }) : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(String(c.id))}
                                                className="flex-1 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
                                            >
                                                ✏️ Open
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openDocumentModal(String(c.id))}
                                                className="flex-1 px-3 py-2 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300 transition-colors"
                                            >
                                                📥 Download
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[1200] bg-text/30 backdrop-blur-sm flex items-center justify-center px-4 py-8"
                    onClick={() => setIsOpen(false)}
                    aria-modal="true"
                    role="dialog"
                >
                    <div
                        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-blue/12 shadow-2xl shadow-blue/16"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-blue/12 bg-white/95 backdrop-blur z-10 rounded-t-2xl">
                            <div>
                                <p className="m-0 text-[18px] font-bold text-text">Register Customer</p>
                                <p className="m-0 text-sm text-muted">Fill the Tata Solar onboarding details and save or keep as draft.</p>
                            </div>
                            <button
                                type="button"
                                className="h-9 w-9 rounded-full border border-blue/14 text-text bg-panel hover:bg-panel-strong transition-colors"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close register customer"
                            >
                                X
                            </button>
                        </div>
                        <div className="px-5 pb-6 pt-2">
                            <RegisterCustomerForm
                                session={session}
                                applicationId={selectedId}
                                onSuccess={handleSuccess}
                                onCancel={() => setIsOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Document Download Modal */}
            {selectedCustomer && (
                <DocumentDownloadModal
                    isOpen={isDocumentModalOpen}
                    onClose={() => {
                        setIsDocumentModalOpen(false);
                        setSelectedCustomer(null);
                    }}
                    customer={selectedCustomer}
                />
            )}
        </div>
    );
}

export default RegisterCustomer;
