import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    COMPONENT_LABELS, STORE_DISTRICTS, NON_TATA_BRANDS,
    DCR_TYPES, SYSTEM_TYPES, PANEL_WATTAGES, INVERTER_TYPES,
    calculatePlannedComponents, calculateInverterBreakdown,
    type StockComponent,
} from '../config/stockConfig';
import { ArrowDownToLine, Package, CheckCircle, AlertCircle } from 'lucide-react';

type SystemQuantities = Record<string, number>;
type PanelBreakdown = Record<string, number>;

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

export default function StockInward() {
    const { token } = useAuth();

    // Form state
    const [district, setDistrict] = useState('');
    const [brandType, setBrandType] = useState<'Tata' | 'Non-Tata'>('Tata');
    const [nonTataBrand, setNonTataBrand] = useState(NON_TATA_BRANDS[0]);
    const [dcrType, setDcrType] = useState<'DCR' | 'Non-DCR'>('DCR');
    const [systems, setSystems] = useState<SystemQuantities>(() => {
        const init: SystemQuantities = {};
        SYSTEM_TYPES.forEach(s => { init[s] = 0; });
        return init;
    });
    const [panelBreakdown, setPanelBreakdown] = useState<PanelBreakdown>(() => {
        const init: PanelBreakdown = {};
        PANEL_WATTAGES.forEach(w => { init[w] = 0; });
        return init;
    });
    const [simpleOverrides, setSimpleOverrides] = useState<Partial<Record<StockComponent, number>>>({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const resolvedBrand = brandType === 'Tata' ? 'Tata' : nonTataBrand;

    // Auto-calculated values
    const planned = useMemo(() => calculatePlannedComponents(systems), [systems]);
    const inverterBreakdown = useMemo(() => calculateInverterBreakdown(systems), [systems]);
    const totalPanelsPlanned = planned.panel;
    const totalPanelsEntered = useMemo(() => Object.values(panelBreakdown).reduce((s, v) => s + v, 0), [panelBreakdown]);
    const hasAnySystems = Object.values(systems).some(v => v > 0);

    // Handlers
    const updateSystem = (sysType: string, value: number) => {
        setSystems(prev => ({ ...prev, [sysType]: Math.max(0, value) }));
    };

    const updatePanelWattage = (wattage: string, value: number) => {
        setPanelBreakdown(prev => ({ ...prev, [wattage]: Math.max(0, value) }));
    };

    const updateSimpleOverride = (comp: StockComponent, value: number) => {
        setSimpleOverrides(prev => ({ ...prev, [comp]: Math.max(0, value) }));
    };

    const resetSimpleOverride = (comp: StockComponent) => {
        setSimpleOverrides(prev => {
            const next = { ...prev };
            delete next[comp];
            return next;
        });
    };

    const resetForm = () => {
        setDistrict('');
        setBrandType('Tata');
        setNonTataBrand(NON_TATA_BRANDS[0]);
        setDcrType('DCR');
        const initSys: SystemQuantities = {};
        SYSTEM_TYPES.forEach(s => { initSys[s] = 0; });
        setSystems(initSys);
        const initPanels: PanelBreakdown = {};
        PANEL_WATTAGES.forEach(w => { initPanels[w] = 0; });
        setPanelBreakdown(initPanels);
        setSimpleOverrides({});
        setNotes('');
    };

    const handleSubmit = async () => {
        if (!district) { setResult({ type: 'error', message: 'Please select a district store' }); return; }
        if (!hasAnySystems) { setResult({ type: 'error', message: 'Please enter at least one system quantity' }); return; }
        if (totalPanelsEntered === 0 && totalPanelsPlanned > 0) {
            setResult({ type: 'error', message: 'Please enter panel wattage breakdown' }); return;
        }
        if (!token) return;

        setSubmitting(true);
        setResult(null);

        // Build simple component items for overrides
        const simpleItems = SIMPLE_COMPONENTS.map(comp => ({
            component: comp,
            actual_quantity: simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp],
        })).filter(i => i.actual_quantity > 0);

        try {
            await stockAPI.createInward(token, {
                district,
                brand: resolvedBrand,
                dcr_type: dcrType,
                systems,
                panel_breakdown: panelBreakdown,
                items: simpleItems,
                notes: notes || undefined,
            });
            setResult({ type: 'success', message: `Stock inward recorded successfully for ${district} (${resolvedBrand} ${dcrType})` });
            resetForm();
        } catch (err: any) {
            setResult({ type: 'error', message: err.message || 'Failed to record stock inward' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ArrowDownToLine size={24} className="text-green-600" />
                    Stock Inward
                </h1>
                <p className="text-gray-500 text-sm mt-1">Record incoming stock to a district store</p>
            </div>

            {/* Notification */}
            {result && (
                <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border ${result.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium text-sm">{result.message}</span>
                    <button onClick={() => setResult(null)} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Step 1: Store & Brand */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Package size={18} />
                    Dispatch Information
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                    {/* District */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store District *</label>
                        <select value={district} onChange={e => setDistrict(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                            <option value="">Select District Store</option>
                            {STORE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    {/* Brand Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand Type *</label>
                        <div className="flex gap-4">
                            {(['Tata', 'Non-Tata'] as const).map(bt => (
                                <label key={bt} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="brandType" value={bt} checked={brandType === bt}
                                        onChange={() => setBrandType(bt)} className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-sm">{bt}</span>
                                </label>
                            ))}
                        </div>
                        {brandType === 'Non-Tata' && (
                            <select value={nonTataBrand} onChange={e => setNonTataBrand(e.target.value as typeof nonTataBrand)}
                                className="mt-3 w-full sm:w-64 px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                                {NON_TATA_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        )}
                    </div>
                    {/* DCR Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">DCR Type *</label>
                        <div className="flex gap-4">
                            {DCR_TYPES.map(d => (
                                <label key={d} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="dcrType" value={d} checked={dcrType === d}
                                        onChange={() => setDcrType(d as 'DCR' | 'Non-DCR')} className="w-4 h-4 text-blue-600" />
                                    <span className="font-medium text-sm">{d}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Any additional notes about this inward entry..." />
                    </div>
                </div>
            </div>

            {/* Step 2: System Types */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">
                    System Type Quantities
                </div>
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {SYSTEM_TYPES.map(sysType => (
                            <div key={sysType} className="bg-blue-50 rounded-xl p-3 sm:p-4 text-center border border-blue-100">
                                <label className="block text-xs sm:text-sm font-bold text-blue-800 mb-1 sm:mb-2">{sysType}</label>
                                <input type="number" min={0} value={systems[sysType]}
                                    onChange={e => updateSystem(sysType, parseInt(e.target.value) || 0)}
                                    className="w-full text-center text-base sm:text-lg font-bold px-2 py-1.5 sm:py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step 3: Inverter Breakdown (auto-calculated, read-only) */}
            {hasAnySystems && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">
                        Inverter Breakdown (Auto-calculated)
                    </div>
                    <div className="p-4 sm:p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {INVERTER_TYPES.filter(t => (inverterBreakdown[t] || 0) > 0).map(invType => (
                                <div key={invType} className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                                    <span className="block text-xs font-bold text-indigo-800 mb-1">{invType}</span>
                                    <span className="text-lg font-bold text-indigo-700">{inverterBreakdown[invType]}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">1 inverter per system — type matches system type</p>
                    </div>
                </div>
            )}

            {/* Step 4: Panel Wattage Breakdown */}
            {hasAnySystems && totalPanelsPlanned > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-amber-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                        <span>Panel Wattage Breakdown</span>
                        <span className="text-xs sm:text-sm font-normal opacity-90">
                            {totalPanelsEntered} / {totalPanelsPlanned} panels
                        </span>
                    </div>
                    <div className="p-4 sm:p-5">
                        {totalPanelsEntered !== totalPanelsPlanned && totalPanelsEntered > 0 && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                                ⚠️ Entered panels ({totalPanelsEntered}) ≠ BOM planned ({totalPanelsPlanned}). You can still submit.
                            </div>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                            {PANEL_WATTAGES.map(wattage => (
                                <div key={wattage} className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                                    <label className="block text-xs font-bold text-amber-800 mb-1">{wattage}W</label>
                                    <input type="number" min={0} value={panelBreakdown[wattage]}
                                        onChange={e => updatePanelWattage(wattage, parseInt(e.target.value) || 0)}
                                        className="w-full text-center text-base font-bold px-2 py-1.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 5: Simple Component Overrides */}
            {hasAnySystems && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">
                        Other Components
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Component</th>
                                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Planned</th>
                                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Actual</th>
                                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Diff</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {SIMPLE_COMPONENTS.map(comp => {
                                    const plannedQty = planned[comp];
                                    if (plannedQty === 0) return null;
                                    const actualQty = simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : plannedQty;
                                    const diff = actualQty - plannedQty;
                                    const isOverridden = simpleOverrides[comp] !== undefined;
                                    return (
                                        <tr key={comp} className="hover:bg-blue-50/30">
                                            <td className="px-4 py-2.5 font-medium text-gray-800">{COMPONENT_LABELS[comp]}</td>
                                            <td className="px-4 py-2.5 text-center text-gray-600 font-mono">{plannedQty}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input type="number" min={0} value={actualQty}
                                                        onChange={e => updateSimpleOverride(comp, parseInt(e.target.value) || 0)}
                                                        className={`w-16 text-center font-mono font-bold px-1 py-1 border rounded-lg text-sm ${isOverridden ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`} />
                                                    {isOverridden && (
                                                        <button onClick={() => resetSimpleOverride(comp)} className="text-xs text-orange-600 underline">Reset</button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-2.5 text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 justify-end pb-4">
                <button onClick={resetForm}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    Reset
                </button>
                <button onClick={handleSubmit}
                    disabled={submitting || !district || !hasAnySystems}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm">
                    {submitting ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
                    ) : (
                        <><ArrowDownToLine size={18} /> Submit Inward</>
                    )}
                </button>
            </div>
        </div>
    );
}
