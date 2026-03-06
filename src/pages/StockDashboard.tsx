import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    STORE_DISTRICTS, BRANDS, DCR_TYPES,
    REGULAR_INVERTER_TYPES, HYBRID_INVERTER_TYPES,
    PANEL_WATTAGES, COMPONENT_SHORT_LABELS,
    type InventoryItem, type StockComponent,
} from '../config/stockConfig';
import { Package, MapPin, Filter, BarChart3, RefreshCw } from 'lucide-react';

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

export default function StockDashboard() {
    const { token } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterDcr, setFilterDcr] = useState('');

    const fetchInventory = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await stockAPI.getInventory(token, {
                district: filterDistrict || undefined,
                brand: filterBrand || undefined,
                dcr_type: filterDcr || undefined,
            });
            setInventory(data);
        } catch (err) {
            console.error('Failed to fetch inventory:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, [token, filterDistrict, filterBrand, filterDcr]);

    // Summary totals by component+sub_type
    const summaryCards = useMemo(() => {
        const cards: { label: string; value: number; color: string }[] = [];
        // Regular Inverter totals by sub_type
        let totalInverters = 0;
        REGULAR_INVERTER_TYPES.forEach(t => {
            const qty = inventory.filter(i => i.component === 'inverter' && i.sub_type === t).reduce((s, i) => s + i.quantity, 0);
            totalInverters += qty;
            if (qty > 0) cards.push({ label: `Inv ${t}`, value: qty, color: 'bg-indigo-50 text-indigo-700' });
        });
        // Hybrid Inverter totals by sub_type
        HYBRID_INVERTER_TYPES.forEach(t => {
            const qty = inventory.filter(i => i.component === 'inverter' && i.sub_type === t).reduce((s, i) => s + i.quantity, 0);
            totalInverters += qty;
            if (qty > 0) cards.push({ label: `${t}`, value: qty, color: 'bg-purple-50 text-purple-700' });
        });
        // Panel totals by wattage
        let totalPanels = 0;
        PANEL_WATTAGES.forEach(w => {
            const qty = inventory.filter(i => i.component === 'panel' && i.sub_type === w).reduce((s, i) => s + i.quantity, 0);
            totalPanels += qty;
            if (qty > 0) cards.push({ label: `P ${w}W`, value: qty, color: 'bg-amber-50 text-amber-700' });
        });
        // Simple components
        SIMPLE_COMPONENTS.forEach(c => {
            const qty = inventory.filter(i => i.component === c).reduce((s, i) => s + i.quantity, 0);
            cards.push({ label: COMPONENT_SHORT_LABELS[c], value: qty, color: 'bg-gray-50 text-gray-700' });
        });
        return { cards, totalInverters, totalPanels };
    }, [inventory]);

    const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);

    // Group by district
    const districtGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            if (!groups[item.district]) groups[item.district] = [];
            groups[item.district].push(item);
        });
        return groups;
    }, [inventory]);

    return (
        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package size={24} className="text-blue-600" />
                        Stock Dashboard
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Real-time inventory across all district stores</p>
                </div>
                <button onClick={fetchInventory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {summaryCards.cards.map(card => (
                    <div key={card.label} className={`rounded-xl border border-gray-200 p-3 shadow-sm ${card.color}`}>
                        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{card.label}</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="bg-blue from-blue-600 to-blue-700 rounded-xl p-4 sm:p-5 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm">Total Stock Units</p>
                        <p className="text-2xl sm:text-3xl font-bold">{totalStock}</p>
                        <p className="text-blue-200 text-xs mt-1">
                            {summaryCards.totalInverters} inverters · {summaryCards.totalPanels} panels
                        </p>
                    </div>
                    <BarChart3 size={36} className="text-blue-200" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Filter size={16} className="text-gray-500" />
                    <h3 className="font-semibold text-gray-700 text-sm">Filters</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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
                        <option value="">All DCR Types</option>
                        {DCR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* Per-District Tables */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
            ) : Object.keys(districtGroups).length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No inventory data found</p>
                    <p className="text-gray-400 text-sm mt-1">Stock will appear here once inward entries are made</p>
                </div>
            ) : (
                Object.entries(districtGroups).map(([district, items]) => (
                    <DistrictCard key={district} district={district} items={items} />
                ))
            )}
        </div>
    );
}

function DistrictCard({ district, items }: { district: string; items: InventoryItem[] }) {
    // Group by brand+dcr, then show sub_type breakdown
    const grouped = useMemo(() => {
        const map: Record<string, InventoryItem[]> = {};
        items.forEach(item => {
            const key = `${item.brand} / ${item.dcr_type}`;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [items]);

    const districtTotal = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{district}</h3>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-500">Total: {districtTotal}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">Brand / DCR</th>
                            {REGULAR_INVERTER_TYPES.map(t => (
                                <th key={`inv-${t}`} className="px-2 py-2 text-center font-semibold text-indigo-600 whitespace-nowrap">Inv {t}</th>
                            ))}
                            {HYBRID_INVERTER_TYPES.map(t => (
                                <th key={`inv-${t}`} className="px-2 py-2 text-center font-semibold text-purple-600 whitespace-nowrap">{t}</th>
                            ))}
                            {PANEL_WATTAGES.map(w => (
                                <th key={`p-${w}`} className="px-2 py-2 text-center font-semibold text-amber-600 whitespace-nowrap">P {w}</th>
                            ))}
                            {SIMPLE_COMPONENTS.map(c => (
                                <th key={c} className="px-2 py-2 text-center font-semibold text-gray-600 whitespace-nowrap">{COMPONENT_SHORT_LABELS[c]}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {Object.entries(grouped).map(([key, groupItems]) => (
                            <tr key={key} className="hover:bg-blue-50/50">
                                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{key}</td>
                                {REGULAR_INVERTER_TYPES.map(t => {
                                    const qty = groupItems.find(i => i.component === 'inverter' && i.sub_type === t)?.quantity || 0;
                                    return (
                                        <td key={`inv-${t}`} className="px-2 py-2 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-xs font-bold ${qty > 0 ? 'bg-indigo-100 text-indigo-700' : 'text-gray-300'}`}>
                                                {qty || '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                                {HYBRID_INVERTER_TYPES.map(t => {
                                    const qty = groupItems.find(i => i.component === 'inverter' && i.sub_type === t)?.quantity || 0;
                                    return (
                                        <td key={`inv-${t}`} className="px-2 py-2 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-xs font-bold ${qty > 0 ? 'bg-purple-100 text-purple-700' : 'text-gray-300'}`}>
                                                {qty || '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                                {PANEL_WATTAGES.map(w => {
                                    const qty = groupItems.find(i => i.component === 'panel' && i.sub_type === w)?.quantity || 0;
                                    return (
                                        <td key={`p-${w}`} className="px-2 py-2 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-xs font-bold ${qty > 0 ? 'bg-amber-100 text-amber-700' : 'text-gray-300'}`}>
                                                {qty || '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                                {SIMPLE_COMPONENTS.map(c => {
                                    const qty = groupItems.find(i => i.component === c && !i.sub_type)?.quantity || 0;
                                    return (
                                        <td key={c} className="px-2 py-2 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-xs font-bold ${qty > 0 ? 'bg-green-100 text-green-700' : 'text-gray-300'}`}>
                                                {qty || '·'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
