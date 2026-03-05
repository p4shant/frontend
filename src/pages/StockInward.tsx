import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    COMPONENT_LABELS, STORE_DISTRICTS, NON_TATA_BRANDS,
    DCR_TYPES, SYSTEM_TYPES, PANEL_WATTAGES, INVERTER_TYPES,
    ENTRY_MODES, STOCK_COMPONENTS,
    calculatePlannedComponents, calculateInverterBreakdown,
    type StockComponent, type EntryMode,
} from '../config/stockConfig';
import { ArrowDownToLine, Package, CheckCircle, AlertCircle, Layers, Wrench } from 'lucide-react';

type SystemQuantities = Record<string, number>;
type PanelBreakdown = Record<string, number>;
type InverterQuantities = Record<string, number>;

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

export default function StockInward() {
    const { token } = useAuth();

    // ── Core form state ──
    const [district, setDistrict] = useState('');
    const [brandType, setBrandType] = useState<'Tata' | 'Non-Tata'>('Tata');
    const [nonTataBrand, setNonTataBrand] = useState(NON_TATA_BRANDS[0]);
    const [dcrType, setDcrType] = useState<'DCR' | 'Non-DCR'>('DCR');
    const [entryMode, setEntryMode] = useState<EntryMode | ''>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // ── System mode state ──
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

    // ── Component mode state ──
    const [selectedComponents, setSelectedComponents] = useState<Set<StockComponent>>(new Set());
    const [compPanelBreakdown, setCompPanelBreakdown] = useState<PanelBreakdown>(() => {
        const init: PanelBreakdown = {};
        PANEL_WATTAGES.forEach(w => { init[w] = 0; });
        return init;
    });
    const [compInverterQty, setCompInverterQty] = useState<InverterQuantities>(() => {
        const init: InverterQuantities = {};
        INVERTER_TYPES.forEach(t => { init[t] = 0; });
        return init;
    });
    const [compSimpleQty, setCompSimpleQty] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        SIMPLE_COMPONENTS.forEach(c => { init[c] = 0; });
        return init;
    });

    const resolvedBrand = brandType === 'Tata' ? 'Tata' : nonTataBrand;

    // ── System mode computed ──
    const planned = useMemo(() => calculatePlannedComponents(systems), [systems]);
    const inverterBreakdown = useMemo(() => calculateInverterBreakdown(systems), [systems]);
    const totalPanelsPlanned = planned.panel;
    const totalPanelsEntered = useMemo(() => Object.values(panelBreakdown).reduce((s, v) => s + v, 0), [panelBreakdown]);
    const hasAnySystems = Object.values(systems).some(v => v > 0);

    // ── Component mode computed ──
    const compTotalPanels = useMemo(() => Object.values(compPanelBreakdown).reduce((s, v) => s + v, 0), [compPanelBreakdown]);
    const compTotalInverters = useMemo(() => Object.values(compInverterQty).reduce((s, v) => s + v, 0), [compInverterQty]);
    const hasAnyComponentQty = useMemo(() => {
        if (selectedComponents.has('panel') && compTotalPanels > 0) return true;
        if (selectedComponents.has('inverter') && compTotalInverters > 0) return true;
        for (const comp of SIMPLE_COMPONENTS) {
            if (selectedComponents.has(comp) && (compSimpleQty[comp] || 0) > 0) return true;
        }
        return false;
    }, [selectedComponents, compTotalPanels, compTotalInverters, compSimpleQty]);

    // ── Handlers: System mode ──
    const updateSystem = (sysType: string, value: number) =>
        setSystems(prev => ({ ...prev, [sysType]: Math.max(0, value) }));
    const updatePanelWattage = (wattage: string, value: number) =>
        setPanelBreakdown(prev => ({ ...prev, [wattage]: Math.max(0, value) }));
    const updateSimpleOverride = (comp: StockComponent, value: number) =>
        setSimpleOverrides(prev => ({ ...prev, [comp]: Math.max(0, value) }));
    const resetSimpleOverride = (comp: StockComponent) =>
        setSimpleOverrides(prev => { const next = { ...prev }; delete next[comp]; return next; });

    // ── Handlers: Component mode ──
    const toggleComponent = (comp: StockComponent) => {
        setSelectedComponents(prev => {
            const next = new Set(prev);
            if (next.has(comp)) next.delete(comp); else next.add(comp);
            return next;
        });
    };

    const resetForm = () => {
        setDistrict(''); setBrandType('Tata'); setNonTataBrand(NON_TATA_BRANDS[0]);
        setDcrType('DCR'); setEntryMode(''); setNotes('');
        const initSys: SystemQuantities = {}; SYSTEM_TYPES.forEach(s => { initSys[s] = 0; }); setSystems(initSys);
        const initP: PanelBreakdown = {}; PANEL_WATTAGES.forEach(w => { initP[w] = 0; }); setPanelBreakdown(initP);
        setSimpleOverrides({});
        setSelectedComponents(new Set());
        const initCP: PanelBreakdown = {}; PANEL_WATTAGES.forEach(w => { initCP[w] = 0; }); setCompPanelBreakdown(initCP);
        const initCI: InverterQuantities = {}; INVERTER_TYPES.forEach(t => { initCI[t] = 0; }); setCompInverterQty(initCI);
        const initCS: Record<string, number> = {}; SIMPLE_COMPONENTS.forEach(c => { initCS[c] = 0; }); setCompSimpleQty(initCS);
    };

    const handleSubmit = async () => {
        if (!district) { setResult({ type: 'error', message: 'Please select a district store' }); return; }
        if (!entryMode) { setResult({ type: 'error', message: 'Please select an entry mode' }); return; }
        if (!token) return;

        if (entryMode === 'system') {
            if (!hasAnySystems) { setResult({ type: 'error', message: 'Please enter at least one system quantity' }); return; }
            if (totalPanelsPlanned > 0 && totalPanelsEntered === 0) {
                setResult({ type: 'error', message: 'Please enter panel wattage breakdown' }); return;
            }
        } else {
            if (selectedComponents.size === 0) { setResult({ type: 'error', message: 'Please select at least one component' }); return; }
            if (!hasAnyComponentQty) { setResult({ type: 'error', message: 'Please enter quantity for at least one component' }); return; }
            if (selectedComponents.has('panel') && compTotalPanels === 0) {
                setResult({ type: 'error', message: 'Please enter panel wattage quantities' }); return;
            }
            if (selectedComponents.has('inverter') && compTotalInverters === 0) {
                setResult({ type: 'error', message: 'Please enter inverter type quantities' }); return;
            }
        }

        setSubmitting(true);
        setResult(null);

        try {
            if (entryMode === 'system') {
                const simpleItems = SIMPLE_COMPONENTS.map(comp => ({
                    component: comp,
                    actual_quantity: simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp],
                })).filter(i => i.actual_quantity > 0);

                await stockAPI.createInward(token, {
                    district, brand: resolvedBrand, dcr_type: dcrType,
                    entry_mode: 'system', systems, panel_breakdown: panelBreakdown,
                    items: simpleItems, notes: notes || undefined,
                });
            } else {
                const items: { component: string; sub_type?: string | null; actual_quantity: number }[] = [];
                if (selectedComponents.has('panel')) {
                    for (const [w, qty] of Object.entries(compPanelBreakdown)) {
                        if (qty > 0) items.push({ component: 'panel', sub_type: w, actual_quantity: qty });
                    }
                }
                if (selectedComponents.has('inverter')) {
                    for (const [t, qty] of Object.entries(compInverterQty)) {
                        if (qty > 0) items.push({ component: 'inverter', sub_type: t, actual_quantity: qty });
                    }
                }
                for (const comp of SIMPLE_COMPONENTS) {
                    if (selectedComponents.has(comp) && (compSimpleQty[comp] || 0) > 0)
                        items.push({ component: comp, sub_type: null, actual_quantity: compSimpleQty[comp] });
                }
                await stockAPI.createInward(token, {
                    district, brand: resolvedBrand, dcr_type: dcrType,
                    entry_mode: 'component', items, notes: notes || undefined,
                });
            }
            setResult({ type: 'success', message: `Stock inward recorded (${district} — ${resolvedBrand} ${dcrType} — ${entryMode} mode)` });
            resetForm();
        } catch (err: any) {
            setResult({ type: 'error', message: err.message || 'Failed to record stock inward' });
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = !!(district && entryMode) && (
        entryMode === 'system' ? hasAnySystems : (selectedComponents.size > 0 && hasAnyComponentQty)
    );

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
                <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border ${result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="font-medium text-sm">{result.message}</span>
                    <button onClick={() => setResult(null)} className="ml-auto text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Store & Brand */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-blue text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Package size={18} /> Dispatch Information
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store District *</label>
                        <select value={district} onChange={e => setDistrict(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
                            <option value="">Select District Store</option>
                            {STORE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
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
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Any additional notes..." />
                    </div>
                </div>
            </div>

            {/* ═══ Entry Mode Toggle (MANDATORY) ═══ */}
            <div className="bg-white rounded-xl border-2 border-gray-300 shadow-sm overflow-hidden">
                <div className="bg-gray-800 text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Layers size={18} />
                    Entry Mode <span className="text-red-400 ml-1">*</span>
                    {!entryMode && <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">Required</span>}
                </div>
                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ENTRY_MODES.map(mode => (
                            <label key={mode.value}
                                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${entryMode === mode.value
                                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}>
                                <input type="radio" name="entryMode" value={mode.value}
                                    checked={entryMode === mode.value}
                                    onChange={() => setEntryMode(mode.value as EntryMode)}
                                    className="w-4 h-4 text-green-600 mt-0.5" />
                                <div>
                                    <span className="font-bold text-sm">{mode.label}</span>
                                    <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ SYSTEM MODE ═══ */}
            {entryMode === 'system' && (
                <>
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

                    {hasAnySystems && totalPanelsPlanned > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-amber-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                                <span>Panel Wattage Breakdown</span>
                                <span className="text-xs sm:text-sm font-normal opacity-90">{totalPanelsEntered} / {totalPanelsPlanned} panels</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                {totalPanelsEntered !== totalPanelsPlanned && totalPanelsEntered > 0 && (
                                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                                        ⚠️ Entered ({totalPanelsEntered}) ≠ BOM planned ({totalPanelsPlanned}). You can still submit.
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

                    {hasAnySystems && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-blue text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">Other Components</div>
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
                </>
            )}

            {/* ═══ COMPONENT MODE ═══ */}
            {entryMode === 'component' && (
                <>
                    {/* Component Selector */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-emerald-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                            <Wrench size={18} /> Select Components *
                        </div>
                        <div className="p-4 sm:p-5">
                            <p className="text-xs text-gray-500 mb-3">Choose which components are being received</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {STOCK_COMPONENTS.map(comp => (
                                    <label key={comp}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${selectedComponents.has(comp)
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                            }`}>
                                        <input type="checkbox" checked={selectedComponents.has(comp)}
                                            onChange={() => toggleComponent(comp)}
                                            className="w-4 h-4 text-emerald-600 rounded" />
                                        <span className="font-semibold">{COMPONENT_LABELS[comp]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Panel wattage grid */}
                    {selectedComponents.has('panel') && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-amber-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                                <span>Solar Panel — Wattage Quantities</span>
                                <span className="text-xs sm:text-sm font-normal opacity-90">Total: {compTotalPanels}</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                                    {PANEL_WATTAGES.map(w => (
                                        <div key={w} className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                                            <label className="block text-xs font-bold text-amber-800 mb-1">{w}W</label>
                                            <input type="number" min={0} value={compPanelBreakdown[w]}
                                                onChange={e => setCompPanelBreakdown(prev => ({ ...prev, [w]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                className="w-full text-center text-base font-bold px-2 py-1.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inverter type grid */}
                    {selectedComponents.has('inverter') && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                                <span>Inverter — Type Quantities</span>
                                <span className="text-xs sm:text-sm font-normal opacity-90">Total: {compTotalInverters}</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    {INVERTER_TYPES.map(t => (
                                        <div key={t} className="bg-indigo-50 rounded-xl p-3 sm:p-4 text-center border border-indigo-100">
                                            <label className="block text-xs sm:text-sm font-bold text-indigo-800 mb-1 sm:mb-2">{t}</label>
                                            <input type="number" min={0} value={compInverterQty[t]}
                                                onChange={e => setCompInverterQty(prev => ({ ...prev, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                className="w-full text-center text-base sm:text-lg font-bold px-2 py-1.5 sm:py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simple components table */}
                    {SIMPLE_COMPONENTS.some(c => selectedComponents.has(c)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-emerald-600 text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">
                                Component Quantities
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Component</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {SIMPLE_COMPONENTS.filter(c => selectedComponents.has(c)).map(comp => (
                                            <tr key={comp} className="hover:bg-emerald-50/30">
                                                <td className="px-4 py-2.5 font-medium text-gray-800">{COMPONENT_LABELS[comp]}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <input type="number" min={0} value={compSimpleQty[comp] || 0}
                                                        onChange={e => setCompSimpleQty(prev => ({ ...prev, [comp]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                        className="w-20 text-center font-mono font-bold px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Submit */}
            <div className="flex gap-3 justify-end pb-4">
                <button onClick={resetForm}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    Reset
                </button>
                <button onClick={handleSubmit} disabled={submitting || !canSubmit}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm">
                    {submitting
                        ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
                        : <><ArrowDownToLine size={18} /> Submit Inward</>
                    }
                </button>
            </div>
        </div>
    );
}
