import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { qaTravelAPI } from '../services/api';
import { Car, MapPin, Image, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, RotateCcw, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type CustomerVisit = {
    id: number;
    customer_name: string;
    status: 'Completed' | 'Pending';
    pending_reason: string | null;
};

type TravelLogRow = {
    id: number;
    employee_id: number;
    employee_name: string;
    travel_date: string;
    start_reading: number | null;
    start_image_url: string | null;
    start_latitude: number | null;
    start_longitude: number | null;
    start_time: string | null;
    end_reading: number | null;
    end_image_url: string | null;
    end_latitude: number | null;
    end_longitude: number | null;
    end_time: string | null;
    total_distance: number | null;
    customers: CustomerVisit[];
};

type PaginationInfo = { page: number; limit: number; total: number; totalPages: number };
type Stats = { total_distance_sum: string; avg_distance: string };

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDateIST(date?: string | null) {
    if (!date) return '—';
    const d = new Date(date + 'T00:00:00+05:30');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTimeIST(time?: string | null) {
    if (!time) return '—';
    let iso = time;
    if (time.includes(' ') && !time.includes('T')) iso = time.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

function mapsUrl(lat?: number | null, lng?: number | null) {
    if (!lat || !lng) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getApiOrigin() {
    return import.meta.env.VITE_API_ORIGIN || (import.meta.env.VITE_API_BASE?.replace('/api', '') ?? '');
}

function fullImageUrl(url?: string | null) {
    if (!url) return null;
    return url.startsWith('http') ? url : `${getApiOrigin()}${url}`;
}

// ─── ImageViewButton ──────────────────────────────────────────────────────

function ImageViewButton({ url, label, onPreview }: { url?: string | null; label: string; onPreview: (url: string, title: string) => void }) {
    const full = fullImageUrl(url);
    if (!full) return <span className="text-xs text-gray-400">—</span>;
    return (
        <button
            onClick={() => onPreview(full, label)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
        >
            <Image size={12} /> View
        </button>
    );
}

// ─── LocationCell ─────────────────────────────────────────────────────────

function LocationCell({ lat, lng }: { lat?: number | null; lng?: number | null }) {
    const url = mapsUrl(lat, lng);
    if (!url) return <span className="text-xs text-gray-400">—</span>;
    return (
        <div className="space-y-0.5">
            <p className="text-xs text-gray-600">{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                <MapPin size={10} /> Map
            </a>
        </div>
    );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────

function StatusBadge({ row }: { row: TravelLogRow }) {
    const complete = !!row.end_time;
    return complete ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
            Complete
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 whitespace-nowrap">
            Pending End
        </span>
    );
}

// ─── CustomerVisitsDetail ────────────────────────────────────────────────

function CustomerVisitsDetail({ customers }: { customers: CustomerVisit[] }) {
    if (!customers.length) return <p className="text-xs text-gray-400 italic">No customer visits logged.</p>;
    return (
        <table className="w-full text-xs border-collapse">
            <thead>
                <tr className="bg-gray-50">
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-600">#</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-600">Customer Name</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-600">Pending Reason</th>
                </tr>
            </thead>
            <tbody>
                {customers.map((c, i) => (
                    <tr key={c.id} className="border-t border-gray-100">
                        <td className="px-3 py-1.5 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-800">{c.customer_name}</td>
                        <td className="px-3 py-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {c.status}
                            </span>
                        </td>
                        <td className="px-3 py-1.5 text-orange-600">{c.pending_reason || '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ─── ExpandedRow ─────────────────────────────────────────────────────────

function ExpandedRow({ row, onPreview }: { row: TravelLogRow; onPreview: (url: string, title: string) => void }) {
    const startFull = fullImageUrl(row.start_image_url);
    const endFull = fullImageUrl(row.end_image_url);
    return (
        <tr>
            <td colSpan={13} className="px-4 py-4 bg-gray-50 border-b border-gray-200">
                <div className="space-y-4">
                    {/* Photos */}
                    <div className="flex gap-4 flex-wrap">
                        {startFull && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-600">Start Speedometer</p>
                                <img
                                    src={startFull}
                                    alt="Start Speedometer"
                                    className="h-28 w-28 rounded-xl object-cover border border-gray-200 cursor-pointer hover:opacity-80"
                                    onClick={() => onPreview(startFull, 'Start Speedometer')}
                                />
                            </div>
                        )}
                        {endFull && (
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-600">End Speedometer</p>
                                <img
                                    src={endFull}
                                    alt="End Speedometer"
                                    className="h-28 w-28 rounded-xl object-cover border border-gray-200 cursor-pointer hover:opacity-80"
                                    onClick={() => onPreview(endFull, 'End Speedometer')}
                                />
                            </div>
                        )}
                    </div>

                    {/* Customer visits */}
                    <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">Customer Visits</p>
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <CustomerVisitsDetail customers={row.customers} />
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function TravelAllowanceReview() {
    const { token } = useAuth();

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [testers, setTesters] = useState<{ id: number; name: string }[]>([]);

    // Data
    const [rows, setRows] = useState<TravelLogRow[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 30, total: 0, totalPages: 1 });
    const [stats, setStats] = useState<Stats>({ total_distance_sum: '0.0', avg_distance: '0.0' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI state
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchTesters = useCallback(async () => {
        try {
            const data = await qaTravelAPI.getQATesters(token!);
            setTesters(data);
        } catch { /* ignore */ }
    }, [token]);

    const fetchLogs = useCallback(async (page = 1) => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const result = await qaTravelAPI.getLogs(token, {
                page,
                limit: 30,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                employee_id: employeeId || undefined,
            });
            setRows(result.data || []);
            setPagination(result.pagination);
            setStats(result.stats);
        } catch (e: any) {
            setError(e?.message || 'Failed to load travel logs');
        } finally {
            setLoading(false);
        }
    }, [token, dateFrom, dateTo, employeeId]);

    useEffect(() => { fetchTesters(); }, [fetchTesters]);
    useEffect(() => { fetchLogs(currentPage); }, [fetchLogs, currentPage]);

    const handleFilter = () => { setCurrentPage(1); fetchLogs(1); };
    const handleReset = () => {
        setDateFrom(''); setDateTo(''); setEmployeeId('');
        setCurrentPage(1);
    };

    const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
            {/* Image preview */}
            {previewUrl && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="flex items-center justify-between w-full max-w-2xl mb-3">
                        <p className="text-white font-semibold">{previewTitle}</p>
                        <button className="text-white/70 hover:text-white" onClick={() => setPreviewUrl(null)}><X size={20} /></button>
                    </div>
                    <img src={previewUrl} alt={previewTitle} className="max-w-full max-h-[80vh] rounded-2xl object-contain" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <Car className="text-teal-600" size={24} />
                        <h1 className="text-2xl font-bold text-gray-900">Travel Allowance Review</h1>
                    </div>
                    <p className="text-sm text-gray-500">Review QA Tester daily travel distance & customer visit logs</p>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                        <Filter size={14} /> Filters
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date From</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Date To</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Employee</label>
                        <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[160px]">
                            <option value="">All Testers</option>
                            {testers.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleFilter}
                        className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                        Apply
                    </button>
                    <button onClick={handleReset}
                        className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm px-3 py-2 rounded-lg transition-colors">
                        <RotateCcw size={13} /> Reset
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                </div>
                <div className="bg-teal-50 rounded-2xl border border-teal-100 shadow-sm p-4">
                    <p className="text-xs text-teal-600 mb-1">Total Distance</p>
                    <p className="text-2xl font-bold text-teal-800">{stats.total_distance_sum} km</p>
                </div>
                <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-4">
                    <p className="text-xs text-blue-600 mb-1">Avg Distance / Day</p>
                    <p className="text-2xl font-bold text-blue-800">{stats.avg_distance} km</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                    {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                        <Car size={36} className="text-gray-300" />
                        <p className="text-gray-500 font-medium">No travel logs found</p>
                        <p className="text-xs text-gray-400">Try adjusting the filters above</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Employee</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Start Time</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Start (km)</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Start Photo</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Start Location</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">End Time</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">End (km)</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">End Photo</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">End Location</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Distance</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Customers</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(row => {
                                    const isExpanded = expandedId === row.id;
                                    const rowBg = row.end_time ? 'hover:bg-green-50/40' : 'hover:bg-orange-50/40';
                                    return (
                                        <>
                                            <tr
                                                key={`row-${row.id}`}
                                                className={`border-b border-gray-50 cursor-pointer transition-colors ${rowBg}`}
                                                onClick={() => toggleExpand(row.id)}
                                            >
                                                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{formatDateIST(row.travel_date)}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.employee_name}</td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTimeIST(row.start_time)}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.start_reading != null ? Number(row.start_reading).toLocaleString() : '—'}</td>
                                                <td className="px-4 py-3">
                                                    <ImageViewButton url={row.start_image_url} label="Start Speedometer" onPreview={(u, t) => { setPreviewUrl(u); setPreviewTitle(t); }} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <LocationCell lat={row.start_latitude} lng={row.start_longitude} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTimeIST(row.end_time)}</td>
                                                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.end_reading != null ? Number(row.end_reading).toLocaleString() : '—'}</td>
                                                <td className="px-4 py-3">
                                                    <ImageViewButton url={row.end_image_url} label="End Speedometer" onPreview={(u, t) => { setPreviewUrl(u); setPreviewTitle(t); }} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <LocationCell lat={row.end_latitude} lng={row.end_longitude} />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`font-bold text-sm ${row.total_distance != null ? 'text-teal-700' : 'text-gray-400'}`}>
                                                        {row.total_distance != null ? `${Number(row.total_distance).toFixed(1)} km` : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); toggleExpand(row.id); }}
                                                        className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium px-2 py-0.5 rounded-full"
                                                    >
                                                        {row.customers?.length ?? 0} visits
                                                        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge row={row} />
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <ExpandedRow
                                                    key={`exp-${row.id}`}
                                                    row={row}
                                                    onPreview={(u, t) => { setPreviewUrl(u); setPreviewTitle(t); }}
                                                />
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-gray-500">
                        Showing {((currentPage - 1) * pagination.limit) + 1}–{Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} records
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="text-xs text-gray-600 font-medium">
                            Page {currentPage} / {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="flex items-center gap-1 text-sm px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
