import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import type { Toast as ToastType } from '../context/ToastContext';

const Toast: React.FC<{ toast: ToastType }> = ({ toast }) => {
    const { hideToast } = useToast();

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                hideToast(toast.id);
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.duration, hideToast]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
        error: <XCircle className="w-5 h-5 flex-shrink-0" />,
        warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
        info: <Info className="w-5 h-5 flex-shrink-0" />,
    };

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    const iconColors = {
        success: 'text-green-600',
        error: 'text-red-600',
        warning: 'text-yellow-600',
        info: 'text-blue-600',
    };

    return (
        <div
            className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg animate-slide-in-right ${styles[toast.type]}`}
            style={{
                minWidth: '320px',
                maxWidth: '500px',
                animation: 'slideInRight 0.3s ease-out',
            }}
        >
            <div className={iconColors[toast.type]}>{icons[toast.type]}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold break-words leading-relaxed">{toast.message}</p>
            </div>
            <button
                onClick={() => hideToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
                aria-label="Close toast"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <style>
                {`
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    .animate-slide-in-right {
                        animation: slideInRight 0.3s ease-out;
                    }
                `}
            </style>
            <div className="pointer-events-auto flex flex-col gap-3">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} />
                ))}
            </div>
        </div>
    );
};
