import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    COMPONENT_LABELS, STORE_DISTRICTS, NON_TATA_BRANDS,
    DCR_TYPES, SYSTEM_TYPES, CONNECTORS, DISPATCH_TYPES,
    PANEL_WATTAGES, INVERTER_TYPES,
    ENTRY_MODES, STOCK_COMPONENTS,
    calculatePlannedComponents, calculateInverterBreakdown,
    type StockComponent, type EntryMode, type Dealer, type CustomerSearchResult,
} from '../config/stockConfig';
import { ArrowUpFromLine, CheckCircle, AlertCircle, Search, Plus, Package, Layers, Wrench } from 'lucide-react';

type SystemQuantities = Record<string, number>;
type PanelBreakdown = Record<string, number>;
type InverterQuantities = Record<string, number>;

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

export default function StockOutward() {
    const { token } = useAuth();

    // ── Core form state ──
    const [fromDistrict, setFromDistrict] = useState('');
    const [dispatchType, setDispatchType] = useState<'customer' | 'dealer' | 'store_transfer'>('dealer');
    const [brandType, setBrandType] = useState<'Tata' | 'Non-Tata'>('Tata');
    const [nonTataBrand, setNonTataBrand] = useState(NON_TATA_BRANDS[0]);
    const [dcrType, setDcrType] = useState<'DCR' | 'Non-DCR'>('DCR');
    const [connector, setConnector] = useState(CONNECTORS[0]);
    const [entryMode, setEntryMode] = useState<EntryMode | ''>('');
    const [notes, setNotes] = useState('');

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

    // ── Dealer state ──
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [selectedDealerId, setSelectedDealerId] = useState<number | ''>('');
    const [showNewDealer, setShowNewDealer] = useState(false);
    const [newDealerName, setNewDealerName] = useState('');

    // ── Customer state ──
    const [customerName, setCustomerName] = useState('');
    const [customerDistrict, setCustomerDistrict] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerSearchRef = useRef<HTMLDivElement>(null);

    // ── Store transfer state ──
    const [toDistrict, setToDistrict] = useState('');

    // ── Submission & validation state ──
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; shortages?: any[] } | null>(null);
    const [stockStatus, setStockStatus] = useState<Record<string, { available: number; sufficient: boolean }>>({});

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

    // ── Build validationItems based on mode ──
    const validationItems = useMemo(() => {
        const items: { component: string; sub_type: string | null; actual_quantity: number }[] = [];
        if (entryMode === 'system') {
            for (const [invType, qty] of Object.entries(inverterBreakdown)) {
                if (qty > 0) items.push({ component: 'inverter', sub_type: invType, actual_quantity: qty });
            }
            for (const [wattage, qty] of Object.entries(panelBreakdown)) {
                if (qty > 0) items.push({ component: 'panel', sub_type: wattage, actual_quantity: qty });
            }
            for (const comp of SIMPLE_COMPONENTS) {
                const qty = simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp];
                if (qty > 0) items.push({ component: comp, sub_type: null, actual_quantity: qty });
            }
        } else if (entryMode === 'component') {
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
        }
        return items;
    }, [entryMode, inverterBreakdown, panelBreakdown, simpleOverrides, planned, selectedComponents, compPanelBreakdown, compInverterQty, compSimpleQty]);

    // ── Fetch dealers on mount ──
    useEffect(() => {
        if (!token) return;
        stockAPI.listDealers(token).then(setDealers).catch(console.error);
    }, [token]);

    // ── Customer search ──
    useEffect(() => {
        if (!token || customerName.length < 2) { setCustomerSearchResults([]); return; }
        const timer = setTimeout(() => {
            stockAPI.searchCustomers(token, customerName)
                .then(results => { setCustomerSearchResults(results); setShowCustomerDropdown(results.length > 0); })
                .catch(console.error);
        }, 300);
        return () => clearTimeout(timer);
    }, [token, customerName]);

    // ── Click outside closes customer dropdown ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node))
                setShowCustomerDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Stock validation ──
    useEffect(() => {
        if (!token || !fromDistrict || validationItems.length === 0) { setStockStatus({}); return; }
        const timer = setTimeout(async () => {
            try {
                const valResult = await stockAPI.validateStock(token, {
                    district: fromDistrict, brand: resolvedBrand, dcr_type: dcrType, items: validationItems,
                });
                const status: Record<string, { available: number; sufficient: boolean }> = {};
                if (!valResult.valid) {
                    valResult.shortages.forEach((s: any) => {
                        const key = s.sub_type ? `${s.component}:${s.sub_type}` : s.component;
                        status[key] = { available: s.available, sufficient: false };
                    });
                }
                const inventory = await stockAPI.getInventory(token, { district: fromDistrict, brand: resolvedBrand, dcr_type: dcrType });
                validationItems.forEach(item => {
                    const key = item.sub_type ? `${item.component}:${item.sub_type}` : item.component;
                    if (!status[key]) {
                        const inv = inventory.find((i: any) => i.component === item.component && (item.sub_type ? i.sub_type === item.sub_type : !i.sub_type));
                        status[key] = { available: inv?.quantity || 0, sufficient: true };
                    }
                });
                setStockStatus(status);
            } catch (err) { console.error('Stock validation error:', err); }
        }, 500);
        return () => clearTimeout(timer);
    }, [token, fromDistrict, resolvedBrand, dcrType, validationItems]);

    const hasShortage = Object.values(stockStatus).some(s => !s.sufficient);

    // ── Handlers ──
    const updateSystem = (sysType: string, value: number) => setSystems(prev => ({ ...prev, [sysType]: Math.max(0, value) }));
    const updatePanelWattage = (wattage: string, value: number) => setPanelBreakdown(prev => ({ ...prev, [wattage]: Math.max(0, value) }));
    const updateSimpleOverride = (comp: StockComponent, value: number) => setSimpleOverrides(prev => ({ ...prev, [comp]: Math.max(0, value) }));
    const resetSimpleOverride = (comp: StockComponent) => setSimpleOverrides(prev => { const next = { ...prev }; delete next[comp]; return next; });
    const toggleComponent = (comp: StockComponent) => setSelectedComponents(prev => { const next = new Set(prev); if (next.has(comp)) next.delete(comp); else next.add(comp); return next; });
    const selectCustomer = (customer: CustomerSearchResult) => { setCustomerName(customer.applicant_name); setCustomerDistrict(customer.district); setSelectedCustomerId(customer.id); setShowCustomerDropdown(false); };

    const handleAddDealer = async () => {
        if (!token || !newDealerName.trim()) return;
        try {
            const dealer = await stockAPI.createDealer(token, newDealerName.trim());
            setDealers(prev => [...prev, dealer]); setSelectedDealerId(dealer.id); setNewDealerName(''); setShowNewDealer(false);
        } catch (err: any) { setResult({ type: 'error', message: err.message }); }
    };

    const resetForm = () => {
        setFromDistrict(''); setDispatchType('dealer'); setBrandType('Tata'); setNonTataBrand(NON_TATA_BRANDS[0]);
        setDcrType('DCR'); setConnector(CONNECTORS[0]); setEntryMode(''); setNotes('');
        const initSys: SystemQuantities = {}; SYSTEM_TYPES.forEach(s => { initSys[s] = 0; }); setSystems(initSys);
        const initP: PanelBreakdown = {}; PANEL_WATTAGES.forEach(w => { initP[w] = 0; }); setPanelBreakdown(initP);
        setSimpleOverrides({});
        setSelectedComponents(new Set());
        const initCP: PanelBreakdown = {}; PANEL_WATTAGES.forEach(w => { initCP[w] = 0; }); setCompPanelBreakdown(initCP);
        const initCI: InverterQuantities = {}; INVERTER_TYPES.forEach(t => { initCI[t] = 0; }); setCompInverterQty(initCI);
        const initCS: Record<string, number> = {}; SIMPLE_COMPONENTS.forEach(c => { initCS[c] = 0; }); setCompSimpleQty(initCS);
        setSelectedDealerId(''); setCustomerName(''); setCustomerDistrict(''); setSelectedCustomerId(null); setToDistrict(''); setStockStatus({});
    };

    const handleSubmit = async () => {
        if (!fromDistrict) { setResult({ type: 'error', message: 'Please select source district' }); return; }
        if (!entryMode) { setResult({ type: 'error', message: 'Please select an entry mode' }); return; }
        if (dispatchType === 'dealer' && !selectedDealerId) { setResult({ type: 'error', message: 'Please select a dealer' }); return; }
        if (dispatchType === 'customer' && !customerName) { setResult({ type: 'error', message: 'Please enter customer name' }); return; }
        if (dispatchType === 'store_transfer' && !toDistrict) { setResult({ type: 'error', message: 'Please select destination district' }); return; }
        if (dispatchType === 'store_transfer' && toDistrict === fromDistrict) { setResult({ type: 'error', message: 'Source and destination cannot be the same' }); return; }

        if (entryMode === 'system') {
            if (!hasAnySystems) { setResult({ type: 'error', message: 'Please enter at least one system quantity' }); return; }
            if (totalPanelsPlanned > 0 && totalPanelsEntered === 0) { setResult({ type: 'error', message: 'Please enter panel wattage breakdown' }); return; }
        } else {
            if (selectedComponents.size === 0) { setResult({ type: 'error', message: 'Please select at least one component' }); return; }
            if (!hasAnyComponentQty) { setResult({ type: 'error', message: 'Please enter quantity for at least one component' }); return; }
            if (selectedComponents.has('panel') && compTotalPanels === 0) { setResult({ type: 'error', message: 'Please enter panel wattage quantities' }); return; }
            if (selectedComponents.has('inverter') && compTotalInverters === 0) { setResult({ type: 'error', message: 'Please enter inverter type quantities' }); return; }
        }

        if (hasShortage) { setResult({ type: 'error', message: 'Cannot dispatch: insufficient stock for some components' }); return; }
        if (!token) return;

        setSubmitting(true);
        setResult(null);

        try {
            const base = {
                from_district: fromDistrict,
                dispatch_type: dispatchType,
                dealer_id: dispatchType === 'dealer' ? selectedDealerId : undefined,
                customer_name: dispatchType === 'customer' ? customerName : undefined,
                customer_district: dispatchType === 'customer' ? customerDistrict : undefined,
                registered_customer_id: dispatchType === 'customer' && selectedCustomerId ? selectedCustomerId : undefined,
                to_district: dispatchType === 'store_transfer' ? toDistrict : undefined,
                connector, brand: resolvedBrand, dcr_type: dcrType,
                notes: notes || undefined,
            };

            if (entryMode === 'system') {
                const simpleItems = SIMPLE_COMPONENTS.map(comp => ({
                    component: comp,
                    actual_quantity: simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp],
                })).filter(i => i.actual_quantity > 0);
                await stockAPI.createOutward(token, { ...base, entry_mode: 'system', systems, panel_breakdown: panelBreakdown, items: simpleItems });
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
                await stockAPI.createOutward(token, { ...base, entry_mode: 'component', items });
            }

            setResult({ type: 'success', message: 'Stock outward dispatched successfully!' });
            resetForm();
        } catch (err: any) {
            setResult({ type: 'error', message: err.message || 'Failed to create outward', shortages: err.shortages });
        } finally {
            setSubmitting(false);
        }
    };

    const getStockStatusIcon = (key: string) => {
        const stock = stockStatus[key];
        if (!stock) return <span className="text-gray-400 text-xs">—</span>;
        if (stock.sufficient) return <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle size={10} /> {stock.available}</span>;
        return <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold"><AlertCircle size={10} /> {stock.available}</span>;
    };

    const canSubmit = !!(fromDistrict && entryMode) && (
        entryMode === 'system' ? hasAnySystems : (selectedComponents.size > 0 && hasAnyComponentQty)
    ) && !hasShortage;

    return (
        <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-2 sm:px-0">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ArrowUpFromLine size={24} className="text-orange-600" />
                    Stock Outward
                </h1>
                <p className="text-gray-500 text-sm mt-1">Dispatch stock to customer, dealer, or another store</p>
            </div>

            {/* Notification */}
            {result && (
                <div className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border ${result.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {result.type === 'success' ? <CheckCircle size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                    <div className="flex-1">
                        <span className="font-medium text-sm">{result.message}</span>
                        {result.shortages && (
                            <ul className="mt-2 text-xs space-y-1">
                                {result.shortages.map((s: any, i: number) => (
                                    <li key={i}>{COMPONENT_LABELS[s.component as StockComponent] || s.component}{s.sub_type ? ` (${s.sub_type})` : ''}: Available {s.available}, Need {s.requested}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setResult(null)} className="text-xs underline">Dismiss</button>
                </div>
            )}

            {/* ── Dispatch Information ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-orange-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Package size={18} /> Dispatch Information
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                    {/* Source District */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Source District Store *</label>
                        <select value={fromDistrict} onChange={e => setFromDistrict(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm">
                            <option value="">Select District Store</option>
                            {STORE_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* Dispatch Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dispatch To *</label>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {DISPATCH_TYPES.map(dt => (
                                <label key={dt.value} className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm ${dispatchType === dt.value ? 'border-orange-500 bg-orange-50 text-orange-800' : 'border-gray-200 hover:border-gray-300'}`}>
                                    <input type="radio" name="dispatchType" value={dt.value} checked={dispatchType === dt.value}
                                        onChange={() => setDispatchType(dt.value as any)} className="w-4 h-4 text-orange-600" />
                                    <span className="font-medium">{dt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Dealer */}
                    {dispatchType === 'dealer' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Dealer *</label>
                            <select value={selectedDealerId} onChange={e => {
                                const val = e.target.value;
                                if (val === 'new') { setShowNewDealer(true); setSelectedDealerId(''); }
                                else { setSelectedDealerId(Number(val)); setShowNewDealer(false); }
                            }} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm">
                                <option value="">Select Dealer</option>
                                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                <option value="new">+ Add New Dealer</option>
                            </select>
                            {showNewDealer && (
                                <div className="mt-3 flex gap-2">
                                    <input type="text" value={newDealerName} onChange={e => setNewDealerName(e.target.value)}
                                        placeholder="New dealer name" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <button onClick={handleAddDealer} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1 text-sm">
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customer */}
                    {dispatchType === 'customer' && (
                        <div className="space-y-3">
                            <div ref={customerSearchRef} className="relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer Name *</label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input type="text" value={customerName}
                                        onChange={e => { setCustomerName(e.target.value); setSelectedCustomerId(null); }}
                                        placeholder="Type to search or enter customer name"
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm" />
                                </div>
                                {showCustomerDropdown && customerSearchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {customerSearchResults.map(c => (
                                            <button key={c.id} onClick={() => selectCustomer(c)}
                                                className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-gray-100 last:border-b-0 text-sm">
                                                <span className="font-medium">{c.applicant_name}</span>
                                                <span className="text-xs text-gray-500 ml-2">{c.mobile_number} — {c.district}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer District</label>
                                <input type="text" value={customerDistrict} onChange={e => setCustomerDistrict(e.target.value)}
                                    placeholder="District" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" />
                            </div>
                        </div>
                    )}

                    {/* Store Transfer */}
                    {dispatchType === 'store_transfer' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Destination District Store *</label>
                            <select value={toDistrict} onChange={e => setToDistrict(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm">
                                <option value="">Select Destination District</option>
                                {STORE_DISTRICTS.filter(d => d !== fromDistrict).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Connector */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Connector *</label>
                        <select value={connector} onChange={e => setConnector(e.target.value as typeof connector)}
                            className="w-full sm:w-64 px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                            {CONNECTORS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Brand + DCR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand Type *</label>
                            <div className="flex gap-4">
                                {(['Tata', 'Non-Tata'] as const).map(bt => (
                                    <label key={bt} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="outBrand" value={bt} checked={brandType === bt}
                                            onChange={() => setBrandType(bt)} className="w-4 h-4 text-orange-600" />
                                        <span className="font-medium text-sm">{bt}</span>
                                    </label>
                                ))}
                            </div>
                            {brandType === 'Non-Tata' && (
                                <select value={nonTataBrand} onChange={e => setNonTataBrand(e.target.value as typeof nonTataBrand)}
                                    className="mt-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm">
                                    {NON_TATA_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">DCR Type *</label>
                            <div className="flex gap-4">
                                {DCR_TYPES.map(d => (
                                    <label key={d} className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="outDcr" value={d} checked={dcrType === d}
                                            onChange={() => setDcrType(d as any)} className="w-4 h-4 text-orange-600" />
                                        <span className="font-medium text-sm">{d}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Any additional notes..." />
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
                                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}>
                                <input type="radio" name="entryMode" value={mode.value}
                                    checked={entryMode === mode.value}
                                    onChange={() => setEntryMode(mode.value as EntryMode)}
                                    className="w-4 h-4 text-orange-600 mt-0.5" />
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
                        <div className="bg-orange-600 text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">System Type Quantities</div>
                        <div className="p-4 sm:p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {SYSTEM_TYPES.map(sysType => (
                                    <div key={sysType} className="bg-orange-50 rounded-xl p-3 sm:p-4 text-center border border-orange-100">
                                        <label className="block text-xs sm:text-sm font-bold text-orange-800 mb-1 sm:mb-2">{sysType}</label>
                                        <input type="number" min={0} value={systems[sysType]}
                                            onChange={e => updateSystem(sysType, parseInt(e.target.value) || 0)}
                                            className="w-full text-center text-base sm:text-lg font-bold px-2 py-1.5 sm:py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {hasAnySystems && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">Inverter Breakdown (Auto)</div>
                            <div className="p-4 sm:p-5">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    {INVERTER_TYPES.filter(t => (inverterBreakdown[t] || 0) > 0).map(invType => {
                                        const key = `inverter:${invType}`;
                                        return (
                                            <div key={invType} className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
                                                <span className="block text-xs font-bold text-indigo-800 mb-1">{invType}</span>
                                                <span className="text-lg font-bold text-indigo-700">{inverterBreakdown[invType]}</span>
                                                <div className="mt-1">{getStockStatusIcon(key)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                        ⚠️ Entered ({totalPanelsEntered}) ≠ BOM planned ({totalPanelsPlanned})
                                    </div>
                                )}
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                                    {PANEL_WATTAGES.map(wattage => {
                                        const key = `panel:${wattage}`;
                                        return (
                                            <div key={wattage} className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                                                <label className="block text-xs font-bold text-amber-800 mb-1">{wattage}W</label>
                                                <input type="number" min={0} value={panelBreakdown[wattage]}
                                                    onChange={e => updatePanelWattage(wattage, parseInt(e.target.value) || 0)}
                                                    className="w-full text-center text-base font-bold px-2 py-1.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                                                <div className="mt-1">{getStockStatusIcon(key)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {hasAnySystems && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-orange-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                                <span>Other Components</span>
                                {hasShortage && (
                                    <span className="flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                                        <AlertCircle size={14} /> Insufficient Stock
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Component</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Planned</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Dispatch</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {SIMPLE_COMPONENTS.map(comp => {
                                            const plannedQty = planned[comp];
                                            if (plannedQty === 0 && !simpleOverrides[comp]) return null;
                                            const actualQty = simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : plannedQty;
                                            const isOverridden = simpleOverrides[comp] !== undefined;
                                            const stock = stockStatus[comp];
                                            return (
                                                <tr key={comp} className={`hover:bg-orange-50/30 ${stock && !stock.sufficient ? 'bg-red-50' : ''}`}>
                                                    <td className="px-4 py-2.5 font-medium text-gray-800">{COMPONENT_LABELS[comp]}</td>
                                                    <td className="px-4 py-2.5 text-center text-gray-600 font-mono">{plannedQty}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <input type="number" min={0} value={actualQty}
                                                                onChange={e => updateSimpleOverride(comp, parseInt(e.target.value) || 0)}
                                                                className={`w-16 text-center font-mono font-bold px-1 py-1 border rounded-lg text-sm ${isOverridden ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`} />
                                                            {isOverridden && <button onClick={() => resetSimpleOverride(comp)} className="text-xs text-orange-600 underline">Reset</button>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {stock ? (
                                                            stock.sufficient
                                                                ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle size={10} /> {stock.available}</span>
                                                                : <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold"><AlertCircle size={10} /> {stock.available}</span>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
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
                            <p className="text-xs text-gray-500 mb-3">Choose which components to dispatch</p>
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
                                    {PANEL_WATTAGES.map(w => {
                                        const key = `panel:${w}`;
                                        return (
                                            <div key={w} className={`bg-amber-50 rounded-xl p-3 text-center border ${stockStatus[key] && !stockStatus[key].sufficient ? 'border-red-400 bg-red-50' : 'border-amber-100'}`}>
                                                <label className="block text-xs font-bold text-amber-800 mb-1">{w}W</label>
                                                <input type="number" min={0} value={compPanelBreakdown[w]}
                                                    onChange={e => setCompPanelBreakdown(prev => ({ ...prev, [w]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                    className="w-full text-center text-base font-bold px-2 py-1.5 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                                                <div className="mt-1">{getStockStatusIcon(key)}</div>
                                            </div>
                                        );
                                    })}
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
                                    {INVERTER_TYPES.map(t => {
                                        const key = `inverter:${t}`;
                                        return (
                                            <div key={t} className={`bg-indigo-50 rounded-xl p-3 sm:p-4 text-center border ${stockStatus[key] && !stockStatus[key].sufficient ? 'border-red-400 bg-red-50' : 'border-indigo-100'}`}>
                                                <label className="block text-xs sm:text-sm font-bold text-indigo-800 mb-1 sm:mb-2">{t}</label>
                                                <input type="number" min={0} value={compInverterQty[t]}
                                                    onChange={e => setCompInverterQty(prev => ({ ...prev, [t]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                    className="w-full text-center text-base sm:text-lg font-bold px-2 py-1.5 sm:py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                                <div className="mt-1">{getStockStatusIcon(key)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Simple components table */}
                    {SIMPLE_COMPONENTS.some(c => selectedComponents.has(c)) && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-emerald-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                                <span>Component Quantities</span>
                                {hasShortage && (
                                    <span className="flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1 rounded-full">
                                        <AlertCircle size={14} /> Insufficient Stock
                                    </span>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Component</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Quantity</th>
                                            <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {SIMPLE_COMPONENTS.filter(c => selectedComponents.has(c)).map(comp => {
                                            const stock = stockStatus[comp];
                                            return (
                                                <tr key={comp} className={`hover:bg-emerald-50/30 ${stock && !stock.sufficient ? 'bg-red-50' : ''}`}>
                                                    <td className="px-4 py-2.5 font-medium text-gray-800">{COMPONENT_LABELS[comp]}</td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        <input type="number" min={0} value={compSimpleQty[comp] || 0}
                                                            onChange={e => setCompSimpleQty(prev => ({ ...prev, [comp]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                            className="w-20 text-center font-mono font-bold px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center">
                                                        {stock ? (
                                                            stock.sufficient
                                                                ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle size={10} /> {stock.available}</span>
                                                                : <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold"><AlertCircle size={10} /> {stock.available}</span>
                                                        ) : <span className="text-gray-400 text-xs">—</span>}
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

            {/* Submit */}
            <div className="flex gap-3 justify-end pb-4">
                <button onClick={resetForm}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    Reset
                </button>
                <button onClick={handleSubmit} disabled={submitting || !canSubmit}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm">
                    {submitting
                        ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Dispatching...</>
                        : <><ArrowUpFromLine size={18} /> Submit Dispatch</>
                    }
                </button>
            </div>
        </div>
    );
}
