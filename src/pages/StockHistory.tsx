import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    STORE_DISTRICTS, BRANDS, DCR_TYPES,
    REGULAR_INVERTER_TYPES, HYBRID_INVERTER_TYPES,
    PANEL_WATTAGES, COMPONENT_SHORT_LABELS,
    calculateExpectedPanelsFromInverters,
    type StockComponent,
} from '../config/stockConfig';
import { History, Filter, ChevronLeft, ChevronRight, Camera, Download } from 'lucide-react';

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

/** Column definition for the flat table */
interface ColDef {
    key: string;
    label: string;
    shortLabel: string;
    group: 'meta' | 'inverter' | 'hybrid_inverter' | 'panel' | 'simple' | 'calculated';
    colorClass: string;
}

function buildColumns(): ColDef[] {
    const cols: ColDef[] = [];
    // Regular Inverters
    REGULAR_INVERTER_TYPES.forEach(t => {
        cols.push({ key: `inv:${t}`, label: `Inverter ${t}`, shortLabel: `Inv ${t}`, group: 'inverter', colorClass: 'text-indigo-600' });
    });
    // Hybrid Inverters
    HYBRID_INVERTER_TYPES.forEach(t => {
        cols.push({ key: `inv:${t}`, label: `Hybrid ${t}`, shortLabel: `${t}`, group: 'hybrid_inverter', colorClass: 'text-purple-600' });
    });
    // Panels
    PANEL_WATTAGES.forEach(w => {
        cols.push({ key: `panel:${w}`, label: `Panel ${w}W`, shortLabel: `P ${w}`, group: 'panel', colorClass: 'text-amber-600' });
    });
    // Panel Total
    cols.push({ key: 'panel:total', label: 'Panel Total', shortLabel: 'P Total', group: 'calculated', colorClass: 'text-amber-800 font-bold' });
    // Panel per Inverter
    cols.push({ key: 'panel:perInv', label: 'Panel/Inv', shortLabel: 'P/Inv', group: 'calculated', colorClass: 'text-purple-600 font-bold' });
    // Simple
    SIMPLE_COMPONENTS.forEach(c => {
        cols.push({ key: `simple:${c}`, label: COMPONENT_SHORT_LABELS[c], shortLabel: COMPONENT_SHORT_LABELS[c], group: 'simple', colorClass: 'text-gray-600' });
    });
    return cols;
}

const COLUMNS = buildColumns();

interface FlatRow {
    id: string;
    date: string;
    time: string;           // HH:MM for inward/outward, '—' for balance
    type: 'balance' | 'inward' | 'outward';
    typeLabel: string;
    district: string;
    brand: string;
    dcr_type: string;
    values: Record<string, number>;
    notes?: string;
    createdByName?: string;
}

// ── Row-level styling ─────────────────────────────────────────────────
// Full row background tints so the type is instantly visible by color
const ROW_BG: Record<string, string> = {
    balance: 'bg-red-50',
    inward: 'bg-green-50',
    outward: 'bg-orange-50',
};
const ROW_HOVER: Record<string, string> = {
    balance: 'hover:bg-red-100/70',
    inward: 'hover:bg-green-100/70',
    outward: 'hover:bg-orange-100/70',
};
const ROW_STICKY_BG: Record<string, string> = {
    balance: 'bg-red-50',
    inward: 'bg-green-50',
    outward: 'bg-orange-50',
};
const TYPE_BADGE: Record<string, string> = {
    balance: 'bg-red-200 text-red-900',
    inward: 'bg-green-200 text-green-900',
    outward: 'bg-orange-200 text-orange-900',
};
const ROW_BORDER: Record<string, string> = {
    balance: 'border-l-4 border-l-red-500',
    inward: 'border-l-4 border-l-green-500',
    outward: 'border-l-4 border-l-orange-500',
};

/** Extract HH:MM from a created_at string */
function extractTime(createdAt?: string): string {
    if (!createdAt) return '—';
    const timePart = createdAt.includes('T')
        ? createdAt.slice(11, 16)
        : createdAt.slice(11, 16);
    return timePart || '—';
}

