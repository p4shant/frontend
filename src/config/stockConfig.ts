/**
 * Stock Management Configuration (Frontend)
 * ============================================
 * Mirrors backend stockConfig.js — single source of truth for UI.
 * V2: Includes sub_type support for panels (wattage) and inverters (KW type).
 */

// ---------------------------------------------------------------------------
// Components tracked in inventory
// ---------------------------------------------------------------------------
export const STOCK_COMPONENTS = [
    'panel',
    'inverter',
    'acdb',
    'dcdb',
    'earthing_rod',
    'earthing_chemical',
    'lightning_arrestor',
] as const;

export type StockComponent = (typeof STOCK_COMPONENTS)[number];

export const COMPONENT_LABELS: Record<StockComponent, string> = {
    panel: 'Solar Panel',
    inverter: 'Inverter',
    acdb: 'ACDB',
    dcdb: 'DCDB',
    earthing_rod: 'Earthing Rod',
    earthing_chemical: 'Earthing Chemical',
    lightning_arrestor: 'Lightning Arrestor',
};

// Short labels for table headers
export const COMPONENT_SHORT_LABELS: Record<StockComponent, string> = {
    panel: 'Panel',
    inverter: 'Inv',
    acdb: 'ACDB',
    dcdb: 'DCDB',
    earthing_rod: 'E Rod',
    earthing_chemical: 'E Chem',
    lightning_arrestor: 'LA',
};

// ---------------------------------------------------------------------------
// Entry Mode (mandatory on every inward/outward record)
// ---------------------------------------------------------------------------
export const ENTRY_MODES = [
    { value: 'system', label: '☀️ Solar System', description: 'Full system kit — all components auto-calculated from BOM' },
    { value: 'component', label: '🔧 Component-wise', description: 'Individual components only — enter quantities directly' },
] as const;

export type EntryMode = 'system' | 'component';

// ---------------------------------------------------------------------------
// Sub-type support
// ---------------------------------------------------------------------------
export const COMPONENTS_WITH_SUBTYPES: StockComponent[] = ['panel', 'inverter'];

export const PANEL_WATTAGES = ['570', '575', '580', '585', '590'] as const;
export type PanelWattage = (typeof PANEL_WATTAGES)[number];

export const INVERTER_TYPES = ['2KW', '3KW', '4KW', '5(I)KW', '5(III)KW', '6KW', '8KW', '10KW'] as const;
export type InverterType = (typeof INVERTER_TYPES)[number];

