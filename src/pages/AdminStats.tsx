import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { statsAPI } from '../services/api';
import {
    BarChart3, Users, MapPin, TrendingUp, IndianRupee, Zap,
    Building2, Download, RefreshCw, ChevronDown, ChevronUp,
    ClipboardList, Clock, AlertTriangle, Activity, Sun,
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
    hard_copy_indent_creation: 'Indent Creation', submit_indent_to_electrical_department: 'Submit Indent',
    meter_installation: 'Meter Install', collect_remaining_amount: 'Payment Collection',
    generate_bill: 'Bill Generation', approval_of_payment_collection: 'Payment Approval',
    plant_installation: 'Plant Installation', approval_of_plant_installation: 'Install Approval',
    take_installed_item_photos: 'Take Photos', upload_installed_item_serial_number: 'Upload Serial',
    inspection: 'Inspection', create_cdr: 'Create CDR', apply_subsidy: 'Apply Subsidy',
    subsidy_redemption: 'Subsidy Redemption', document_handover: 'Doc Handover',
    quality_assurance: 'QA', submit_warranty_document: 'Submit Warranty', assign_qa: 'Assign QA',
};

const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const AdminStats: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();

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

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [salesYear, setSalesYear] = useState(String(new Date().getFullYear()));
    const [salesMonth, setSalesMonth] = useState('');
    const [salesDistrict, setSalesDistrict] = useState('all');
    const [trendYear, setTrendYear] = useState(String(new Date().getFullYear()));
    const [attMonth, setAttMonth] = useState(String(new Date().getMonth() + 1));
    const [attYear, setAttYear] = useState(String(new Date().getFullYear()));
    const [paymentYear, setPaymentYear] = useState(String(new Date().getFullYear()));

    const [sections, setSections] = useState<Record<string, boolean>>({
        overview: true, trend: true, installations: true, employees: true,
        finance: true, sales: true, tasks: true,
        attendance: true, plantSize: true, payment: true, special: true, recent: true,
    });
    const toggle = (k: string) => setSections(p => ({ ...p, [k]: !p[k] }));

    const districts = useMemo(() => Array.from(new Set(districtInstallations.map(d => d.district))).sort(), [districtInstallations]);
    const years = useMemo(() => { const c = new Date().getFullYear(); return [c - 2, c - 1, c].map(String); }, []);

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
            const data = await statsAPI.getSalesExecutiveStats(token, {
                year: salesYear ? Number(salesYear) : undefined,
                month: salesMonth ? Number(salesMonth) : undefined,
                district: salesDistrict !== 'all' ? salesDistrict : undefined,
            });
            setSalesStats(data);
        } catch (e) { console.error(e); }
    };

    const fetchAttendance = async () => {
        if (!token) return;
        try {
            const data = await statsAPI.getAttendanceSummary(token, { month: Number(attMonth), year: Number(attYear) });
            setAttendanceSummary(data);
        } catch (e) { console.error(e); }
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

    const handleRefresh = async () => { setRefreshing(true); await fetchAll(); await fetchSales(); await fetchAttendance(); await fetchPaymentTrend(); setRefreshing(false); showToast('Stats refreshed!', 'success'); };

    useEffect(() => { fetchAll(); fetchSales(); fetchAttendance(); fetchPaymentTrend(); }, []);
    useEffect(() => { fetchSales(); }, [salesYear, salesMonth, salesDistrict]);
    useEffect(() => { fetchAttendance(); }, [attMonth, attYear]);
    useEffect(() => { fetchPaymentTrend(); }, [paymentYear]);
    useEffect(() => { fetchMonthlyTrend(); }, [trendYear]);

    const downloadCSV = (headers: string[], rows: (string | number)[][], filename: string) => {
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        showToast('Downloaded!', 'success');
    };

    const maxTrend = useMemo(() => Math.max(...monthlyTrend.map(m => m.total_customers), 1), [monthlyTrend]);

    const SectionHeader = ({ title, icon, k }: { title: string; icon: React.ReactNode; k: string }) => (
        <button onClick={() => toggle(k)} className="w-full flex items-center justify-between p-4 bg-white rounded-t-xl border border-blue/12 hover:bg-blue-50/50 transition-colors">
            <div className="flex items-center gap-2.5">{icon}<h2 className="text-base font-semibold text-text m-0">{title}</h2></div>
            {sections[k] ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
        </button>
    );

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3"><RefreshCw size={28} className="animate-spin text-blue" /><p className="text-muted text-sm">Loading stats...</p></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 p-2 sm:p-4 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2"><BarChart3 size={24} className="text-blue" />Admin Dashboard</h1>
                    <p className="text-muted text-sm mt-0.5">Complete business overview & analytics</p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-dark transition-colors text-sm disabled:opacity-50">
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />Refresh
                </button>
            </div>

            {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <StatCard icon={<Users size={20} />} label="Total Customers" value={overview.total_customers} color="blue" />
                    <StatCard icon={<Zap size={20} />} label="Installations Done" value={overview.plant_installations_done} color="green" />
                    <StatCard icon={<Users size={20} />} label="Total Employees" value={overview.total_employees} color="purple" />
                    <StatCard icon={<Building2 size={20} />} label="Finance Cases" value={overview.finance_cases} color="amber" />
                    <StatCard icon={<IndianRupee size={20} />} label="Total Revenue" value={fmt(overview.total_revenue)} color="blue" />
                    <StatCard icon={<IndianRupee size={20} />} label="Collected" value={fmt(overview.collected_revenue)} color="green" />
                    <StatCard icon={<IndianRupee size={20} />} label="Pending" value={fmt(overview.pending_revenue)} color="red" />
                    <StatCard icon={<TrendingUp size={20} />} label="Collection %" value={`${overview.collection_percentage}%`} color="indigo" />
                    <StatCard icon={<ClipboardList size={20} />} label="Tasks Pending" value={overview.tasks_pending} color="amber" />
                    <StatCard icon={<Activity size={20} />} label="Tasks In Progress" value={overview.tasks_inprogress} color="blue" />
                    <StatCard icon={<ClipboardList size={20} />} label="Tasks Completed" value={overview.tasks_completed} color="green" />
                    <StatCard icon={<Clock size={20} />} label="Attendance Today" value={`${overview.attendance_today} / ${overview.total_employees}`} color="purple" />
                </div>
            )}

            {/* MONTHLY REGISTRATION TREND */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Monthly Registration Trend" icon={<TrendingUp size={18} className="text-blue" />} k="trend" />
                {sections.trend && (
                    <div className="bg-white p-4 border-t-0 border border-blue/12 rounded-b-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <select value={trendYear} onChange={e => setTrendYear(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end justify-center gap-1.5 sm:gap-3 h-64 px-1 bg-gray-50 rounded-lg p-4">
                            {monthlyTrend.map(m => {
                                const h = maxTrend > 0 ? (m.total_customers / maxTrend) * 100 : 0;
                                return (
                                    <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full">
                                        <span className="text-[10px] sm:text-xs text-muted font-medium h-4">{m.total_customers > 0 ? m.total_customers : ''}</span>
                                        <div className="w-full rounded-t-md bg-gradient-to-t from-blue to-blue/70 hover:from-blue-dark hover:to-blue transition-all cursor-pointer group relative" style={{ height: `${Math.max(h, 3)}%` }}>
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-text text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                                                <p className="font-semibold">{m.month_name}</p>
                                                <p>Total: {m.total_customers} | Done: {m.completed}</p>
                                                <p>Cash: {m.cash_cases} | Finance: {m.finance_cases}</p>
                                                <p>{fmt(m.total_value)} | {m.total_capacity_kw} kW</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] sm:text-xs text-muted mt-1 font-semibold">{m.month_name.slice(0, 3)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* PAYMENT COLLECTION TREND */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Payment Collection Trend" icon={<IndianRupee size={18} className="text-green-600" />} k="payment" />
                {sections.payment && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl">
                        <div className="p-4 border-b border-blue/8 flex items-center gap-3">
                            <select value={paymentYear} onChange={e => setPaymentYear(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-blue text-white">
                                    <th className="p-3 text-left font-semibold">Month</th>
                                    <th className="p-3 text-right font-semibold">Target</th>
                                    <th className="p-3 text-right font-semibold">Collected</th>
                                    <th className="p-3 text-right font-semibold">Pending</th>
                                    <th className="p-3 text-center font-semibold">Fully Paid</th>
                                    <th className="p-3 text-center font-semibold">Not Paid</th>
                                </tr></thead>
                                <tbody>
                                    {paymentTrend.filter(m => m.total_customers > 0).map((m, i) => (
                                        <tr key={m.month} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                            <td className="p-3 font-medium">{m.month_name}</td>
                                            <td className="p-3 text-right">{fmt(m.target_amount)}</td>
                                            <td className="p-3 text-right text-green-700 font-medium">{fmt(m.collected_amount)}</td>
                                            <td className="p-3 text-right text-red-600">{fmt(m.pending_amount)}</td>
                                            <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{m.fully_paid}</span></td>
                                            <td className="p-3 text-center"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{m.not_paid}</span></td>
                                        </tr>
                                    ))}
                                    {paymentTrend.filter(m => m.total_customers > 0).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No data</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* INSTALLATIONS BY DISTRICT */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Solar Installations by District" icon={<MapPin size={18} className="text-green-600" />} k="installations" />
                {sections.installations && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue text-white">
                                <th className="p-3 text-left font-semibold">District</th>
                                <th className="p-3 text-center font-semibold">Total</th>
                                <th className="p-3 text-center font-semibold">Completed</th>
                                <th className="p-3 text-center font-semibold">In Progress</th>
                                <th className="p-3 text-center font-semibold">Cancelled</th>
                                <th className="p-3 text-right font-semibold">Capacity (kW)</th>
                                <th className="p-3 text-right font-semibold">Business Value</th>
                            </tr></thead>
                            <tbody>
                                {districtInstallations.map((d, i) => (
                                    <tr key={d.district} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-3 font-medium">{d.district}</td>
                                        <td className="p-3 text-center font-bold">{d.total_customers}</td>
                                        <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{d.completed}</span></td>
                                        <td className="p-3 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{d.in_progress}</span></td>
                                        <td className="p-3 text-center"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{d.cancelled}</span></td>
                                        <td className="p-3 text-right">{Number(d.total_capacity_kw).toFixed(1)}</td>
                                        <td className="p-3 text-right font-medium">{fmt(d.total_business_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ATTENDANCE SUMMARY */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Attendance Summary" icon={<Clock size={18} className="text-purple-600" />} k="attendance" />
                {sections.attendance && attendanceSummary && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl">
                        <div className="p-4 border-b border-blue/8 flex flex-wrap items-center gap-3">
                            <select value={attMonth} onChange={e => setAttMonth(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                {MONTHS.filter(m => m.value !== '').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select value={attYear} onChange={e => setAttYear(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <span className="text-xs text-muted ml-auto">Days counted: {attendanceSummary.days_in_month}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-blue text-white">
                                    <th className="p-3 text-left font-semibold">Employee</th>
                                    <th className="p-3 text-left font-semibold">Role</th>
                                    <th className="p-3 text-left font-semibold">District</th>
                                    <th className="p-3 text-center font-semibold">Present</th>
                                    <th className="p-3 text-center font-semibold">Absent</th>
                                    <th className="p-3 text-center font-semibold">Late</th>
                                    <th className="p-3 text-center font-semibold">%</th>
                                </tr></thead>
                                <tbody>
                                    {attendanceSummary.employees.map((e: any, i: number) => (
                                        <tr key={e.employee_id} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                            <td className="p-3 font-medium">{e.employee_name}</td>
                                            <td className="p-3 text-xs text-muted">{e.employee_role}</td>
                                            <td className="p-3 text-xs">{e.district || 'N/A'}</td>
                                            <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{e.days_present}</span></td>
                                            <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.days_absent > 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{e.days_absent}</span></td>
                                            <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.late_days > 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{e.late_days}</span></td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${e.attendance_percentage >= 80 ? 'bg-green-500' : e.attendance_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${e.attendance_percentage}%` }} /></div>
                                                    <span className="text-xs text-muted">{e.attendance_percentage}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* PLANT SIZE DISTRIBUTION */}

            {/* EMPLOYEES BY DISTRICT */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Employees by District" icon={<Users size={18} className="text-purple-600" />} k="employees" />
                {sections.employees && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {employeesByDistrict.map(d => (
                                <div key={d.district} className="border border-blue/12 rounded-xl p-3.5 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <h3 className="font-semibold text-text text-sm flex items-center gap-1.5"><MapPin size={14} className="text-purple-500" />{d.district}</h3>
                                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">{d.total}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(d.roles).map(([role, count]: [string, any]) => (
                                            <span key={role} className="text-xs bg-gray-100 text-muted px-2 py-1 rounded-md">{role}: <strong className="text-text">{count}</strong></span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* TASK PIPELINE */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Task Pipeline (by Work Type)" icon={<ClipboardList size={18} className="text-indigo-600" />} k="tasks" />
                {sections.tasks && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue text-white">
                                <th className="p-3 text-left font-semibold">Work Type</th>
                                <th className="p-3 text-center font-semibold">Total</th>
                                <th className="p-3 text-center font-semibold">Pending</th>
                                <th className="p-3 text-center font-semibold">In Progress</th>
                                <th className="p-3 text-center font-semibold">Completed</th>
                                <th className="p-3 text-center font-semibold">Completion %</th>
                            </tr></thead>
                            <tbody>
                                {taskPipeline.map((t, i) => (
                                    <tr key={t.work_type} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-3 font-medium">{WORK_TYPE_LABELS[t.work_type] || t.work_type.replace(/_/g, ' ')}</td>
                                        <td className="p-3 text-center font-bold">{t.total}</td>
                                        <td className="p-3 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.pending}</span></td>
                                        <td className="p-3 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.inprogress}</span></td>
                                        <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{t.completed}</span></td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${t.total > 0 ? (t.completed / t.total) * 100 : 0}%` }} /></div>
                                                <span className="text-xs text-muted">{t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PLANT SIZE DISTRIBUTION */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Plant Size Distribution" icon={<Sun size={18} className="text-amber-500" />} k="plantSize" />
                {sections.plantSize && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue text-white">
                                <th className="p-3 text-left font-semibold">Size Range</th>
                                <th className="p-3 text-left font-semibold">Plant Type</th>
                                <th className="p-3 text-center font-semibold">Count</th>
                                <th className="p-3 text-right font-semibold">Total Value</th>
                            </tr></thead>
                            <tbody>
                                {plantSizes.map((p, i) => (
                                    <tr key={`${p.size_range}-${p.solar_plant_type}`} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-3 font-medium">{p.size_range}</td>
                                        <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.solar_plant_type === 'Residential' ? 'bg-blue-100 text-blue-700' : p.solar_plant_type === 'Commercial' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{p.solar_plant_type}</span></td>
                                        <td className="p-3 text-center font-bold">{p.count}</td>
                                        <td className="p-3 text-right">{fmt(p.total_value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SPECIAL REQUIREMENTS */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Special Requirements (COT / Name Correction / Load)" icon={<AlertTriangle size={18} className="text-red-500" />} k="special" />
                {sections.special && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue text-white">
                                <th className="p-3 text-left font-semibold">District</th>
                                <th className="p-3 text-center font-semibold">COT Cases</th>
                                <th className="p-3 text-center font-semibold">Name Correction</th>
                                <th className="p-3 text-center font-semibold">Load Enhancement</th>
                                <th className="p-3 text-center font-semibold">Total Customers</th>
                            </tr></thead>
                            <tbody>
                                {specialReqs.map((s, i) => (
                                    <tr key={s.district} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-3 font-medium">{s.district}</td>
                                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.cot_cases > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{s.cot_cases}</span></td>
                                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.name_correction_cases > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{s.name_correction_cases}</span></td>
                                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.load_enhancement_cases > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s.load_enhancement_cases}</span></td>
                                        <td className="p-3 text-center font-bold">{s.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* FINANCE CASES */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Finance Cases" icon={<Building2 size={18} className="text-amber-600" />} k="finance" />
                {sections.finance && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-blue text-white">
                                <th className="p-3 text-left font-semibold">District</th>
                                <th className="p-3 text-center font-semibold">Mode</th>
                                <th className="p-3 text-center font-semibold">Special Finance</th>
                                <th className="p-3 text-center font-semibold">Cases</th>
                                <th className="p-3 text-right font-semibold">Value</th>
                                <th className="p-3 text-right font-semibold">Capacity</th>
                            </tr></thead>
                            <tbody>
                                {financeCases.map((fc, i) => (
                                    <tr key={`${fc.district}-${i}`} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-3 font-medium">{fc.district}</td>
                                        <td className="p-3 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">{fc.payment_mode}</span></td>
                                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fc.special_finance_required === 'Yes' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{fc.special_finance_required}</span></td>
                                        <td className="p-3 text-center font-bold">{fc.count}</td>
                                        <td className="p-3 text-right">{fmt(fc.total_value)}</td>
                                        <td className="p-3 text-right">{Number(fc.total_capacity_kw).toFixed(1)} kW</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SALES EXECUTIVE PERFORMANCE */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Sales Executive Performance" icon={<TrendingUp size={18} className="text-indigo-600" />} k="sales" />
                {sections.sales && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl">
                        <div className="p-4 border-b border-blue/8 flex flex-wrap items-center gap-3">
                            <select value={salesYear} onChange={e => setSalesYear(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                <option value="">All Years</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={salesMonth} onChange={e => setSalesMonth(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select value={salesDistrict} onChange={e => setSalesDistrict(e.target.value)} className="border border-blue/20 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue/30">
                                <option value="all">All Districts</option>
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <button onClick={() => downloadCSV(
                                ['Name', 'Phone', 'District', 'Customers', 'Completed', 'Finance', 'Business Value', 'Capacity kW'],
                                salesStats.map(s => [s.employee_name, s.phone_number, s.employee_district || 'N/A', s.total_customers, s.completed_customers, s.finance_customers, s.total_business_value, s.total_capacity_kw]),
                                `sales-stats-${salesYear || 'all'}.csv`
                            )} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm ml-auto"><Download size={14} />Download Excel</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-blue text-white">
                                    <th className="p-3 text-left font-semibold">#</th>
                                    <th className="p-3 text-left font-semibold">Name</th>
                                    <th className="p-3 text-left font-semibold">Phone</th>
                                    <th className="p-3 text-left font-semibold">District</th>
                                    <th className="p-3 text-center font-semibold">Customers</th>
                                    <th className="p-3 text-center font-semibold">Completed</th>
                                    <th className="p-3 text-center font-semibold">Finance</th>
                                    <th className="p-3 text-right font-semibold">Business Value</th>
                                    <th className="p-3 text-right font-semibold">Capacity</th>
                                </tr></thead>
                                <tbody>
                                    {salesStats.map((s, i) => (
                                        <tr key={s.employee_id} className={`border-b border-blue/8 hover:bg-blue-50 ${i % 2 ? 'bg-gray-50/50' : ''}`}>
                                            <td className="p-3 text-muted">{i + 1}</td>
                                            <td className="p-3 font-medium">{s.employee_name}</td>
                                            <td className="p-3 text-muted">{s.phone_number}</td>
                                            <td className="p-3">{s.employee_district || 'N/A'}</td>
                                            <td className="p-3 text-center"><span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{s.total_customers}</span></td>
                                            <td className="p-3 text-center"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">{s.completed_customers}</span></td>
                                            <td className="p-3 text-center"><span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{s.finance_customers}</span></td>
                                            <td className="p-3 text-right font-medium">{fmt(s.total_business_value)}</td>
                                            <td className="p-3 text-right">{Number(s.total_capacity_kw).toFixed(1)} kW</td>
                                        </tr>
                                    ))}
                                    {salesStats.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted">No data for selected filters</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* RECENT ACTIVITY */}
            <div className="rounded-xl border border-blue/12 overflow-hidden">
                <SectionHeader title="Recent Activity" icon={<Activity size={18} className="text-blue" />} k="recent" />
                {sections.recent && recentActivity && (
                    <div className="bg-white border-t-0 border border-blue/12 rounded-b-xl p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div>
                                <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5"><Users size={14} className="text-blue" />Latest Registrations</h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_customers.map((c: any) => (
                                        <div key={c.id} className="border border-blue/8 rounded-lg p-2.5 text-xs">
                                            <p className="font-medium text-text">{c.applicant_name}</p>
                                            <p className="text-muted">{c.district} · {c.plant_size_kw} kW · {c.payment_mode}</p>
                                            <div className="flex justify-between mt-1">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.application_status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.application_status}</span>
                                                <span className="text-muted text-[10px]">by {c.created_by_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5"><ClipboardList size={14} className="text-amber-600" />Active Tasks</h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_tasks.map((t: any) => (
                                        <div key={t.id} className="border border-blue/8 rounded-lg p-2.5 text-xs">
                                            <p className="font-medium text-text">{WORK_TYPE_LABELS[t.work_type] || t.work_type.replace(/_/g, ' ')}</p>
                                            <p className="text-muted">{t.assigned_to_name} · {t.assigned_to_role}</p>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-1.5"><IndianRupee size={14} className="text-green-600" />Recent Payments</h4>
                                <div className="space-y-2">
                                    {recentActivity.recent_payments.map((p: any) => (
                                        <div key={p.id} className="border border-blue/8 rounded-lg p-2.5 text-xs">
                                            <p className="font-medium text-text">{p.applicant_name}</p>
                                            <p className="text-muted">{p.district}</p>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-green-700 font-medium">Paid: {fmt(p.paid_amount)}</span>
                                                <span className="text-red-600">Left: {fmt(p.remaining)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600' },
};
const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => {
    const c = colorMap[color] || colorMap.blue;
    return (
        <div className={`${c.bg} rounded-xl p-3.5 sm:p-4 border border-blue/8`}>
            <div className="flex items-center gap-2 mb-1.5">
                <span className={c.icon}>{icon}</span>
                <span className="text-xs text-muted font-medium truncate">{label}</span>
            </div>
            <p className={`text-lg sm:text-xl font-bold ${c.text} m-0`}>{value}</p>
        </div>
    );
};

export default AdminStats;
