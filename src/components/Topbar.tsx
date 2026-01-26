import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Props {
    onMenuClick: () => void;
    onCollapseClick: () => void;
    isCollapsed: boolean;
}

function Topbar({ onMenuClick, onCollapseClick, isCollapsed }: Props) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-[900] flex items-center justify-between gap-2 md:gap-3 px-3 md:px-6 py-3 backdrop-blur-xl bg-white/90 border-b border-blue/12 shadow-sm shadow-blue/6">
            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                <button
                    className="md:hidden bg-panel border border-blue/12 text-text p-2 px-2.5 rounded-xl cursor-pointer flex-shrink-0"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 md:gap-2.5 leading-none flex-wrap">
                        <span className="text-sm md:text-2xl font-black tracking-wide bg-gradient-to-r from-blue-dark to-blue bg-clip-text text-transparent whitespace-nowrap">
                            TATA POWER
                        </span>
                        <span className="text-sm md:text-[22px] font-extrabold tracking-wide text-brand-strong flex items-center gap-0.5 md:gap-1 whitespace-nowrap">
                            SOLAR<span className="text-brand text-xs md:text-base">☀</span>ROOF
                        </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs leading-none">
                        <span className="font-bold text-text tracking-wide">KAMN ENTERPRISES</span>
                        <span className="text-muted font-medium border-l border-blue/12 pl-2">
                            India's No.1 Authorised Channel Partner
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                {user && (
                    <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-lg bg-blue/5 border border-blue/12">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-text">{user.name}</p>
                            <p className="text-xs text-text-dim">{user.employee_role}</p>
                        </div>
                    </div>
                )}
                <button
                    className="hidden md:inline-flex bg-gradient-to-br from-brand/15 to-blue/8 border border-blue/25 text-blue-dark px-4 py-2 rounded-xl cursor-pointer font-medium text-sm transition-all duration-200 hover:shadow-md hover:shadow-blue/10"
                    onClick={onCollapseClick}
                >
                    {isCollapsed ? 'Expand' : 'Collapse'} menu
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 rounded-lg bg-red/10 border border-red/20 text-red hover:bg-red/20 transition-colors flex-shrink-0"
                    title="Logout"
                >
                    <LogOut size={18} />
                    <span className="hidden md:inline text-sm font-medium">Logout</span>
                </button>
            </div>
        </header>
    );
}

export default Topbar;
