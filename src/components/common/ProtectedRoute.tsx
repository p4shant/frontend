import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({
    children,
    requiredRoles,
    allowWithStockAccess,
}: {
    children: React.ReactNode;
    requiredRoles?: string[];
    allowWithStockAccess?: boolean;
}) => {
    const { isAuthenticated, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
                    <p className="text-text-dim">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRoles && user) {
        const hasRole = requiredRoles.includes(user.employee_role);
        const hasStockFlag = allowWithStockAccess && user.stock_access === 1;
        if (!hasRole && !hasStockFlag) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
