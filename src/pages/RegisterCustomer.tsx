import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import RegisterCustomerForm from '../components/register/RegisterCustomerForm';
import { useAuth } from '../context/AuthContext';
import { registeredCustomersAPI } from '../services/api';

type Customer = {
    id: string;
    applicant_name: string;
    mobile_number: string;
    district: string;
};

function RegisterCustomer() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, token } = useAuth();

    // Prepare session object from logged-in user
    const session = user ? { employeeId: user.id, name: user.name } : undefined;

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

    const downloadDetails = async (id: string) => {
        try {
            if (!token) throw new Error('Missing auth token');
            const data = await registeredCustomersAPI.getById(id, token);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `registered_customer_${id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Download failed', e);
        }
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
            <div className="mt-4">
                {loading ? (
                    <div className="text-sm text-muted">Loading customers…</div>
                ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">District</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {customers.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 text-sm text-slate-900">{c.applicant_name}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{c.mobile_number}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{c.district}</td>
                                        <td className="px-4 py-2 text-sm text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(String(c.id))}
                                                    className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700"
                                                >Open</button>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadDetails(String(c.id))}
                                                    className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-300"
                                                >Download</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-sm text-muted" colSpan={4}>No customers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
        </div>
    );
}

export default RegisterCustomer;
