import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { statsAPI } from '../services/api';
import {
    BarChart3, Users, MapPin, TrendingUp, IndianRupee, Zap,
    Building2, Download, RefreshCw, ChevronDown, ChevronUp,
    ClipboardList, Clock, AlertTriangle, Activity, Sun,
    Wrench, FileText, CheckCircle2, Filter,
} from 'lucide-react';

interface OverviewStats {
    total_customers: number;
    total_employees: number;
    finance_cases: number;
    plant_installations_done: number;
    total_revenue: number;
    collected_revenue: number;
    pending_revenue: number;
    collection_percentage: number;
    tasks_total: number;
    tasks_pending: number;
    tasks_inprogress: number;
    tasks_completed: number;
    attendance_today: number;
    application_status_breakdown: Record<string, number>;
}

const MONTHS = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
    { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const WORK_TYPE_LABELS: Record<string, string> = {
    customer_data_gathering: 'Data Collection', complete_registration: 'Registration',
    cot_request: 'COT Request', name_correction_request: 'Name Correction', load_request: 'Load Request',
    finance_registration: 'Finance Reg', submit_finance_to_bank: 'Submit to Bank',
    submit_indent_to_electrical_department: 'Submit Indent',
    meter_installation: 'Meter Install', collect_remaining_amount: 'Payment Collection',
    generate_bill: 'Bill Generation', approval_of_payment_collection: 'Payment Approval',
    plant_installation: 'Plant Installation',
    take_installed_item_photos: 'Take Photos', upload_installed_item_serial_number: 'Upload Serial',
    inspection: 'Inspection', create_dcr: 'Create DCR', apply_subsidy: 'Apply Subsidy',
    subsidy_redemption: 'Subsidy Redemption', document_handover: 'Doc Handover',
    quality_assurance: 'QA', submit_warranty_document: 'Submit Warranty', assign_qa: 'Assign QA',
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/* ─── Shared UI ─── */
const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', border: 'border-purple-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600', border: 'border-amber-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', border: 'border-red-200' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600', border: 'border-indigo-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600', border: 'border-cyan-200' },
};

