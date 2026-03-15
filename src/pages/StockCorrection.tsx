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
import { Shield, Filter, ChevronLeft, ChevronRight, Camera, Download, Pencil, X, Check, AlertTriangle } from 'lucide-react';

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
    REGULAR_INVERTER_TYPES.forEach(t => {
        cols.push({ key: `inv:${t}`, label: `Inverter ${t}`, shortLabel: `Inv ${t}`, group: 'inverter', colorClass: 'text-indigo-600' });
    });
    HYBRID_INVERTER_TYPES.forEach(t => {
        cols.push({ key: `inv:${t}`, label: `Hybrid ${t}`, shortLabel: `${t}`, group: 'hybrid_inverter', colorClass: 'text-purple-600' });
    });
    PANEL_WATTAGES.forEach(w => {
        cols.push({ key: `panel:${w}`, label: `Panel ${w}W`, shortLabel: `P ${w}`, group: 'panel', colorClass: 'text-amber-600' });
    });
    cols.push({ key: 'panel:total', label: 'Panel Total', shortLabel: 'P Total', group: 'calculated', colorClass: 'text-amber-800 font-bold' });
    cols.push({ key: 'panel:perInv', label: 'Panel/Inv', shortLabel: 'P/Inv', group: 'calculated', colorClass: 'text-purple-600 font-bold' });
    SIMPLE_COMPONENTS.forEach(c => {
        cols.push({ key: `simple:${c}`, label: COMPONENT_SHORT_LABELS[c], shortLabel: COMPONENT_SHORT_LABELS[c], group: 'simple', colorClass: 'text-gray-600' });
    });
    return cols;
}

const COLUMNS = buildColumns();

function colKeyForItem(component: string, sub_type: string | null): string {
    if (component === 'inverter' && sub_type) return `inv:${sub_type}`;
    if (component === 'panel' && sub_type) return `panel:${sub_type}`;
    if (['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'].includes(component)) return `simple:${component}`;
    return '';
}

interface CellLogInfo {
    logId: number;
    component: string;
    sub_type: string | null;
    movement_type: string;
    quantity_change: number;
}

interface FlatRow {
    id: string;
    date: string;
    time: string;
    type: 'balance' | 'inward' | 'outward' | 'transfer';
    typeLabel: string;
    district: string;
    brand: string;
    dcr_type: string;
    values: Record<string, number>;
    logInfo: Record<string, CellLogInfo>;
    notes?: string;
    createdByName?: string;
}

const ROW_BG: Record<string, string> = { balance: 'bg-red-100', inward: 'bg-green-100', outward: 'bg-purple-50', transfer: 'bg-blue-100' };
const ROW_HOVER: Record<string, string> = { balance: 'hover:bg-red-200/70', inward: 'hover:bg-green-200/70', outward: 'hover:bg-purple-100/70', transfer: 'hover:bg-blue-200/70' };
const ROW_STICKY_BG: Record<string, string> = { balance: 'bg-red-100', inward: 'bg-green-100', outward: 'bg-purple-50', transfer: 'bg-blue-100' };
const TYPE_BADGE: Record<string, string> = { balance: 'bg-red-200 text-red-900', inward: 'bg-green-200 text-green-900', outward: 'bg-purple-200 text-purple-900', transfer: 'bg-blue-200 text-blue-900' };
const ROW_BORDER: Record<string, string> = { balance: 'border-l-4 border-l-red-500', inward: 'border-l-4 border-l-green-500', outward: 'border-l-4 border-l-purple-500', transfer: 'border-l-4 border-l-blue-500' };

function extractTime(createdAt?: string): string {
    if (!createdAt) return '—';
    const timePart = createdAt.includes('T')
        ? createdAt.slice(11, 16)
        : createdAt.slice(11, 16);
    return timePart || '—';
}

interface EditModalState {
    rowId: string;
    colKey: string;
    logId: number;
    component: string;
    sub_type: string | null;
    movement_type: string;
    currentDisplayQty: number;
    currentQuantityChange: number;
}