// ---------------------------------------------------------------------------
// Bill of Materials (BOM) — components required per system type
// ---------------------------------------------------------------------------
export const SYSTEM_BOM: Record<string, Record<StockComponent, number>> = {
    '2KW': { panel: 4, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '3KW': { panel: 6, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '4KW': { panel: 8, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '5(I)KW': { panel: 9, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '5(III)KW': { panel: 9, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '6KW': { panel: 11, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '8KW': { panel: 15, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
    '10KW': { panel: 18, inverter: 1, acdb: 1, dcdb: 1, earthing_rod: 3, earthing_chemical: 3, lightning_arrestor: 1 },
};

export const SYSTEM_TYPES = Object.keys(SYSTEM_BOM);

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------
export const BRANDS = ['Tata', 'Adani', 'Waree', 'Vikram', 'Other'] as const;
export const NON_TATA_BRANDS = ['Adani', 'Waree', 'Vikram', 'Other'] as const;

// ---------------------------------------------------------------------------
// DCR types
// ---------------------------------------------------------------------------
export const DCR_TYPES = ['DCR', 'Non-DCR'] as const;

// ---------------------------------------------------------------------------
// District stores
// ---------------------------------------------------------------------------
export const STORE_DISTRICTS = ['Ghazipur', 'Varanasi', 'Mau', 'Azamgarh', 'Ballia'] as const;

// ---------------------------------------------------------------------------
// Connectors (hardcoded sales people)
// ---------------------------------------------------------------------------
export const CONNECTORS = ['SN Singh', 'Bablu', 'Ashish', 'Upender', 'Devesh', 'Other'] as const;

// ---------------------------------------------------------------------------
// Dispatch types
// ---------------------------------------------------------------------------
export const DISPATCH_TYPES = [
    { value: 'customer', label: 'Customer' },
    { value: 'dealer', label: 'Dealer' },
    { value: 'store_transfer', label: 'Store to Store' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate planned aggregate components from system quantities.
 * Returns flat totals: { panel: N, inverter: N, acdb: N, ... }
 */
export function calculatePlannedComponents(
    systems: Record<string, number>
): Record<StockComponent, number> {
    const totals = {} as Record<StockComponent, number>;
    STOCK_COMPONENTS.forEach(c => { totals[c] = 0; });

    for (const [systemType, qty] of Object.entries(systems)) {
        const bom = SYSTEM_BOM[systemType];
        if (!bom || qty <= 0) continue;
        for (const comp of STOCK_COMPONENTS) {
            totals[comp] += (bom[comp] || 0) * qty;
        }
    }
    return totals;
}

/**
 * Calculate inverter breakdown by sub_type from system quantities.
 * Returns: { '2KW': 3, '3KW': 2, ... }
 */
export function calculateInverterBreakdown(
    systems: Record<string, number>
): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const [systemType, qty] of Object.entries(systems)) {
        if (qty > 0) {
            breakdown[systemType] = (breakdown[systemType] || 0) + qty;
        }
    }
    return breakdown;
}

/**
 * Calculate expected total panel count from inverter quantities.
 * "How many panels should exist given these inverters"
 */
export function calculateExpectedPanelsFromInverters(
    inverterBreakdown: Record<string, number>
): number {
    let total = 0;
    for (const [sysType, qty] of Object.entries(inverterBreakdown)) {
        const bom = SYSTEM_BOM[sysType];
        if (bom) {
            total += bom.panel * qty;
        }
    }
    return total;
}

// ---------------------------------------------------------------------------
// Types for API responses
// ---------------------------------------------------------------------------
export interface InventoryItem {
    id: number;
    district: string;
    component: StockComponent;
    sub_type: string | null;
    brand: string;
    dcr_type: string;
    quantity: number;
}

export interface Dealer {
    id: number;
    name: string;
    is_active: number;
}

export interface InwardRecord {
    id: number;
    district: string;
    brand: string;
    dcr_type: string;
    entry_mode: EntryMode;
    notes: string | null;
    created_by: number;
    created_by_name: string;
    created_at: string;
    systems: { system_type: string; quantity: number }[];
    items: { component: string; sub_type: string | null; planned_quantity: number; actual_quantity: number }[];
}

export interface OutwardRecord {
    id: number;
    from_district: string;
    dispatch_type: string;
    dealer_id: number | null;
    dealer_name: string | null;
    customer_name: string | null;
    customer_district: string | null;
    registered_customer_id: number | null;
    to_district: string | null;
    connector: string | null;
    brand: string;
    dcr_type: string;
    entry_mode: EntryMode;
    notes: string | null;
    created_by: number;
    created_by_name: string;
    created_at: string;
    systems: { system_type: string; quantity: number }[];
    items: { component: string; sub_type: string | null; planned_quantity: number; actual_quantity: number }[];
}

export interface MovementLogEntry {
    id: number;
    district: string;
    component: string;
    sub_type: string | null;
    brand: string;
    dcr_type: string;
    movement_type: string;
    reference_type: string;
    reference_id: number;
    quantity_change: number;
    quantity_before: number;
    quantity_after: number;
    created_by: number;
    created_by_name: string;
    created_at: string;
}

export interface SnapshotRow {
    id: number;
    snapshot_date: string;
    district: string;
    component: StockComponent;
    sub_type: string | null;
    brand: string;
    dcr_type: string;
    quantity: number;
}

export interface CustomerSearchResult {
    id: number;
    applicant_name: string;
    mobile_number: string;
    district: string;
}