const StatCard = ({ icon, label, value, color, sub }: { icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string }) => {
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className={`${c.bg} rounded-2xl p-4 border ${c.border} hover:shadow-md transition-all duration-200`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${c.icon}`}>{icon}</div>
                <span className="text-xs text-gray-500 font-medium truncate">{label}</span>
            </div>
            <p className={`text-xl sm:text-2xl font-bold ${c.text} m-0 leading-tight`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-1 m-0">{sub}</p>}
        </div>
    );
};

const SectionCard = ({ title, icon, sectionKey, sections, toggle, badge, children }: {
    title: string; icon: React.ReactNode; sectionKey: string;
    sections: Record<string, boolean>; toggle: (k: string) => void;
    badge?: string | number; children: React.ReactNode;
}) => (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        <button onClick={() => toggle(sectionKey)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors">
            <div className="flex items-center gap-2.5">
                {icon}
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 m-0">{title}</h2>
                {badge !== undefined && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{badge}</span>}
            </div>
            {sections[sectionKey] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {sections[sectionKey] && <div className="border-t border-gray-100">{children}</div>}
    </div>
);

const FilterBar = ({ children }: { children: React.ReactNode }) => (
    <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-2.5">
        <Filter size={14} className="text-gray-400" />
        {children}
    </div>
);

const Select = ({ value, onChange, children, className = '' }: any) => (
    <select value={value} onChange={onChange} className={`border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all ${className}`}>
        {children}
    </select>
);

const Badge = ({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) => {
    const colors: Record<string, string> = {
        green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
        blue: 'bg-blue-100 text-blue-700', red: 'bg-red-100 text-red-700',
        purple: 'bg-purple-100 text-purple-700', gray: 'bg-gray-100 text-gray-600',
        orange: 'bg-orange-100 text-orange-700',
    };
    return <span className={`${colors[color] || colors.gray} px-2 py-0.5 rounded-full text-xs font-bold inline-block`}>{children}</span>;
};

const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = { pending: 'amber', inprogress: 'blue', completed: 'green' };
    return <Badge color={map[status] || 'gray'}>{status}</Badge>;
};

const EmptyRow = ({ cols }: { cols: number }) => (
    <tr><td colSpan={cols} className="p-8 text-center text-gray-400 text-sm">No data available</td></tr>
);

const TH = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <th className={`p-3 font-semibold text-gray-600 text-xs uppercase tracking-wider ${className}`}>{children}</th>
);

/* ═══════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════ */
const AdminStats: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();

    /* ── state: existing data ── */
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [districtInstallations, setDistrictInstallations] = useState<any[]>([]);
    const [employeesByDistrict, setEmployeesByDistrict] = useState<any[]>([]);
    const [financeCases, setFinanceCases] = useState<any[]>([]);
    const [salesStats, setSalesStats] = useState<any[]>([]);
    const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
    const [taskPipeline, setTaskPipeline] = useState<any[]>([]);
    const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
    const [plantSizes, setPlantSizes] = useState<any[]>([]);
    const [paymentTrend, setPaymentTrend] = useState<any[]>([]);
    const [specialReqs, setSpecialReqs] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any>(null);

    /* ── state: NEW data ── */
    const [plantInstDone, setPlantInstDone] = useState<any>(null);
    const [regByDistrict, setRegByDistrict] = useState<any>(null);
    const [indentData, setIndentData] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /* ── filters: existing ── */
    const [salesYear, setSalesYear] = useState(String(new Date().getFullYear()));
    const [salesMonth, setSalesMonth] = useState('');
    const [salesDistrict, setSalesDistrict] = useState('all');
    const [trendYear, setTrendYear] = useState(String(new Date().getFullYear()));
    const [attMonth, setAttMonth] = useState(String(new Date().getMonth() + 1));
    const [attYear, setAttYear] = useState(String(new Date().getFullYear()));
    const [paymentYear, setPaymentYear] = useState(String(new Date().getFullYear()));

    /* ── filters: NEW ── */
    const [piMonth, setPiMonth] = useState(String(new Date().getMonth() + 1));
    const [piYear, setPiYear] = useState(String(new Date().getFullYear()));
    const [piDistrict, setPiDistrict] = useState('all');

    const [regMonth, setRegMonth] = useState(String(new Date().getMonth() + 1));
    const [regYear, setRegYear] = useState(String(new Date().getFullYear()));

    const [indMonth, setIndMonth] = useState(String(new Date().getMonth() + 1));
    const [indYear, setIndYear] = useState(String(new Date().getFullYear()));
    const [indDistrict, setIndDistrict] = useState('all');
    const [indStatus, setIndStatus] = useState('all');

    /* ── collapsible sections ── */
    const [sections, setSections] = useState<Record<string, boolean>>({
        overview: true, plantInstDone: true, regByDistrict: true, indentSubmissions: true,
        trend: false, installations: false, employees: false,
        finance: false, sales: false, tasks: false,
        attendance: false, plantSize: false, payment: false, special: false, recent: false,
    });
    const toggle = (k: string) => setSections(p => ({ ...p, [k]: !p[k] }));

    const districts = useMemo(() => Array.from(new Set(districtInstallations.map(d => d.district))).sort(), [districtInstallations]);
    const years = useMemo(() => { const c = new Date().getFullYear(); return [c - 2, c - 1, c].map(String); }, []);

    /* ════════════════ Fetchers ════════════════ */
    const fetchAll = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [ov, inst, emp, fin, trend, tp, ps, sr, ra] = await Promise.all([
                statsAPI.getOverview(token),
                statsAPI.getInstallationsByDistrict(token),
                statsAPI.getEmployeesByDistrict(token),
                statsAPI.getFinanceCases(token),
                statsAPI.getMonthlyTrend(token, Number(trendYear)),
                statsAPI.getTaskPipeline(token),
                statsAPI.getPlantSizeDistribution(token),
                statsAPI.getSpecialRequirements(token),
                statsAPI.getRecentActivity(token),
            ]);
            setOverview(ov); setDistrictInstallations(inst); setEmployeesByDistrict(emp);
            setFinanceCases(fin); setMonthlyTrend(trend); setTaskPipeline(tp);
            setPlantSizes(ps); setSpecialReqs(sr); setRecentActivity(ra);
        } catch (e) { console.error(e); showToast('Failed to load stats', 'error'); }
        finally { setLoading(false); }
    };

    const fetchSales = async () => {
        if (!token) return;
        try {
            setSalesStats(await statsAPI.getSalesExecutiveStats(token, {
                year: salesYear ? Number(salesYear) : undefined,
                month: salesMonth ? Number(salesMonth) : undefined,
                district: salesDistrict !== 'all' ? salesDistrict : undefined,
            }));
        } catch (e) { console.error(e); }
    };

    const fetchAttendance = async () => {
        if (!token) return;
        try { setAttendanceSummary(await statsAPI.getAttendanceSummary(token, { month: Number(attMonth), year: Number(attYear) })); }
        catch (e) { console.error(e); }
    };

    const fetchPaymentTrend = async () => {
        if (!token) return;
        try { setPaymentTrend(await statsAPI.getPaymentCollectionTrend(token, Number(paymentYear))); }
        catch (e) { console.error(e); }
    };

    const fetchMonthlyTrend = async () => {
        if (!token) return;
        try { setMonthlyTrend(await statsAPI.getMonthlyTrend(token, Number(trendYear))); }
        catch (e) { console.error(e); }
    };

    const fetchPlantInstDone = async () => {
        if (!token) return;
        try {
            setPlantInstDone(await statsAPI.getPlantInstallationsDone(token, {
                month: piMonth ? Number(piMonth) : undefined,
                year: piYear ? Number(piYear) : undefined,
                district: piDistrict !== 'all' ? piDistrict : undefined,
            }));
        } catch (e) { console.error(e); }
    };

    const fetchRegByDistrict = async () => {
        if (!token) return;
        try {
            setRegByDistrict(await statsAPI.getRegistrationsByDistrict(token, {
                month: regMonth ? Number(regMonth) : undefined,
                year: regYear ? Number(regYear) : undefined,
            }));
        } catch (e) { console.error(e); }
    };

    const fetchIndentData = async () => {
        if (!token) return;
        try {
            setIndentData(await statsAPI.getIndentSubmissions(token, {
                month: indMonth ? Number(indMonth) : undefined,
                year: indYear ? Number(indYear) : undefined,
                district: indDistrict !== 'all' ? indDistrict : undefined,
                status: indStatus !== 'all' ? indStatus : undefined,
            }));
        } catch (e) { console.error(e); }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchAll(), fetchSales(), fetchAttendance(), fetchPaymentTrend(), fetchPlantInstDone(), fetchRegByDistrict(), fetchIndentData()]);
        setRefreshing(false);
        showToast('Dashboard refreshed!', 'success');
    };

    /* ── effects ── */
    useEffect(() => { fetchAll(); fetchSales(); fetchAttendance(); fetchPaymentTrend(); fetchPlantInstDone(); fetchRegByDistrict(); fetchIndentData(); }, []);
    useEffect(() => { fetchSales(); }, [salesYear, salesMonth, salesDistrict]);
    useEffect(() => { fetchAttendance(); }, [attMonth, attYear]);
    useEffect(() => { fetchPaymentTrend(); }, [paymentYear]);
    useEffect(() => { fetchMonthlyTrend(); }, [trendYear]);
    useEffect(() => { fetchPlantInstDone(); }, [piMonth, piYear, piDistrict]);
    useEffect(() => { fetchRegByDistrict(); }, [regMonth, regYear]);
    useEffect(() => { fetchIndentData(); }, [indMonth, indYear, indDistrict, indStatus]);

    /* ── CSV helper ── */
    const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded!', 'success');
    };

    const maxTrend = useMemo(() => Math.max(...monthlyTrend.map(m => m.total_customers), 1), [monthlyTrend]);

    /* ── Loading state ── */
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
                <RefreshCw size={32} className="animate-spin text-blue-500" />
                <p className="text-gray-400 text-sm font-medium">Loading dashboard...</p>
            </div>
        </div>
    );

    /* ════════════════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════════════════ */
    return (
        <div className="flex flex-col gap-5 p-3 sm:p-5 max-w-7xl mx-auto w-full">

            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2.5">
                        <div className="p-2 bg-blue-100 rounded-xl"><BarChart3 size={22} className="text-blue-600" /></div>
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 ml-12">Business overview &amp; analytics</p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 shadow-sm">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />Refresh
                </button>
            </div>

            {/* ═══ KPI OVERVIEW CARDS ═══ */}
            {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard icon={<Users size={20} />} label="Total Customers" value={overview.total_customers} color="blue" />
                    <StatCard icon={<Zap size={20} />} label="Installations Done" value={overview.plant_installations_done} color="green" />
                    <StatCard icon={<Users size={20} />} label="Employees" value={overview.total_employees} color="purple" />
                    <StatCard icon={<Building2 size={20} />} label="Finance Cases" value={overview.finance_cases} color="amber" />
                    <StatCard icon={<IndianRupee size={20} />} label="Total Revenue" value={fmt(overview.total_revenue)} color="blue" sub={`Collected: ${overview.collection_percentage}%`} />
                    <StatCard icon={<IndianRupee size={20} />} label="Collected" value={fmt(overview.collected_revenue)} color="green" />
                    <StatCard icon={<IndianRupee size={20} />} label="Pending" value={fmt(overview.pending_revenue)} color="red" />
                    <StatCard icon={<Clock size={20} />} label="Attendance Today" value={`${overview.attendance_today}/${overview.total_employees}`} color="purple" />
                    <StatCard icon={<ClipboardList size={20} />} label="Tasks Pending" value={overview.tasks_pending} color="amber" />
                    <StatCard icon={<Activity size={20} />} label="Tasks In Progress" value={overview.tasks_inprogress} color="cyan" />
                    <StatCard icon={<CheckCircle2 size={20} />} label="Tasks Completed" value={overview.tasks_completed} color="green" />
                    <StatCard icon={<TrendingUp size={20} />} label="Collection %" value={`${overview.collection_percentage}%`} color="indigo" />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
               1. PLANT INSTALLATIONS COMPLETED  (NEW)
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Plant Installations Completed" icon={<Wrench size={18} className="text-emerald-600" />}
                sectionKey="plantInstDone" sections={sections} toggle={toggle} badge={plantInstDone?.total}>
                <FilterBar>
                    <Select value={piMonth} onChange={(e: any) => setPiMonth(e.target.value)}>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={piYear} onChange={(e: any) => setPiYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Select value={piDistrict} onChange={(e: any) => setPiDistrict(e.target.value)}>
                        <option value="all">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    {plantInstDone?.installations?.length > 0 && (
                        <button onClick={() => downloadCSV(
                            ['Customer', 'Mobile', 'District', 'Plant kW', 'System', 'Price', 'Installed By', 'Completed Date'],
                            plantInstDone.installations.map((r: any) => [r.applicant_name, r.mobile_number, r.district, r.plant_size_kw, r.solar_system_type, r.plant_price, r.assigned_to_name, fmtDate(r.completed_date)]),
                            `plant-installations-${piYear}-${piMonth || 'all'}.csv`
                        )} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium">
                            <Download size={13} />CSV
                        </button>
                    )}
                </FilterBar>
                {/* District summary chips */}
                {plantInstDone?.summary?.length > 0 && (
                    <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-gray-100">
                        {plantInstDone.summary.map((s: any) => (
                            <div key={s.district} className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
                                <span className="font-semibold text-emerald-800">{s.district}</span>
                                <span className="text-emerald-600 ml-2">{s.count} done · {Number(s.total_kw).toFixed(1)} kW · {fmt(s.total_value)}</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">Customer</TH>
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Plant (kW)</TH>
                            <TH className="text-left">System</TH>
                            <TH className="text-right">Price</TH>
                            <TH className="text-left">Installed By</TH>
                            <TH className="text-left">Completed</TH>
                        </tr></thead>
                        <tbody>
                            {plantInstDone?.installations?.map((r: any, i: number) => (
                                <tr key={r.customer_id} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3">
                                        <span className="font-medium text-gray-800">{r.applicant_name}</span>
                                        <br /><span className="text-gray-400 text-xs">{r.mobile_number}</span>
                                    </td>
                                    <td className="p-3 text-gray-600">{r.district}</td>
                                    <td className="p-3 text-center font-bold text-gray-800">{Number(r.plant_size_kw).toFixed(1)}</td>
                                    <td className="p-3 text-gray-600 text-xs">{r.solar_system_type}</td>
                                    <td className="p-3 text-right font-medium text-gray-800">{fmt(r.plant_price)}</td>
                                    <td className="p-3 text-gray-600 text-xs">{r.assigned_to_name}</td>
                                    <td className="p-3 text-gray-500 text-xs">{fmtDate(r.completed_date)}</td>
                                </tr>
                            ))}
                            {(!plantInstDone?.installations || plantInstDone.installations.length === 0) && <EmptyRow cols={7} />}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               2. REGISTRATIONS BY DISTRICT  (NEW)
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Registrations by District" icon={<MapPin size={18} className="text-blue-600" />}
                sectionKey="regByDistrict" sections={sections} toggle={toggle} badge={regByDistrict?.grandTotal?.total}>
                <FilterBar>
                    <Select value={regMonth} onChange={(e: any) => setRegMonth(e.target.value)}>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={regYear} onChange={(e: any) => setRegYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </FilterBar>
                {/* Grand total summary */}
                {regByDistrict?.grandTotal && (
                    <div className="px-5 py-3 flex flex-wrap gap-4 bg-blue-50/50 border-b border-gray-100">
                        <div className="text-xs"><span className="text-gray-500">Total Registrations: </span><span className="font-bold text-blue-700">{regByDistrict.grandTotal.total}</span></div>
                        <div className="text-xs"><span className="text-gray-500">Completed: </span><span className="font-bold text-emerald-700">{regByDistrict.grandTotal.completed}</span></div>
                        <div className="text-xs"><span className="text-gray-500">Capacity: </span><span className="font-bold text-purple-700">{Number(regByDistrict.grandTotal.total_kw).toFixed(1)} kW</span></div>
                        <div className="text-xs"><span className="text-gray-500">Value: </span><span className="font-bold text-gray-800">{fmt(regByDistrict.grandTotal.total_value)}</span></div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Total</TH>
                            <TH className="text-center">Completed</TH>
                            <TH className="text-center">Draft</TH>
                            <TH className="text-center">Cash</TH>
                            <TH className="text-center">Finance</TH>
                            <TH className="text-right">Capacity (kW)</TH>
                            <TH className="text-right">Value</TH>
                        </tr></thead>
                        <tbody>
                            {regByDistrict?.districts?.map((d: any, i: number) => (
                                <tr key={d.district} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">
                                        <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-blue-400" />{d.district}</span>
                                    </td>
                                    <td className="p-3 text-center font-bold text-gray-800">{d.total}</td>
                                    <td className="p-3 text-center"><Badge color="green">{d.completed}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="amber">{d.draft}</Badge></td>
                                    <td className="p-3 text-center text-gray-600">{d.cash_cases}</td>
                                    <td className="p-3 text-center"><Badge color="purple">{d.finance_cases}</Badge></td>
                                    <td className="p-3 text-right text-gray-600">{Number(d.total_kw).toFixed(1)}</td>
                                    <td className="p-3 text-right font-medium text-gray-800">{fmt(d.total_value)}</td>
                                </tr>
                            ))}
                            {(!regByDistrict?.districts || regByDistrict.districts.length === 0) && <EmptyRow cols={8} />}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               3. INDENT SUBMITTED TO ELECTRICAL DEPT  (NEW)
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Indent Submitted to Electrical Dept" icon={<FileText size={18} className="text-orange-600" />}
                sectionKey="indentSubmissions" sections={sections} toggle={toggle} badge={indentData?.total}>
                <FilterBar>
                    <Select value={indMonth} onChange={(e: any) => setIndMonth(e.target.value)}>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={indYear} onChange={(e: any) => setIndYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Select value={indDistrict} onChange={(e: any) => setIndDistrict(e.target.value)}>
                        <option value="all">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    <Select value={indStatus} onChange={(e: any) => setIndStatus(e.target.value)}>
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="inprogress">In Progress</option>
                        <option value="completed">Completed</option>
                    </Select>
                    {indentData?.indents?.length > 0 && (
                        <button onClick={() => downloadCSV(
                            ['Customer', 'Mobile', 'District', 'Plant kW', 'Status', 'Assigned To', 'Created', 'Updated'],
                            indentData.indents.map((r: any) => [r.applicant_name, r.mobile_number, r.district, r.plant_size_kw, r.status, r.assigned_to_name, fmtDate(r.created_at), fmtDate(r.updated_at)]),
                            `indent-submissions-${indYear}-${indMonth || 'all'}.csv`
                        )} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs font-medium">
                            <Download size={13} />CSV
                        </button>
                    )}
                </FilterBar>
                {/* District summary chips */}
                {indentData?.summary?.length > 0 && (
                    <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-gray-100">
                        {indentData.summary.map((s: any) => (
                            <div key={s.district} className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs flex items-center gap-2">
                                <span className="font-semibold text-orange-800">{s.district}</span>
                                <Badge color="amber">{s.pending} pending</Badge>
                                <Badge color="blue">{s.inprogress} in-progress</Badge>
                                <Badge color="green">{s.completed} done</Badge>
                            </div>
                        ))}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">Customer</TH>
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Plant (kW)</TH>
                            <TH className="text-center">Status</TH>
                            <TH className="text-left">Assigned To</TH>
                            <TH className="text-left">Created</TH>
                            <TH className="text-left">Updated</TH>
                        </tr></thead>
                        <tbody>
                            {indentData?.indents?.map((r: any, i: number) => (
                                <tr key={r.task_id} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3">
                                        <span className="font-medium text-gray-800">{r.applicant_name}</span>
                                        <br /><span className="text-gray-400 text-xs">{r.mobile_number}</span>
                                    </td>
                                    <td className="p-3 text-gray-600">{r.district}</td>
                                    <td className="p-3 text-center font-bold text-gray-800">{Number(r.plant_size_kw).toFixed(1)}</td>
                                    <td className="p-3 text-center"><StatusBadge status={r.status} /></td>
                                    <td className="p-3 text-gray-600 text-xs">{r.assigned_to_name}</td>
                                    <td className="p-3 text-gray-500 text-xs">{fmtDate(r.created_at)}</td>
                                    <td className="p-3 text-gray-500 text-xs">{fmtDate(r.updated_at)}</td>
                                </tr>
                            ))}
                            {(!indentData?.indents || indentData.indents.length === 0) && <EmptyRow cols={7} />}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               MONTHLY REGISTRATION TREND
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Monthly Registration Trend" icon={<TrendingUp size={18} className="text-blue-600" />}
                sectionKey="trend" sections={sections} toggle={toggle}>
                <FilterBar>
                    <Select value={trendYear} onChange={(e: any) => setTrendYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </FilterBar>
                <div className="p-5">
                    <div className="flex items-end justify-center gap-1.5 sm:gap-3 h-64 bg-gray-50 rounded-xl p-4">
                        {monthlyTrend.map(m => {
                            const h = maxTrend > 0 ? (m.total_customers / maxTrend) * 100 : 0;
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full">
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium h-4">{m.total_customers > 0 ? m.total_customers : ''}</span>
                                    <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-all cursor-pointer group relative"
                                        style={{ height: `${Math.max(h, 3)}%` }}>
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                                            <p className="font-semibold">{m.month_name}</p>
                                            <p>Total: {m.total_customers} | Done: {m.completed}</p>
                                            <p>Cash: {m.cash_cases} | Finance: {m.finance_cases}</p>
                                            <p>{fmt(m.total_value)} | {m.total_capacity_kw} kW</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] sm:text-xs text-gray-500 mt-1 font-semibold">{m.month_name.slice(0, 3)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               PAYMENT COLLECTION TREND
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Payment Collection Trend" icon={<IndianRupee size={18} className="text-emerald-600" />}
                sectionKey="payment" sections={sections} toggle={toggle}>
                <FilterBar>
                    <Select value={paymentYear} onChange={(e: any) => setPaymentYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                </FilterBar>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">Month</TH>
                            <TH className="text-right">Target</TH>
                            <TH className="text-right">Collected</TH>
                            <TH className="text-right">Pending</TH>
                            <TH className="text-center">Fully Paid</TH>
                            <TH className="text-center">Not Paid</TH>
                        </tr></thead>
                        <tbody>
                            {paymentTrend.filter(m => m.total_customers > 0).map((m, i) => (
                                <tr key={m.month} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">{m.month_name}</td>
                                    <td className="p-3 text-right text-gray-600">{fmt(m.target_amount)}</td>
                                    <td className="p-3 text-right text-emerald-700 font-medium">{fmt(m.collected_amount)}</td>
                                    <td className="p-3 text-right text-red-600">{fmt(m.pending_amount)}</td>
                                    <td className="p-3 text-center"><Badge color="green">{m.fully_paid}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="red">{m.not_paid}</Badge></td>
                                </tr>
                            ))}
                            {paymentTrend.filter(m => m.total_customers > 0).length === 0 && <EmptyRow cols={6} />}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               SOLAR INSTALLATIONS BY DISTRICT (existing)
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Solar Installations by District" icon={<MapPin size={18} className="text-emerald-600" />}
                sectionKey="installations" sections={sections} toggle={toggle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Total</TH>
                            <TH className="text-center">Completed</TH>
                            <TH className="text-center">In Progress</TH>
                            <TH className="text-center">Cancelled</TH>
                            <TH className="text-right">Capacity (kW)</TH>
                            <TH className="text-right">Business Value</TH>
                        </tr></thead>
                        <tbody>
                            {districtInstallations.map((d, i) => (
                                <tr key={d.district} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">{d.district}</td>
                                    <td className="p-3 text-center font-bold">{d.total_customers}</td>
                                    <td className="p-3 text-center"><Badge color="green">{d.completed}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="amber">{d.in_progress}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="red">{d.cancelled}</Badge></td>
                                    <td className="p-3 text-right text-gray-600">{Number(d.total_capacity_kw).toFixed(1)}</td>
                                    <td className="p-3 text-right font-medium text-gray-800">{fmt(d.total_business_value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               TASK PIPELINE
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Task Pipeline (by Work Type)" icon={<ClipboardList size={18} className="text-indigo-600" />}
                sectionKey="tasks" sections={sections} toggle={toggle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">Work Type</TH>
                            <TH className="text-center">Total</TH>
                            <TH className="text-center">Pending</TH>
                            <TH className="text-center">In Progress</TH>
                            <TH className="text-center">Completed</TH>
                            <TH className="text-center">Completion %</TH>
                        </tr></thead>
                        <tbody>
                            {taskPipeline.map((t, i) => {
                                const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
                                return (
                                    <tr key={t.work_type} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                        <td className="p-3 font-medium text-gray-800">{WORK_TYPE_LABELS[t.work_type] || t.work_type.replace(/_/g, ' ')}</td>
                                        <td className="p-3 text-center font-bold">{t.total}</td>
                                        <td className="p-3 text-center"><Badge color="amber">{t.pending}</Badge></td>
                                        <td className="p-3 text-center"><Badge color="blue">{t.inprogress}</Badge></td>
                                        <td className="p-3 text-center"><Badge color="green">{t.completed}</Badge></td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               ATTENDANCE SUMMARY
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Attendance Summary" icon={<Clock size={18} className="text-purple-600" />}
                sectionKey="attendance" sections={sections} toggle={toggle}>
                <FilterBar>
                    <Select value={attMonth} onChange={(e: any) => setAttMonth(e.target.value)}>
                        {MONTHS.filter(m => m.value !== '').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={attYear} onChange={(e: any) => setAttYear(e.target.value)}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    {attendanceSummary && <span className="text-xs text-gray-400 ml-auto">Days counted: {attendanceSummary.days_in_month}</span>}
                </FilterBar>
                {attendanceSummary && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                                <TH className="text-left">Employee</TH>
                                <TH className="text-left">Role</TH>
                                <TH className="text-left">District</TH>
                                <TH className="text-center">Present</TH>
                                <TH className="text-center">Absent</TH>
                                <TH className="text-center">Late</TH>
                                <TH className="text-center">%</TH>
                            </tr></thead>
                            <tbody>
                                {attendanceSummary.employees.map((e: any, i: number) => (
                                    <tr key={e.employee_id} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                        <td className="p-3 font-medium text-gray-800">{e.employee_name}</td>
                                        <td className="p-3 text-xs text-gray-500">{e.employee_role}</td>
                                        <td className="p-3 text-xs text-gray-600">{e.district || 'N/A'}</td>
                                        <td className="p-3 text-center"><Badge color="green">{e.days_present}</Badge></td>
                                        <td className="p-3 text-center"><Badge color={e.days_absent > 5 ? 'red' : 'gray'}>{e.days_absent}</Badge></td>
                                        <td className="p-3 text-center"><Badge color={e.late_days > 3 ? 'amber' : 'gray'}>{e.late_days}</Badge></td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center gap-1.5 justify-center">
                                                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${e.attendance_percentage >= 80 ? 'bg-emerald-500' : e.attendance_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${e.attendance_percentage}%` }} />
                                                </div>
                                                <span className="text-xs text-gray-500">{e.attendance_percentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               EMPLOYEES BY DISTRICT
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Employees by District" icon={<Users size={18} className="text-purple-600" />}
                sectionKey="employees" sections={sections} toggle={toggle}>
                <div className="p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {employeesByDistrict.map(d => (
                            <div key={d.district} className="border border-gray-200 rounded-xl p-3.5 hover:shadow-md transition-shadow bg-white">
                                <div className="flex items-center justify-between mb-2.5">
                                    <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                                        <MapPin size={14} className="text-purple-500" />{d.district}
                                    </h3>
                                    <Badge color="purple">{d.total}</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(d.roles).map(([role, count]: [string, any]) => (
                                        <span key={role} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100">
                                            {role}: <strong className="text-gray-700">{count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               PLANT SIZE DISTRIBUTION
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Plant Size Distribution" icon={<Sun size={18} className="text-amber-500" />}
                sectionKey="plantSize" sections={sections} toggle={toggle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">Size Range</TH>
                            <TH className="text-left">Plant Type</TH>
                            <TH className="text-center">Count</TH>
                            <TH className="text-right">Total Value</TH>
                        </tr></thead>
                        <tbody>
                            {plantSizes.map((p, i) => (
                                <tr key={`${p.size_range}-${p.solar_plant_type}`} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">{p.size_range}</td>
                                    <td className="p-3">
                                        <Badge color={p.solar_plant_type === 'Residential' ? 'blue' : p.solar_plant_type === 'Commercial' ? 'purple' : 'amber'}>
                                            {p.solar_plant_type}
                                        </Badge>
                                    </td>
                                    <td className="p-3 text-center font-bold">{p.count}</td>
                                    <td className="p-3 text-right text-gray-800">{fmt(p.total_value)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               SPECIAL REQUIREMENTS
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Special Requirements (COT / Name Correction / Load)" icon={<AlertTriangle size={18} className="text-red-500" />}
                sectionKey="special" sections={sections} toggle={toggle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">District</TH>
                            <TH className="text-center">COT Cases</TH>
                            <TH className="text-center">Name Correction</TH>
                            <TH className="text-center">Load Enhancement</TH>
                            <TH className="text-center">Total</TH>
                        </tr></thead>
                        <tbody>
                            {specialReqs.map((s, i) => (
                                <tr key={s.district} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">{s.district}</td>
                                    <td className="p-3 text-center"><Badge color={s.cot_cases > 0 ? 'amber' : 'gray'}>{s.cot_cases}</Badge></td>
                                    <td className="p-3 text-center"><Badge color={s.name_correction_cases > 0 ? 'purple' : 'gray'}>{s.name_correction_cases}</Badge></td>
                                    <td className="p-3 text-center"><Badge color={s.load_enhancement_cases > 0 ? 'red' : 'gray'}>{s.load_enhancement_cases}</Badge></td>
                                    <td className="p-3 text-center font-bold">{s.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               FINANCE CASES
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Finance Cases" icon={<Building2 size={18} className="text-amber-600" />}
                sectionKey="finance" sections={sections} toggle={toggle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Mode</TH>
                            <TH className="text-center">Special Finance</TH>
                            <TH className="text-center">Cases</TH>
                            <TH className="text-right">Value</TH>
                            <TH className="text-right">Capacity</TH>
                        </tr></thead>
                        <tbody>
                            {financeCases.map((fc, i) => (
                                <tr key={`${fc.district}-${i}`} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-800">{fc.district}</td>
                                    <td className="p-3 text-center"><Badge color="amber">{fc.payment_mode}</Badge></td>
                                    <td className="p-3 text-center"><Badge color={fc.special_finance_required === 'Yes' ? 'red' : 'gray'}>{fc.special_finance_required}</Badge></td>
                                    <td className="p-3 text-center font-bold">{fc.count}</td>
                                    <td className="p-3 text-right text-gray-800">{fmt(fc.total_value)}</td>
                                    <td className="p-3 text-right text-gray-600">{Number(fc.total_capacity_kw).toFixed(1)} kW</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               SALES EXECUTIVE PERFORMANCE
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Sales Executive Performance" icon={<TrendingUp size={18} className="text-indigo-600" />}
                sectionKey="sales" sections={sections} toggle={toggle}>
                <FilterBar>
                    <Select value={salesYear} onChange={(e: any) => setSalesYear(e.target.value)}>
                        <option value="">All Years</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Select value={salesMonth} onChange={(e: any) => setSalesMonth(e.target.value)}>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                    <Select value={salesDistrict} onChange={(e: any) => setSalesDistrict(e.target.value)}>
                        <option value="all">All Districts</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    <button onClick={() => downloadCSV(
                        ['Name', 'Phone', 'District', 'Customers', 'Completed', 'Finance', 'Business Value', 'Capacity kW'],
                        salesStats.map(s => [s.employee_name, s.phone_number, s.employee_district || 'N/A', s.total_customers, s.completed_customers, s.finance_customers, s.total_business_value, s.total_capacity_kw]),
                        `sales-stats-${salesYear || 'all'}.csv`
                    )} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium">
                        <Download size={13} />CSV
                    </button>
                </FilterBar>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                            <TH className="text-left">#</TH>
                            <TH className="text-left">Name</TH>
                            <TH className="text-left">Phone</TH>
                            <TH className="text-left">District</TH>
                            <TH className="text-center">Customers</TH>
                            <TH className="text-center">Completed</TH>
                            <TH className="text-center">Finance</TH>
                            <TH className="text-right">Business Value</TH>
                            <TH className="text-right">Capacity</TH>
                        </tr></thead>
                        <tbody>
                            {salesStats.map((s, i) => (
                                <tr key={s.employee_id} className={`border-b border-gray-100 hover:bg-blue-50/40 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                                    <td className="p-3 text-gray-400">{i + 1}</td>
                                    <td className="p-3 font-medium text-gray-800">{s.employee_name}</td>
                                    <td className="p-3 text-gray-500">{s.phone_number}</td>
                                    <td className="p-3 text-gray-600">{s.employee_district || 'N/A'}</td>
                                    <td className="p-3 text-center"><Badge color="blue">{s.total_customers}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="green">{s.completed_customers}</Badge></td>
                                    <td className="p-3 text-center"><Badge color="amber">{s.finance_customers}</Badge></td>
                                    <td className="p-3 text-right font-medium text-gray-800">{fmt(s.total_business_value)}</td>
                                    <td className="p-3 text-right text-gray-600">{Number(s.total_capacity_kw).toFixed(1)} kW</td>
                                </tr>
                            ))}
                            {salesStats.length === 0 && <EmptyRow cols={9} />}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════════
               RECENT ACTIVITY
               ═══════════════════════════════════════════════════ */}
            <SectionCard title="Recent Activity" icon={<Activity size={18} className="text-blue-600" />}
                sectionKey="recent" sections={sections} toggle={toggle}>
                {recentActivity && (
                    <div className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Latest Registrations */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                    <Users size={14} className="text-blue-500" />Latest Registrations
                                </h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_customers.map((c: any) => (
                                        <div key={c.id} className="border border-gray-200 rounded-xl p-3 text-xs hover:shadow-sm transition-shadow">
                                            <p className="font-medium text-gray-800">{c.applicant_name}</p>
                                            <p className="text-gray-400">{c.district} · {c.plant_size_kw} kW · {c.payment_mode}</p>
                                            <div className="flex justify-between mt-1.5">
                                                <Badge color={c.application_status === 'COMPLETED' ? 'green' : 'gray'}>{c.application_status}</Badge>
                                                <span className="text-gray-400 text-[10px]">by {c.created_by_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Active Tasks */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                    <ClipboardList size={14} className="text-amber-600" />Active Tasks
                                </h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_tasks.map((t: any) => (
                                        <div key={t.id} className="border border-gray-200 rounded-xl p-3 text-xs hover:shadow-sm transition-shadow">
                                            <p className="font-medium text-gray-800">{WORK_TYPE_LABELS[t.work_type] || t.work_type.replace(/_/g, ' ')}</p>
                                            <p className="text-gray-400">{t.assigned_to_name} · {t.assigned_to_role}</p>
                                            <StatusBadge status={t.status} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Recent Payments */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                    <IndianRupee size={14} className="text-emerald-600" />Recent Payments
                                </h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_payments.map((p: any) => (
                                        <div key={p.id} className="border border-gray-200 rounded-xl p-3 text-xs hover:shadow-sm transition-shadow">
                                            <p className="font-medium text-gray-800">{p.applicant_name}</p>
                                            <p className="text-gray-400">{p.district}</p>
                                            <div className="flex justify-between mt-1.5">
                                                <span className="text-emerald-700 font-medium">Paid: {fmt(p.paid_amount)}</span>
                                                <span className="text-red-600">Left: {fmt(p.remaining)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
};

export default AdminStats;
