import { NavLink } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, PanelsTopLeft, UserRound, Eye, FileText, UserPlus, Wallet, BarChart3, CheckSquare, ClipboardPlus, Package, ArrowDownToLine, ArrowUpFromLine, History, Users, Gauge, Car, ShieldCheck, Shield } from 'lucide-react';
import kamnLogo from '../assets/kaman-logo.png';
import { useAuth } from '../context/AuthContext';

// Supervisor names who can mark team attendance
const SUPERVISOR_NAMES = ['Upendra Nath', 'Aashish Singh', 'Sanjay Singh Yadav', 'SN Singh'];

const NAV_ITEMS = [
    { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
    { label: 'Register Customer', to: '/register-customer', icon: <PanelsTopLeft size={18} /> },
    { label: 'Mark Attendance', to: '/mark-attendance', icon: <CalendarCheck size={18} /> },
];

const MASTER_ADMIN_ITEMS = [
    { label: 'Register Employee', to: '/register-employee', icon: <UserPlus size={18} /> },
    { label: 'Monitor Attendance', to: '/monitor-attendance', icon: <Eye size={18} /> },
    { label: 'Track Application', to: '/track-application', icon: <FileText size={18} /> },
    { label: 'Track Payment', to: '/track-payment', icon: <Wallet size={18} /> },
    { label: 'Task Approval', to: '/task-approval', icon: <CheckSquare size={18} /> },
    { label: 'Create Task', to: '/create-task', icon: <ClipboardPlus size={18} /> },
    { label: 'Admin Dashboard', to: '/admin-stats', icon: <BarChart3 size={18} /> },
];

const STOCK_ITEMS = [
    { label: 'Stock Dashboard', to: '/stock-dashboard', icon: <Package size={18} /> },
    { label: 'Stock Inward', to: '/stock-inward', icon: <ArrowDownToLine size={18} /> },
    { label: 'Stock Outward', to: '/stock-outward', icon: <ArrowUpFromLine size={18} /> },
    { label: 'Stock History', to: '/stock-history', icon: <History size={18} /> },
];

const STOCK_CORRECTION_ITEM = { label: 'Stock Correction', to: '/stock-correction', icon: <ShieldCheck size={18} /> };

const MONITOR_ATTENDANCE_ITEM = { label: 'Monitor Attendance', to: '/monitor-attendance', icon: <Eye size={18} /> };

const TEAM_ATTENDANCE_ITEM = { label: 'Team Attendance', to: '/mark-team-attendance', icon: <Users size={18} /> };

const COMMON_ITEMS = [
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
];

const QA_TESTER_ITEMS = [
    { label: 'Travel Log', to: '/qa-travel-punch', icon: <Gauge size={18} /> },
];

const TRAVEL_REVIEW_ITEM = { label: 'Travel Allowance', to: '/travel-allowance', icon: <Car size={18} /> };

const ADMIN_ATTENDANCE_ITEM = { label: 'Admin Attendance', to: '/admin-mark-attendance', icon: <Shield size={18} /> };

interface SidebarState {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapse: () => void;
    toggleMobile: () => void;
    closeMobile: () => void;
}

interface Props {
    state: SidebarState;
}

function Sidebar({ state }: Props) {
    const { isCollapsed, isMobileOpen, toggleMobile, closeMobile } = state;
    const { user } = useAuth();
    const isMasterAdmin = user?.employee_role === 'Master Admin';
    const isAccountant = user?.employee_role === 'Accountant';
    const isStockController = user?.employee_role === 'Stock Controller';
    const isInventoryOperator = user?.employee_role === 'Inventory Operator';
    const isQATester = user?.employee_role === 'QA Tester';
    const isSFDCAdmin = user?.employee_role === 'SFDC Admin';
    const isAdminAssistant = user?.employee_role === 'Admin Assistant';
    const isSupervisor = user?.name && SUPERVISOR_NAMES.includes(user.name);
    // Any employee with stock_access=1 flag gets stock pages regardless of role
    const hasStockAccess = !!(user?.stock_access === 1);

    // Build nav items based on user role
    // Stock Controller sees ONLY stock pages + profile (no attendance)
    // Inventory Operator sees stock pages + mark attendance + profile
    // QA Tester sees core pages + Travel Log (NOT Mark Attendance — handled via travel punch)
    // Admin Assistant sees Dashboard + Admin Attendance + Mark Attendance + Profile
    const visibleNavItems = isAdminAssistant
        ? [
            { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
            ADMIN_ATTENDANCE_ITEM,
            { label: 'Mark Attendance', to: '/mark-attendance', icon: <CalendarCheck size={18} /> },
            MONITOR_ATTENDANCE_ITEM,
            ...COMMON_ITEMS,
        ]
        : isStockController
            ? [
                ...STOCK_ITEMS,
                ...COMMON_ITEMS,
            ]
            : isInventoryOperator
                ? [
                    ...STOCK_ITEMS,
                    { label: 'Mark Attendance', to: '/mark-attendance', icon: <CalendarCheck size={18} /> },
                    ...(isSupervisor ? [TEAM_ATTENDANCE_ITEM] : []),
                    ...COMMON_ITEMS,
                ]
                : isQATester
                    ? [
                        { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
                        { label: 'Register Customer', to: '/register-customer', icon: <PanelsTopLeft size={18} /> },
                        ...QA_TESTER_ITEMS,
                        ...COMMON_ITEMS,
                    ]
                    : [
                        ...NAV_ITEMS,
                        ...(isMasterAdmin ? [...MASTER_ADMIN_ITEMS, ADMIN_ATTENDANCE_ITEM, TRAVEL_REVIEW_ITEM] : []),
                        ...(isSFDCAdmin ? [TRAVEL_REVIEW_ITEM] : []),
                        ...(isMasterAdmin || isAccountant || hasStockAccess ? STOCK_ITEMS : []),
                        ...(isMasterAdmin ? [STOCK_CORRECTION_ITEM] : []),
                        ...(!isMasterAdmin && isAccountant ? [MONITOR_ATTENDANCE_ITEM] : []),
                        ...(isSupervisor ? [TEAM_ATTENDANCE_ITEM] : []),
                        ...COMMON_ITEMS,
                    ];

    return (
        <>
            <div
                className={`${isMobileOpen ? 'block' : 'hidden'} fixed inset-0 bg-text/40 backdrop-blur-sm z-[999] md:hidden`}
                onClick={closeMobile}
                aria-hidden="true"
            />
            <aside
                className={`
                    h-screen bg-white border-r border-blue/12
                    transition-all duration-200 shadow-lg z-[1000] flex flex-col
                    sticky top-0 hidden md:flex
                `}
                style={{
                    width: isCollapsed ? '78px' : '240px',
                }}
                aria-label="Main navigation"
            >
                <div className="flex items-center justify-between gap-2 p-4">
                    <div className="flex items-center gap-2.5">
                        {isCollapsed ? (
                            <img src={kamnLogo} alt="KAMN Enterprises" className="w-[46px] h-[46px] object-contain" />
                        ) : (
                            <>
                                <img src={kamnLogo} alt="KAMN Enterprises" className="w-[50px] h-[50px] object-contain flex-shrink-0" />
                                <div>
                                    <p className="m-0 font-bold tracking-tight">KAMN ENTERPRISES</p>
                                    <p className="m-0 text-xs text-muted">Tata Solar Partner</p>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        className="md:hidden inline-flex bg-transparent border border-blue/12 text-text rounded-[10px] px-2.5 py-1.5 cursor-pointer"
                        onClick={toggleMobile}
                        aria-label="Close sidebar"
                    >
                        ✕
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5 px-2.5 py-2 pb-4">
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center gap-3 text-text no-underline py-3 px-3 rounded-xl
                                border border-transparent relative transition-all duration-200
                                hover:bg-blue/6 hover:border-blue/12
                                ${isActive ? 'bg-gradient-to-br from-brand/12 to-blue/8 border-blue/30 text-blue-dark font-semibold' : ''}
                                ${isCollapsed ? 'justify-center group' : ''}
                            `}
                            title={isCollapsed ? item.label : undefined}
                            onClick={closeMobile}
                        >
                            <span className="flex items-center justify-center">{item.icon}</span>
                            {!isCollapsed && <span>{item.label}</span>}
                            {isCollapsed && (
                                <span className="
                                    absolute left-full ml-2 bg-text text-white px-3 py-2 rounded-[10px]
                                    text-xs whitespace-nowrap opacity-0 -translate-y-1/2 top-1/2
                                    pointer-events-none transition-opacity duration-200 shadow-lg
                                    group-hover:opacity-100 hidden md:block
                                ">
                                    {item.label}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>
            {/* Mobile Sidebar Overlay */}
            <aside
                className={`
                    md:hidden fixed left-0 top-0 h-screen w-60 bg-white border-r border-blue/12
                    shadow-2xl z-[1001] flex flex-col
                    transition-transform duration-200
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
                aria-label="Main navigation mobile"
            >
                <div className="flex items-center justify-between gap-2 p-4">
                    <div className="flex items-center gap-2.5">
                        <img src={kamnLogo} alt="KAMN Enterprises" className="w-[50px] h-[50px] object-contain flex-shrink-0" />
                        <div>
                            <p className="m-0 font-bold tracking-tight">KAMN ENTERPRISES</p>
                            <p className="m-0 text-xs text-muted">Tata Solar Partner</p>
                        </div>
                    </div>
                    <button
                        className="inline-flex bg-transparent border border-blue/12 text-text rounded-[10px] px-2.5 py-1.5 cursor-pointer"
                        onClick={toggleMobile}
                        aria-label="Close sidebar"
                    >
                        ✕
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5 px-2.5 py-2 pb-4">
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                                flex items-center gap-3 text-text no-underline py-3 px-3 rounded-xl
                                border border-transparent relative transition-all duration-200
                                hover:bg-blue/6 hover:border-blue/12
                                ${isActive ? 'bg-gradient-to-br from-brand/12 to-blue/8 border-blue/30 text-blue-dark font-semibold' : ''}
                            `}
                            title={item.label}
                            onClick={closeMobile}
                        >
                            <span className="flex items-center justify-center">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}

export default Sidebar;
