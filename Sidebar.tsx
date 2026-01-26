import { NavLink } from 'react-router-dom';
import { CalendarCheck, LayoutDashboard, PanelsTopLeft, Plus, UserRound } from 'lucide-react';
import kamnLogo from '../assets/kaman-logo.png';

const NAV_ITEMS = [
    { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={18} /> },
    { label: 'Register Customer', to: '/register-customer', icon: <PanelsTopLeft size={18} /> },
    { label: 'Mark Attendance', to: '/mark-attendance', icon: <CalendarCheck size={18} /> },
    { label: 'Profile', to: '/profile', icon: <UserRound size={18} /> },
];

interface SidebarState {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapse: () => void;
    toggleMobile: () => void;
    closeMobile: () => void;
}

interface Props {
    state: SidebarState;
    onQuickRegister: () => void;
}

function Sidebar({ state, onQuickRegister }: Props) {
    const { isCollapsed, isMobileOpen, toggleMobile, closeMobile } = state;

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

                <nav className="flex flex-col gap-1.5 px-2.5 py-2 pb-4">
                    {NAV_ITEMS.map((item) => (
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

                    <button
                        type="button"
                        onClick={onQuickRegister}
                        className={`
                            mt-2 flex items-center gap-3 rounded-xl border border-blue/14 bg-blue/8
                            text-blue-dark font-semibold px-3 py-3 shadow-sm transition-all duration-150
                            hover:bg-blue/12 hover:border-blue/22 cursor-pointer
                            ${isCollapsed ? 'justify-center' : ''}
                        `}
                        title={isCollapsed ? 'Register Customer' : undefined}
                    >
                        <span className="flex items-center justify-center"><Plus size={18} /></span>
                        {!isCollapsed && <span>Register Customer</span>}
                    </button>
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

                <nav className="flex flex-col gap-1.5 px-2.5 py-2 pb-4">
                    {NAV_ITEMS.map((item) => (
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

                    <button
                        type="button"
                        onClick={() => { onQuickRegister(); closeMobile(); }}
                        className="mt-2 flex items-center gap-3 rounded-xl border border-blue/14 bg-blue/8
                            text-blue-dark font-semibold px-3 py-3 shadow-sm transition-all duration-150
                            hover:bg-blue/12 hover:border-blue/22 cursor-pointer"
                    >
                        <span className="flex items-center justify-center"><Plus size={18} /></span>
                        <span>Register Customer</span>
                    </button>
                </nav>
            </aside>
        </>
    );
}

export default Sidebar;