export default function StockCorrection() {
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

    // Edit modal state
    const [editModal, setEditModal] = useState<EditModalState | null>(null);
    const [editNewQty, setEditNewQty] = useState('');
    const [editReason, setEditReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    const fetchAll = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const dateFilters = { from_date: filterFromDate || undefined, to_date: filterToDate || undefined };

            const [snapshots, movementResult, inwardResult, outwardResult] = await Promise.all([
                stockAPI.getDailySnapshots(token, { district: filterDistrict || undefined, ...dateFilters }),
                stockAPI.listMovementLog(token, {
                    page: 1, limit: 2000,
                    district: filterDistrict || undefined,
                    brand: filterBrand || undefined,
                    dcr_type: filterDcr || undefined,
                    ...dateFilters,
                }),
                stockAPI.listInward(token, {
                    page: 1, limit: 500,
                    district: filterDistrict || undefined,
                    brand: filterBrand || undefined,
                    dcr_type: filterDcr || undefined,
                    ...dateFilters,
                }),
                stockAPI.listOutward(token, {
                    page: 1, limit: 500,
                    from_district: filterDistrict || undefined,
                    brand: filterBrand || undefined,
                    dcr_type: filterDcr || undefined,
                    ...dateFilters,
                }),
            ]);

            // Build lookup: "reference_type:reference_id:component:sub_type" → movement log entry
            const logLookup: Record<string, any> = {};
            (movementResult?.data || []).forEach((log: any) => {
                const key = `${log.reference_type}:${log.reference_id}:${log.component}:${log.sub_type || 'NULL'}`;
                logLookup[key] = log;
            });

            const allRows: FlatRow[] = [];

            // 1. Balance rows from snapshots
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
                        const ck = colKeyForItem(item.component, item.sub_type);
                        if (ck) values[ck] = (values[ck] || 0) + item.quantity;
                    });
                    allRows.push({ id: `bal-${key}`, date, time: '—', type: 'balance', typeLabel: 'Balance', district, brand, dcr_type, values, logInfo: {} });
                }
            }

            // 2. Inward rows
            if (!filterType || filterType === 'inward') {
                (inwardResult?.data || []).forEach((rec: any) => {
                    const values: Record<string, number> = {};
                    const logInfo: Record<string, CellLogInfo> = {};
                    (rec.items || []).forEach((item: any) => {
                        const ck = colKeyForItem(item.component, item.sub_type);
                        if (!ck) return;
                        values[ck] = (values[ck] || 0) + item.actual_quantity;
                        const lookupKey = `inward:${rec.id}:${item.component}:${item.sub_type || 'NULL'}`;
                        const log = logLookup[lookupKey];
                        if (log) {
                            logInfo[ck] = {
                                logId: log.id,
                                component: item.component,
                                sub_type: item.sub_type || null,
                                movement_type: log.movement_type,
                                quantity_change: log.quantity_change,
                            };
                        }
                    });
                    allRows.push({
                        id: `in-${rec.id}`, date: rec.created_at?.slice(0, 10) || '', time: extractTime(rec.created_at),
                        type: 'inward', typeLabel: 'Inward', district: rec.district, brand: rec.brand, dcr_type: rec.dcr_type,
                        values, logInfo, notes: rec.notes, createdByName: rec.created_by_name || '—',
                    });
                });
            }

            // 3. Outward rows
            if (!filterType || filterType === 'outward') {
                (outwardResult?.data || []).forEach((rec: any) => {
                    let typeLabel = 'Outward';
                    if (rec.dispatch_type === 'dealer') typeLabel = `Out → Dealer (${rec.dealer_name || '—'})`;
                    else if (rec.dispatch_type === 'customer') typeLabel = `Out → Cust (${rec.customer_name || '—'})`;
                    else if (rec.dispatch_type === 'store_transfer') typeLabel = `Transfer → ${rec.to_district || '—'}`;

                    const isTransfer = rec.dispatch_type === 'store_transfer';

                    const values: Record<string, number> = {};
                    const logInfo: Record<string, CellLogInfo> = {};
                    (rec.items || []).forEach((item: any) => {
                        const ck = colKeyForItem(item.component, item.sub_type);
                        if (!ck) return;
                        values[ck] = (values[ck] || 0) + item.actual_quantity;
                        const lookupKey = `outward:${rec.id}:${item.component}:${item.sub_type || 'NULL'}`;
                        const log = logLookup[lookupKey];
                        if (log) {
                            logInfo[ck] = {
                                logId: log.id,
                                component: item.component,
                                sub_type: item.sub_type || null,
                                movement_type: log.movement_type,
                                quantity_change: log.quantity_change,
                            };
                        }
                    });
                    allRows.push({
                        id: `out-${rec.id}`, date: rec.created_at?.slice(0, 10) || '', time: extractTime(rec.created_at),
                        type: isTransfer ? 'transfer' : 'outward', typeLabel, district: rec.from_district, brand: rec.brand, dcr_type: rec.dcr_type,
                        values, logInfo, notes: rec.notes, createdByName: rec.created_by_name || '—',
                    });
                });
            }

            // Sort: newest date first, then inward → outward → balance within same date
            allRows.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                const typeOrder: Record<string, number> = { inward: 0, outward: 1, transfer: 2, balance: 3 };
                return (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
            });

            // Compute calculated columns
            allRows.forEach(row => {
                let panelTotal = 0;
                PANEL_WATTAGES.forEach(w => { panelTotal += row.values[`panel:${w}`] || 0; });
                row.values['panel:total'] = panelTotal;
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
    const paginatedRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

    const handleCellClick = (row: FlatRow, colKey: string) => {
        if (row.type === 'balance') return;
        if (colKey === 'panel:total' || colKey === 'panel:perInv') return;
        const info = row.logInfo[colKey];
        if (!info) return;

        const displayQty = row.values[colKey] || 0;
        setEditModal({
            rowId: row.id, colKey, logId: info.logId,
            component: info.component, sub_type: info.sub_type,
            movement_type: info.movement_type,
            currentDisplayQty: displayQty,
            currentQuantityChange: info.quantity_change,
        });
        setEditNewQty(String(displayQty));
        setEditReason('');
        setEditError('');
        setEditSuccess('');
    };

    const handleSaveEdit = async () => {
        if (!token || !editModal) return;
        if (!editReason.trim()) { setEditError('Reason is required for audit trail'); return; }
        const newQty = parseInt(editNewQty, 10);
        if (isNaN(newQty) || newQty < 0) { setEditError('Enter a valid non-negative number'); return; }

        // For outward, quantity_change is negative
        const isOutward = editModal.movement_type.startsWith('outward') || editModal.movement_type === 'transfer_out';
        const newQuantityChange = isOutward ? -newQty : newQty;

        setSaving(true);
        setEditError('');
        try {
            const result = await stockAPI.correctMovementLog(token, editModal.logId, {
                new_quantity_change: newQuantityChange,
                reason: editReason.trim(),
            });
            setEditSuccess(
                `✅ Done! Balance: ${result.newBalance}. ${result.subsequentRowsCorrected} entries recascaded, ${result.snapshotsRegenerated} snapshots regenerated.`
            );
            setTimeout(() => { setEditModal(null); fetchAll(); }, 1800);
        } catch (err: any) {
            setEditError(err.message || 'Failed to apply correction');
        } finally {
            setSaving(false);
        }
    };

    const handleTriggerSnapshot = async () => {
        if (!token) return;
        setSnapshotting(true);
        try { await stockAPI.triggerSnapshot(token); await fetchAll(); } catch (err) { console.error(err); } finally { setSnapshotting(false); }
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Type', 'District', 'Brand', 'By', ...COLUMNS.map(c => c.shortLabel)];
        const csvRows = [headers.join(',')];
        rows.forEach(row => {
            csvRows.push([row.date, row.time, `"${row.typeLabel}"`, row.district, row.brand,
            `"${row.type === 'balance' ? '—' : (row.createdByName || '—')}"`,
            ...COLUMNS.map(c => row.values[c.key] || 0)].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `stock-correction-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={24} className="text-red-600" />
                        Stock Correction
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold uppercase tracking-wide">Master Admin</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Click any value in green/orange rows to edit. Everything auto-corrects.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportToCSV} disabled={rows.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
                        <Download size={16} /> Export CSV
                    </button>
                    <button onClick={handleTriggerSnapshot} disabled={snapshotting}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                        <Camera size={16} className={snapshotting ? 'animate-pulse' : ''} />
                        {snapshotting ? 'Taking...' : 'Snapshot'}
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
                    <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Districts</option>
                        {STORE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Brands</option>
                        {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={filterDcr} onChange={e => setFilterDcr(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All DCR</option>
                        {DCR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">All Types</option>
                        <option value="balance">Balance</option>
                        <option value="inward">Inward</option>
                        <option value="outward">Outward</option>
                    </select>
                    <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="From" />
                    <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="To" />
                </div>
            </div>

            {/* How-to Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                    <p className="font-semibold">How to correct an entry:</p>
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                        <li>Click any number in a <span className="font-bold text-green-700">green (inward)</span> or <span className="font-bold text-orange-700">orange (outward)</span> row</li>
                        <li>Enter the correct quantity + a reason for the change</li>
                        <li>System auto-corrects: movement log chain → inventory balance → all snapshots</li>
                    </ol>
                    <p className="mt-1 text-amber-600 font-medium">Balance (red) rows auto-update when you correct an entry.</p>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" /></div>
            ) : rows.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No history data found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or take a balance snapshot</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-14rem)]">
                        <table className="w-full text-xl">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-100 z-30 shadow-[2px_0_5px_-1px_rgba(0,0,0,0.12)]">Date</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Time <span className="text-xs text-gray-400 font-normal">(IST)</span></th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Type</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">District</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Brand</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">By</th>
                                    {COLUMNS.map(col => (
                                        <th key={col.key} className={`px-2 py-3 text-center font-bold whitespace-nowrap ${col.colorClass}`}>{col.shortLabel}</th>
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
                                    const isEditable = row.type === 'inward' || row.type === 'outward' || row.type === 'transfer';

                                    return (
                                        <tr key={row.id} className={`${bg} ${hover} border-b border-gray-200/60 transition-colors`}>
                                            <td className={`px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap sticky left-0 z-20 ${stickyBg} ${borderL} shadow-[2px_0_5px_-1px_rgba(0,0,0,0.08)]`}>{row.date}</td>
                                            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap font-mono">{row.time}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-base font-extrabold tracking-wide uppercase ${badge}`}>{row.typeLabel}</span>
                                            </td>
                                            <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{row.district}</td>
                                            <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{row.brand}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 text-base">
                                                {row.type === 'balance' ? '—' : (row.createdByName || '—')}
                                            </td>
                                            {COLUMNS.map(col => {
                                                const val = row.values[col.key] || 0;
                                                const isCalc = col.group === 'calculated';
                                                const hasLog = isEditable && row.logInfo[col.key];
                                                const cellEditable = hasLog && !isCalc;

                                                return (
                                                    <td key={col.key}
                                                        onClick={() => cellEditable && handleCellClick(row, col.key)}
                                                        className={`px-2 py-2.5 text-center font-mono
                                                            ${isCalc ? 'font-extrabold' : 'font-semibold'}
                                                            ${val > 0 ? 'text-gray-900' : 'text-gray-300'}
                                                            ${cellEditable ? 'cursor-pointer hover:bg-blue-100 hover:ring-2 hover:ring-blue-400 hover:ring-inset rounded transition-all relative group' : ''}`}
                                                        title={cellEditable ? `Click to edit (Log #${row.logInfo[col.key]!.logId})` : undefined}>
                                                        <span className="relative">
                                                            {val || '·'}
                                                            {cellEditable && val > 0 && (
                                                                <Pencil size={10} className="absolute -top-1 -right-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </span>
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
                        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {rows.length} rows
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
                <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded border-l-4 border-l-green-500 bg-green-100 border border-green-200" /><span className="font-semibold">Inward</span> <span className="text-blue-500">(editable)</span></span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded border-l-4 border-l-purple-500 bg-purple-50 border border-purple-200" /><span className="font-semibold">Outward</span> <span className="text-blue-500">(editable)</span></span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded border-l-4 border-l-blue-500 bg-blue-100 border border-blue-200" /><span className="font-semibold">Transfer</span> <span className="text-blue-500">(editable)</span></span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded border-l-4 border-l-red-500 bg-red-100 border border-red-200" /><span className="font-semibold">Balance</span> <span className="text-gray-400">(auto-corrected)</span></span>
                <span className="flex items-center gap-1.5"><Pencil size={12} className="text-blue-400" /> Hover on a value to see edit icon</span>
            </div>

            {/* ── EDIT MODAL ── */}
            {editModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Pencil size={20} className="text-blue-600" /> Edit Stock Entry
                            </h2>
                            <button onClick={() => setEditModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                            <p><span className="font-semibold text-gray-600">Component:</span> {editModal.component}{editModal.sub_type ? ` (${editModal.sub_type})` : ''}</p>
                            <p><span className="font-semibold text-gray-600">Movement:</span> <span className="uppercase">{editModal.movement_type}</span></p>
                            <p><span className="font-semibold text-gray-600">Log ID:</span> #{editModal.logId}</p>
                            <p><span className="font-semibold text-gray-600">Current Qty:</span> <span className="text-red-600 font-bold text-lg">{editModal.currentDisplayQty}</span></p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">New Quantity <span className="text-red-500">*</span></label>
                            <input type="number" min="0" value={editNewQty}
                                onChange={e => setEditNewQty(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                autoFocus />
                            {editNewQty !== String(editModal.currentDisplayQty) && (
                                <p className="text-xs mt-1 text-blue-600">
                                    Change: {editModal.currentDisplayQty} → {editNewQty}
                                    {editModal.movement_type.startsWith('outward') || editModal.movement_type === 'transfer_out'
                                        ? ` (stored as -${editNewQty} in movement log)`
                                        : ` (stored as +${editNewQty} in movement log)`
                                    }
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Correction <span className="text-red-500">*</span></label>
                            <textarea value={editReason} onChange={e => setEditReason(e.target.value)}
                                placeholder="e.g. Wrong count entered, actual quantity was different, inward instead of outward..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none" />
                        </div>

                        {editError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />{editError}
                            </div>
                        )}
                        {editSuccess && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-start gap-2">
                                <Check size={16} className="flex-shrink-0 mt-0.5" />{editSuccess}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditModal(null)} disabled={saving}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleSaveEdit}
                                disabled={saving || !editReason.trim() || editNewQty === String(editModal.currentDisplayQty)}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                {saving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Applying...</>) : (<><Check size={16} /> Apply Correction</>)}
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 text-center">
                            Updates movement log → inward/outward items → recascades chain → inventory → snapshots
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