export default function StockHistory() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<FlatRow[]>([]);
    const [page, setPage] = useState(1);
    const pageSize = 30;

    // Filters
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterDcr, setFilterDcr] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [snapshotting, setSnapshotting] = useState(false);

    const fetchAll = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const dateFilters = {
                from_date: filterFromDate || undefined,
                to_date: filterToDate || undefined,
            };

            // Fetch all three data sources in parallel
            const [snapshots, inwardResult, outwardResult] = await Promise.all([
                stockAPI.getDailySnapshots(token, {
                    district: filterDistrict || undefined,
                    ...dateFilters,
                }),
                stockAPI.listInward(token, {
                    page: 1, limit: 200,
                    district: filterDistrict || undefined,
                    brand: filterBrand || undefined,
                    dcr_type: filterDcr || undefined,
                    ...dateFilters,
                }),
                stockAPI.listOutward(token, {
                    page: 1, limit: 200,
                    from_district: filterDistrict || undefined,
                    brand: filterBrand || undefined,
                    dcr_type: filterDcr || undefined,
                    ...dateFilters,
                }),
            ]);

            const allRows: FlatRow[] = [];

            // 1. Balance rows from snapshots (grouped by date+district+brand+dcr)
            if (!filterType || filterType === 'balance') {
                const snapGroups: Record<string, any[]> = {};
                (snapshots || []).forEach((s: any) => {
                    const key = `${s.snapshot_date}|${s.district}|${s.brand}|${s.dcr_type}`;
                    if (!snapGroups[key]) snapGroups[key] = [];
                    snapGroups[key].push(s);
                });

                for (const [key, items] of Object.entries(snapGroups)) {
                    const [date, district, brand, dcr_type] = key.split('|');
                    if (filterBrand && brand !== filterBrand) continue;
                    if (filterDcr && dcr_type !== filterDcr) continue;
                    const values: Record<string, number> = {};
                    items.forEach((item: any) => {
                        if (item.component === 'inverter' && item.sub_type) {
                            values[`inv:${item.sub_type}`] = (values[`inv:${item.sub_type}`] || 0) + item.quantity;
                        } else if (item.component === 'panel' && item.sub_type) {
                            values[`panel:${item.sub_type}`] = (values[`panel:${item.sub_type}`] || 0) + item.quantity;
                        } else if (SIMPLE_COMPONENTS.includes(item.component)) {
                            values[`simple:${item.component}`] = (values[`simple:${item.component}`] || 0) + item.quantity;
                        }
                    });
                    allRows.push({
                        id: `bal-${key}`,
                        date,
                        time: '—',
                        type: 'balance',
                        typeLabel: 'Balance',
                        district,
                        brand,
                        dcr_type,
                        values,
                    });
                }
            }

            // 2. Inward rows
            if (!filterType || filterType === 'inward') {
                (inwardResult?.data || []).forEach((rec: any) => {
                    const values: Record<string, number> = {};
                    (rec.items || []).forEach((item: any) => {
                        if (item.component === 'inverter' && item.sub_type) {
                            values[`inv:${item.sub_type}`] = (values[`inv:${item.sub_type}`] || 0) + item.actual_quantity;
                        } else if (item.component === 'panel' && item.sub_type) {
                            values[`panel:${item.sub_type}`] = (values[`panel:${item.sub_type}`] || 0) + item.actual_quantity;
                        } else if (SIMPLE_COMPONENTS.includes(item.component)) {
                            values[`simple:${item.component}`] = (values[`simple:${item.component}`] || 0) + item.actual_quantity;
                        }
                    });
                    allRows.push({
                        id: `in-${rec.id}`,
                        date: rec.created_at?.slice(0, 10) || '',
                        time: extractTime(rec.created_at),
                        type: 'inward',
                        typeLabel: 'Inward',
                        district: rec.district,
                        brand: rec.brand,
                        dcr_type: rec.dcr_type,
                        values,
                        notes: rec.notes,
                        createdByName: rec.created_by_name || '—',
                    });
                });
            }

            // 3. Outward rows
            if (!filterType || filterType === 'outward') {
                (outwardResult?.data || []).forEach((rec: any) => {
                    let typeLabel = 'Outward';
                    if (rec.dispatch_type === 'dealer') typeLabel = `Out → Dealer (${rec.dealer_name || '—'})`;
                    else if (rec.dispatch_type === 'customer') typeLabel = `Out → Customer (${rec.customer_name || '—'})`;
                    else if (rec.dispatch_type === 'store_transfer') typeLabel = `Transfer → ${rec.to_district || '—'}`;

                    const values: Record<string, number> = {};
                    (rec.items || []).forEach((item: any) => {
                        if (item.component === 'inverter' && item.sub_type) {
                            values[`inv:${item.sub_type}`] = (values[`inv:${item.sub_type}`] || 0) + item.actual_quantity;
                        } else if (item.component === 'panel' && item.sub_type) {
                            values[`panel:${item.sub_type}`] = (values[`panel:${item.sub_type}`] || 0) + item.actual_quantity;
                        } else if (SIMPLE_COMPONENTS.includes(item.component)) {
                            values[`simple:${item.component}`] = (values[`simple:${item.component}`] || 0) + item.actual_quantity;
                        }
                    });
                    allRows.push({
                        id: `out-${rec.id}`,
                        date: rec.created_at?.slice(0, 10) || '',
                        time: extractTime(rec.created_at),
                        type: 'outward',
                        typeLabel,
                        district: rec.from_district,
                        brand: rec.brand,
                        dcr_type: rec.dcr_type,
                        values,
                        notes: rec.notes,
                        createdByName: rec.created_by_name || '—',
                    });
                });
            }

            // Sort: newest date first, then inward → outward → balance within same date
            allRows.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                const typeOrder: Record<string, number> = { inward: 0, outward: 1, balance: 2 };
                return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
            });

            // Compute calculated columns
            allRows.forEach(row => {
                // Panel total — sum of all panel wattage quantities in this row
                let panelTotal = 0;
                PANEL_WATTAGES.forEach(w => { panelTotal += row.values[`panel:${w}`] || 0; });
                row.values['panel:total'] = panelTotal;

                // P/Inv (expected panels from inverter BOM) — ONLY for balance rows.
                // For inward/outward this is misleading: adding 2 inverters shows "16"
                // expected panels even though no panels were part of that entry.
                if (row.type === 'balance') {
                    const invBreakdown: Record<string, number> = {};
                    [...REGULAR_INVERTER_TYPES, ...HYBRID_INVERTER_TYPES].forEach(t => {
                        const qty = row.values[`inv:${t}`] || 0;
                        if (qty > 0) invBreakdown[t] = qty;
                    });
                    row.values['panel:perInv'] = calculateExpectedPanelsFromInverters(invBreakdown);
                } else {
                    row.values['panel:perInv'] = 0;
                }
            });

            setRows(allRows);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(1); }, [filterDistrict, filterBrand, filterDcr, filterType, filterFromDate, filterToDate]);
    useEffect(() => { fetchAll(); }, [token, filterDistrict, filterBrand, filterDcr, filterType, filterFromDate, filterToDate]);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const paginatedRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return rows.slice(start, start + pageSize);
    }, [rows, page]);

    const handleTriggerSnapshot = async () => {
        if (!token) return;
        setSnapshotting(true);
        try {
            await stockAPI.triggerSnapshot(token);
            await fetchAll();
        } catch (err) {
            console.error('Snapshot trigger failed:', err);
        } finally {
            setSnapshotting(false);
        }
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Type', 'District', 'Brand', 'By', ...COLUMNS.map(c => c.shortLabel)];
        const csvRows = [headers.join(',')];
        rows.forEach(row => {
            const cells = [
                row.date,
                row.time,
                `"${row.typeLabel}"`,
                row.district,
                row.brand,
                `"${row.type === 'balance' ? '—' : (row.createdByName || '—')}"`,
                ...COLUMNS.map(c => row.values[c.key] || 0),
            ];
            csvRows.push(cells.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-history-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History size={24} className="text-purple-600" />
                        Stock History
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Balance snapshots, inward & outward transactions</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToCSV} disabled={rows.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                        <Download size={16} />
                        Export CSV
                    </button>
                    <button onClick={handleTriggerSnapshot} disabled={snapshotting}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                        <Camera size={16} className={snapshotting ? 'animate-pulse' : ''} />
                        {snapshotting ? 'Taking...' : 'Take Snapshot Now'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm sticky top-0 z-20">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Filter size={16} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Districts</option>
                        {STORE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Brands</option>
                        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={filterDcr} onChange={e => setFilterDcr(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All DCR</option>
                        {DCR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Types</option>
                        <option value="balance">Balance</option>
                        <option value="inward">Inward</option>
                        <option value="outward">Outward</option>
                    </select>
                    <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="From" />
                    <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="To" />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
                </div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <History size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No history data found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or take a balance snapshot</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-100 z-10">Date</th>
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap">Time <span className="text-[10px] text-gray-400 font-normal">(IST)</span></th>
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap">Type</th>
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap">District</th>
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap">Brand</th>
                                    <th className="px-2 py-2.5 text-left font-bold text-gray-700 whitespace-nowrap">By</th>
                                    {COLUMNS.map(col => (
                                        <th key={col.key} className={`px-1.5 py-2.5 text-center font-bold whitespace-nowrap ${col.colorClass}`}>
                                            {col.shortLabel}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRows.map(row => {
                                    const bg = ROW_BG[row.type] || '';
                                    const hover = ROW_HOVER[row.type] || 'hover:bg-gray-50';
                                    const stickyBg = ROW_STICKY_BG[row.type] || 'bg-white';
                                    const borderL = ROW_BORDER[row.type] || '';
                                    const badge = TYPE_BADGE[row.type] || 'bg-gray-100 text-gray-600';
                                    return (
                                        <tr key={row.id}
                                            className={`${bg} ${hover} ${borderL} border-b border-gray-200/60 transition-colors`}>
                                            {/* Date — sticky */}
                                            <td className={`px-2 py-2 font-semibold text-gray-800 whitespace-nowrap sticky left-0 z-10 ${stickyBg}`}>
                                                {row.date}
                                            </td>
                                            {/* Time */}
                                            <td className="px-2 py-2 text-gray-500 whitespace-nowrap font-mono">
                                                {row.time}
                                            </td>
                                            {/* Type badge */}
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${badge}`}>
                                                    {row.typeLabel}
                                                </span>
                                            </td>
                                            {/* District */}
                                            <td className="px-2 py-2 font-semibold text-gray-800 whitespace-nowrap">{row.district}</td>
                                            {/* Brand */}
                                            <td className="px-2 py-2 font-semibold text-gray-800 whitespace-nowrap">{row.brand}</td>
                                            {/* By */}
                                            <td className="px-2 py-2 whitespace-nowrap text-gray-500 text-[11px]">
                                                {row.type === 'balance' ? '—' : (row.createdByName || '—')}
                                            </td>
                                            {/* Data columns */}
                                            {COLUMNS.map(col => {
                                                const val = row.values[col.key] || 0;
                                                const isCalc = col.group === 'calculated';
                                                return (
                                                    <td key={col.key}
                                                        className={`px-1.5 py-2 text-center font-mono ${isCalc ? 'font-extrabold' : 'font-semibold'} ${val > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                                        {val || '·'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {rows.length > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs sm:text-sm text-gray-500">
                        Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length} rows
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-3 py-1.5 text-sm text-gray-600">{page}/{totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <span className="flex items-center gap-1.5">
                    <span className="w-4 h-3 rounded border-l-4 border-l-green-500 bg-green-50 border border-green-200" />
                    <span className="font-semibold">Inward</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-4 h-3 rounded border-l-4 border-l-orange-500 bg-orange-50 border border-orange-200" />
                    <span className="font-semibold">Outward</span>
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-4 h-3 rounded border-l-4 border-l-red-500 bg-red-50 border border-red-200" />
                    <span className="font-semibold">Balance</span> <span className="text-gray-400">(auto-snapshot after every entry)</span>
                </span>
                <span className="ml-auto text-purple-600 font-semibold">P/Inv = Expected panels based on inverter BOM</span>
            </div>
        </div>
    );
}
