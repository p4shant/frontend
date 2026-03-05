import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockAPI } from '../services/api';
import {
    COMPONENT_LABELS, STORE_DISTRICTS, NON_TATA_BRANDS,
    DCR_TYPES, SYSTEM_TYPES, CONNECTORS, DISPATCH_TYPES,
    PANEL_WATTAGES, INVERTER_TYPES,
    calculatePlannedComponents, calculateInverterBreakdown,
    type StockComponent, type Dealer, type CustomerSearchResult,
} from '../config/stockConfig';
import { ArrowUpFromLine, CheckCircle, AlertCircle, Search, Plus, Package } from 'lucide-react';

type SystemQuantities = Record<string, number>;
type PanelBreakdown = Record<string, number>;

const SIMPLE_COMPONENTS: StockComponent[] = ['acdb', 'dcdb', 'earthing_rod', 'earthing_chemical', 'lightning_arrestor'];

export default function StockOutward() {
    const { token } = useAuth();

    // Form state
    const [fromDistrict, setFromDistrict] = useState('');
    const [dispatchType, setDispatchType] = useState<'customer' | 'dealer' | 'store_transfer'>('dealer');
    const [brandType, setBrandType] = useState<'Tata' | 'Non-Tata'>('Tata');
    const [nonTataBrand, setNonTataBrand] = useState(NON_TATA_BRANDS[0]);
    const [dcrType, setDcrType] = useState<'DCR' | 'Non-DCR'>('DCR');
    const [connector, setConnector] = useState(CONNECTORS[0]);
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

    // Dealer state
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [selectedDealerId, setSelectedDealerId] = useState<number | ''>('');
    const [showNewDealer, setShowNewDealer] = useState(false);
    const [newDealerName, setNewDealerName] = useState('');

    // Customer state
    const [customerName, setCustomerName] = useState('');
    const [customerDistrict, setCustomerDistrict] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerSearchRef = useRef<HTMLDivElement>(null);

    // Store transfer state
    const [toDistrict, setToDistrict] = useState('');

    // Submission state
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; shortages?: any[] } | null>(null);

    // Stock validation state
    const [stockStatus, setStockStatus] = useState<Record<string, { available: number; sufficient: boolean }>>({});

    const resolvedBrand = brandType === 'Tata' ? 'Tata' : nonTataBrand;

    // Fetch dealers on mount
    useEffect(() => {
        if (!token) return;
        stockAPI.listDealers(token).then(setDealers).catch(console.error);
    }, [token]);

    // Customer search
    useEffect(() => {
        if (!token || customerName.length < 2) {
            setCustomerSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            stockAPI.searchCustomers(token, customerName)
                .then(results => {
                    setCustomerSearchResults(results);
                    setShowCustomerDropdown(results.length > 0);
                })
                .catch(console.error);
        }, 300);
        return () => clearTimeout(timer);
    }, [token, customerName]);

    // Click outside to close customer dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Auto-calculated values
    const planned = useMemo(() => calculatePlannedComponents(systems), [systems]);
    const inverterBreakdown = useMemo(() => calculateInverterBreakdown(systems), [systems]);
    const totalPanelsPlanned = planned.panel;
    const totalPanelsEntered = useMemo(() => Object.values(panelBreakdown).reduce((s, v) => s + v, 0), [panelBreakdown]);
    const hasAnySystems = Object.values(systems).some(v => v > 0);

    // Build items for validation (with sub_types)
    const validationItems = useMemo(() => {
        const items: { component: string; sub_type: string | null; actual_quantity: number }[] = [];
        // Inverters by sub_type
        for (const [invType, qty] of Object.entries(inverterBreakdown)) {
            if (qty > 0) items.push({ component: 'inverter', sub_type: invType, actual_quantity: qty });
        }
        // Panels by wattage
        for (const [wattage, qty] of Object.entries(panelBreakdown)) {
            if (qty > 0) items.push({ component: 'panel', sub_type: wattage, actual_quantity: qty });
        }
        // Simple components
        for (const comp of SIMPLE_COMPONENTS) {
            const qty = simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp];
            if (qty > 0) items.push({ component: comp, sub_type: null, actual_quantity: qty });
        }
        return items;
    }, [inverterBreakdown, panelBreakdown, simpleOverrides, planned]);

    // Validate stock whenever items/district/brand/dcr change
    useEffect(() => {
        if (!token || !fromDistrict || !hasAnySystems || validationItems.length === 0) {
            setStockStatus({});
            return;
        }
        const timer = setTimeout(async () => {
            try {
                const result = await stockAPI.validateStock(token, {
                    district: fromDistrict,
                    brand: resolvedBrand,
                    dcr_type: dcrType,
                    items: validationItems,
                });
                const status: Record<string, { available: number; sufficient: boolean }> = {};
                if (!result.valid) {
                    result.shortages.forEach((s: any) => {
                        const key = s.sub_type ? `${s.component}:${s.sub_type}` : s.component;
                        status[key] = { available: s.available, sufficient: false };
                    });
                }
                // Fetch full inventory for available counts
                const inventory = await stockAPI.getInventory(token, {
                    district: fromDistrict,
                    brand: resolvedBrand,
                    dcr_type: dcrType,
                });
                validationItems.forEach(item => {
                    const key = item.sub_type ? `${item.component}:${item.sub_type}` : item.component;
                    if (!status[key]) {
                        const inv = inventory.find((i: any) =>
                            i.component === item.component &&
                            (item.sub_type ? i.sub_type === item.sub_type : !i.sub_type)
                        );
                        status[key] = { available: inv?.quantity || 0, sufficient: true };
                    }
                });
                setStockStatus(status);
            } catch (err) {
                console.error('Stock validation error:', err);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [token, fromDistrict, resolvedBrand, dcrType, validationItems]);

    const hasShortage = Object.values(stockStatus).some(s => !s.sufficient);

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

    const selectCustomer = (customer: CustomerSearchResult) => {
        setCustomerName(customer.applicant_name);
        setCustomerDistrict(customer.district);
        setSelectedCustomerId(customer.id);
        setShowCustomerDropdown(false);
    };

    const handleAddDealer = async () => {
        if (!token || !newDealerName.trim()) return;
        try {
            const dealer = await stockAPI.createDealer(token, newDealerName.trim());
            setDealers(prev => [...prev, dealer]);
            setSelectedDealerId(dealer.id);
            setNewDealerName('');
            setShowNewDealer(false);
        } catch (err: any) {
            setResult({ type: 'error', message: err.message });
        }
    };

    const resetForm = () => {
        setFromDistrict('');
        setDispatchType('dealer');
        setBrandType('Tata');
        setNonTataBrand(NON_TATA_BRANDS[0]);
        setDcrType('DCR');
        setConnector(CONNECTORS[0]);
        const initSys: SystemQuantities = {};
        SYSTEM_TYPES.forEach(s => { initSys[s] = 0; });
        setSystems(initSys);
        const initPanels: PanelBreakdown = {};
        PANEL_WATTAGES.forEach(w => { initPanels[w] = 0; });
        setPanelBreakdown(initPanels);
        setSimpleOverrides({});
        setNotes('');
        setSelectedDealerId('');
        setCustomerName('');
        setCustomerDistrict('');
        setSelectedCustomerId(null);
        setToDistrict('');
        setStockStatus({});
    };

    const handleSubmit = async () => {
        if (!fromDistrict) { setResult({ type: 'error', message: 'Please select source district' }); return; }
        if (!hasAnySystems) { setResult({ type: 'error', message: 'Please enter at least one system quantity' }); return; }
        if (totalPanelsPlanned > 0 && totalPanelsEntered === 0) { setResult({ type: 'error', message: 'Please enter panel wattage breakdown' }); return; }
        if (dispatchType === 'dealer' && !selectedDealerId) { setResult({ type: 'error', message: 'Please select a dealer' }); return; }
        if (dispatchType === 'customer' && !customerName) { setResult({ type: 'error', message: 'Please enter customer name' }); return; }
        if (dispatchType === 'store_transfer' && !toDistrict) { setResult({ type: 'error', message: 'Please select destination district' }); return; }
        if (dispatchType === 'store_transfer' && toDistrict === fromDistrict) { setResult({ type: 'error', message: 'Source and destination cannot be the same' }); return; }
        if (hasShortage) { setResult({ type: 'error', message: 'Cannot dispatch: insufficient stock for some components' }); return; }
        if (!token) return;

        setSubmitting(true);
        setResult(null);

        const simpleItems = SIMPLE_COMPONENTS.map(comp => ({
            component: comp,
            actual_quantity: simpleOverrides[comp] !== undefined ? simpleOverrides[comp]! : planned[comp],
        })).filter(i => i.actual_quantity > 0);

        try {
            await stockAPI.createOutward(token, {
                from_district: fromDistrict,
                dispatch_type: dispatchType,
                dealer_id: dispatchType === 'dealer' ? selectedDealerId : undefined,
                customer_name: dispatchType === 'customer' ? customerName : undefined,
                customer_district: dispatchType === 'customer' ? customerDistrict : undefined,
                registered_customer_id: dispatchType === 'customer' && selectedCustomerId ? selectedCustomerId : undefined,
                to_district: dispatchType === 'store_transfer' ? toDistrict : undefined,
                connector,
                brand: resolvedBrand,
                dcr_type: dcrType,
                systems,
                panel_breakdown: panelBreakdown,
                items: simpleItems,
                notes: notes || undefined,
            });
            setResult({ type: 'success', message: 'Stock outward dispatched successfully!' });
            resetForm();
        } catch (err: any) {
            setResult({
                type: 'error',
                message: err.message || 'Failed to create outward',
                shortages: err.shortages,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getStockStatusIcon = (key: string) => {
        const stock = stockStatus[key];
        if (!stock) return <span className="text-gray-400 text-xs">—</span>;
        if (stock.sufficient) {
            return <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-bold"><CheckCircle size={10} /> {stock.available}</span>;
        }
        return <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs font-bold"><AlertCircle size={10} /> {stock.available}</span>;
    };

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
                                    <li key={i}>
                                        {COMPONENT_LABELS[s.component as StockComponent] || s.component}
                                        {s.sub_type ? ` (${s.sub_type})` : ''}: Available {s.available}, Need {s.requested}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setResult(null)} className="text-xs underline">Dismiss</button>
                </div>
            )}

            {/* Dispatch Info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-orange-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <Package size={18} />
                    Dispatch Information
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
                                    <input type="radio" name="dispatchType" value={dt.value}
                                        checked={dispatchType === dt.value}
                                        onChange={() => setDispatchType(dt.value as any)}
                                        className="w-4 h-4 text-orange-600" />
                                    <span className="font-medium">{dt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Conditional: Dealer */}
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
                                    <button onClick={handleAddDealer}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-1 text-sm">
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conditional: Customer */}
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

                    {/* Conditional: Store Transfer */}
                    {dispatchType === 'store_transfer' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Destination District Store *</label>
                            <select value={toDistrict} onChange={e => setToDistrict(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm">
                                <option value="">Select Destination District</option>
                                {STORE_DISTRICTS.filter(d => d !== fromDistrict).map(d => (<option key={d} value={d}>{d}</option>))}
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

            {/* System Types */}
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

            {/* Inverter Breakdown (auto + stock status) */}
            {hasAnySystems && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 font-semibold text-sm sm:text-base">
                        Inverter Breakdown (Auto)
                    </div>
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

            {/* Panel Wattage Breakdown (with stock status) */}
            {hasAnySystems && totalPanelsPlanned > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-amber-600 text-white px-4 sm:px-5 py-3 font-semibold flex items-center justify-between text-sm sm:text-base">
                        <span>Panel Wattage Breakdown</span>
                        <span className="text-xs sm:text-sm font-normal opacity-90">{totalPanelsEntered} / {totalPanelsPlanned} panels</span>
                    </div>
                    <div className="p-4 sm:p-5">
                        {totalPanelsEntered !== totalPanelsPlanned && totalPanelsEntered > 0 && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                                ⚠️ Entered panels ({totalPanelsEntered}) ≠ BOM planned ({totalPanelsPlanned})
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

            {/* Simple Components with stock validation */}
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
                                    if (plannedQty === 0 && !(simpleOverrides[comp])) return null;
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
                                                    {isOverridden && (
                                                        <button onClick={() => resetSimpleOverride(comp)} className="text-xs text-orange-600 underline">Reset</button>
                                                    )}
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

            {/* Submit */}
            <div className="flex gap-3 justify-end pb-4">
                <button onClick={resetForm}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm">
                    Reset
                </button>
                <button onClick={handleSubmit}
                    disabled={submitting || !fromDistrict || !hasAnySystems || hasShortage}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm">
                    {submitting ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Dispatching...</>
                    ) : (
                        <><ArrowUpFromLine size={18} /> Submit Dispatch</>
                    )}
                </button>
            </div>
        </div>
    );
}
