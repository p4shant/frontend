import type { PropsWithChildren } from 'react';
import { useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

function AppLayout({ children }: PropsWithChildren) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleCollapse = () => setIsCollapsed((prev) => !prev);
    const toggleMobile = () => setIsMobileOpen((prev) => !prev);
    const closeMobile = () => setIsMobileOpen(false);

    const sidebarState = useMemo(
        () => ({ isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeMobile }),
        [isCollapsed, isMobileOpen],
    );

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-bg via-bg-alt to-bg">
            {/* Sidebar */}
            <Sidebar state={sidebarState} />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 w-full">
                {/* Topbar */}
                <Topbar
                    onMenuClick={toggleMobile}
                    onCollapseClick={toggleCollapse}
                    isCollapsed={isCollapsed}
                />

                {/* Page Content */}
                <main
                    className="flex-1 px-0 overflow-hidden"
                    onClick={closeMobile}
                >
                    {children}
                </main>
            </div>

            {/* Desktop Collapse Button */}
            <button
                className={`
                    hidden md:inline-flex fixed bottom-3.5 z-[1100]
                    bg-panel border border-blue/12 text-text p-2.5 rounded-full
                    shadow-lg shadow-blue/8 cursor-pointer
                    transition-all duration-200
                    hover:bg-panel-strong hover:-translate-y-0.5
                    text-xl font-bold w-10 h-10 items-center justify-center
                `}
                style={{
                    left: isCollapsed ? '58px' : '220px',
                }}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={toggleCollapse}
            >
                {isCollapsed ? '›' : '‹'}
            </button>
        </div>
    );
}

export default AppLayout;
