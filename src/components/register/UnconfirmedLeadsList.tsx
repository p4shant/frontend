import { useEffect, useState, useMemo } from 'react';
import { Search, X, Edit2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { unconfirmedLeadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import UnconfirmedLeadForm from './UnconfirmedLeadForm';

type Lead = {
    id: number;
    name: string;
    district: string;
    phone_number: string;
    confirmation_percentage: number;
    notes?: string;
    status: 'active' | 'converted' | 'dropped';
    created_at: string;
    created_by_name?: string;
    converted_customer_name?: string;
};

const UP_DISTRICTS = [
    'Ghazipur',
    'Varanasi',
    'Azamgarh',
    'Mau',
    'Ballia',
    'Other'
];

export default function UnconfirmedLeadsList({
    onConvertToCustomer,
    refreshTrigger = 0
}: {
    onConvertToCustomer: (lead: Lead) => void;
    refreshTrigger?: number;
}) {
    const { user, token } = useAuth();
    const { showToast } = useToast();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    // Filters
    const [filterName, setFilterName] = useState('');
    const [filterPhone, setFilterPhone] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [showAllStatuses, setShowAllStatuses] = useState(false);

    // Filter leads based on search criteria
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const nameMatch = lead.name.toLowerCase().includes(filterName.toLowerCase());
            const phoneMatch = lead.phone_number.toLowerCase().includes(filterPhone.toLowerCase());
            const districtMatch = filterDistrict === '' || lead.district === filterDistrict;
            return nameMatch && phoneMatch && districtMatch;
        });
    }, [leads, filterName, filterPhone, filterDistrict]);

    const fetchLeads = async () => {
        if (!user || !token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            let data;

            const filters: any = {
                page: 1,
                limit: 10000
            };

            // Show only active leads by default, or all statuses if toggled
            if (!showAllStatuses) {
                filters.status = 'active';
            }

            // Check if user is Master Admin or System Admin
            if (user.employee_role === 'Master Admin' || user.employee_role === 'System Admin') {
                // Fetch all leads
                data = await unconfirmedLeadsAPI.list(token, filters);
            } else {
                // Fetch only leads created by this employee
                data = await unconfirmedLeadsAPI.getByEmployee(user.id, token);
            }

            const rows = Array.isArray(data) ? data : data.data || [];
            setLeads(rows);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load leads';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [user, token, showAllStatuses, refreshTrigger]);

    const clearFilters = () => {
        setFilterName('');
        setFilterPhone('');
        setFilterDistrict('');
    };

    const handleEdit = (lead: Lead) => {
        setEditingLead(lead);
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        setEditingLead(null);
        fetchLeads();
    };

    const handleDrop = async (lead: Lead) => {
        if (!window.confirm(`Are you sure you want to drop lead "${lead.name}"?`)) {
            return;
        }

        try {
            await unconfirmedLeadsAPI.update(String(lead.id), { status: 'dropped' }, token!);
            showToast('Lead dropped successfully', 'success');
            fetchLeads();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to drop lead';
            showToast(message, 'error');
        }
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage <= 30) return 'bg-red-100 text-red-800';
        if (percentage <= 60) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    const getPercentageBarColor = (percentage: number) => {
        if (percentage <= 30) return 'bg-red-500';
        if (percentage <= 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Active</span>;
            case 'converted':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Converted</span>;
            case 'dropped':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Dropped</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
        }
    };

    return (
        <>
            <div className="mt-6">
                {loading ? (
                    <div className="text-sm text-muted">Loading leads…</div>
                ) : error ? (
                    <div className="text-sm text-red-600">{error}</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-amber-200 shadow-sm">
                        {/* Filter Section */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Search className="w-5 h-5 text-amber-600" />
                                <h3 className="text-sm font-semibold text-slate-700">Filter Unconfirmed Leads</h3>
                                <label className="ml-auto flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showAllStatuses}
                                        onChange={(e) => setShowAllStatuses(e.target.checked)}
                                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    Show All Statuses
                                </label>
                                {(filterName || filterPhone || filterDistrict) && (
                                    <button
                                        onClick={clearFilters}
                                        className="px-3 py-1 text-xs bg-white border border-amber-300 rounded-lg text-slate-700 hover:bg-amber-50 transition-colors flex items-center gap-1"
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
                                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="Search by phone..."
                                        value={filterPhone}
                                        onChange={(e) => setFilterPhone(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-medium text-slate-600 mb-1">District</label>
                                    <select
                                        value={filterDistrict}
                                        onChange={(e) => setFilterDistrict(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    >
                                        <option value="">All Districts</option>
                                        {UP_DISTRICTS.map(dist => (
                                            <option key={dist} value={dist}>{dist}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {(filterName || filterPhone || filterDistrict) && (
                                <p className="text-xs text-slate-600 mt-3">
                                    📊 Showing {filteredLeads.length} of {leads.length} lead(s)
                                </p>
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <table className="min-w-full divide-y divide-amber-200 hidden md:table">
                            <thead className="bg-amber-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">District</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Confirmation %</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Date Created</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100 bg-white">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-amber-50 transition-colors">
                                        <td className="px-4 py-2 text-sm text-slate-900">{lead.name}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{lead.phone_number}</td>
                                        <td className="px-4 py-2 text-sm text-slate-700">{lead.district}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                                                    <div
                                                        className={`h-2 rounded-full ${getPercentageBarColor(lead.confirmation_percentage)}`}
                                                        style={{ width: `${lead.confirmation_percentage}%` }}
                                                    />
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPercentageColor(lead.confirmation_percentage)}`}>
                                                    {lead.confirmation_percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-slate-700">
                                            {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-4 py-2 text-sm">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right">
                                            <div className="inline-flex items-center gap-2">
                                                {lead.status === 'active' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(lead)}
                                                            className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => onConvertToCustomer(lead)}
                                                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors flex items-center gap-1"
                                                            title="Convert to Customer"
                                                        >
                                                            <CheckCircle size={14} /> Convert
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDrop(lead)}
                                                            className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                                            title="Drop Lead"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {lead.status === 'converted' && lead.converted_customer_name && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <ArrowRight size={14} /> {lead.converted_customer_name}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-sm text-muted" colSpan={7}>
                                            {leads.length === 0 ? 'No leads found.' : 'No leads match your filters.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-amber-100 bg-white">
                            {filteredLeads.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-muted">
                                    {leads.length === 0 ? 'No leads found.' : 'No leads match your filters.'}
                                </div>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <div key={lead.id} className="p-4 space-y-3 hover:bg-amber-50 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 truncate">{lead.name}</p>
                                                <p className="text-sm text-slate-600">{lead.phone_number}</p>
                                            </div>
                                            <div className="text-right">
                                                {getStatusBadge(lead.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <p className="text-slate-500 font-medium">District</p>
                                                <p className="text-slate-900 font-semibold">{lead.district}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500 font-medium">Date Created</p>
                                                <p className="text-slate-900 font-semibold">
                                                    {new Date(lead.created_at).toLocaleDateString('en-IN', {
                                                        year: '2-digit',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-slate-500 font-medium mb-2">Confirmation Percentage</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${getPercentageBarColor(lead.confirmation_percentage)}`}
                                                        style={{ width: `${lead.confirmation_percentage}%` }}
                                                    />
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getPercentageColor(lead.confirmation_percentage)}`}>
                                                    {lead.confirmation_percentage}%
                                                </span>
                                            </div>
                                        </div>

                                        {lead.status === 'active' && (
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(lead)}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onConvertToCustomer(lead)}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <CheckCircle size={14} /> Convert
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDrop(lead)}
                                                    className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        )}

                                        {lead.status === 'converted' && lead.converted_customer_name && (
                                            <div className="pt-2 text-xs text-green-600 flex items-center gap-1">
                                                <ArrowRight size={14} /> Converted to: {lead.converted_customer_name}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingLead && (
                <UnconfirmedLeadForm
                    editData={editingLead}
                    onSuccess={handleEditSuccess}
                    onCancel={() => {
                        setIsEditModalOpen(false);
                        setEditingLead(null);
                    }}
                />
            )}
        </>
    );
}
