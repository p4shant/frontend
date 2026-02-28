import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Archive } from 'lucide-react';
import { notificationsAPI } from '../services/api';

interface Notification {
    id: number;
    employee_id: number;
    notification_type: string;
    title: string;
    message?: string;
    is_read: number;
    is_archived: number;
    priority: string;
    created_at: string;
    related_entity_type?: string;
    related_entity_id?: number;
}

interface NotificationIconProps {
    token: string;
    employeeId: string | number;
}

export default function NotificationIcon({ token, employeeId }: NotificationIconProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Convert employeeId to string for API calls
    const employeeIdStr = String(employeeId);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsAPI.listNotifications(token, {
                is_archived: false,
                limit: 10,
            });
            setNotifications(response.data || []);

            // Calculate unread count
            const unreadCount = response.data?.filter((n: Notification) => !n.is_read).length || 0;
            setUnreadCount(unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unread count
    const fetchUnreadCount = async () => {
        try {
            const response = await notificationsAPI.getUnreadCount(employeeIdStr, token);
            setUnreadCount(response.unread_count || 0);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 3600000); // Poll every 1 hour (3600000ms)
        return () => clearInterval(interval);
    }, [employeeIdStr, token]);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await notificationsAPI.markAsRead(String(notificationId), token);
            setNotifications(
                notifications.map((n) =>
                    n.id === notificationId ? { ...n, is_read: 1 } : n
                )
            );
            fetchUnreadCount();
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleArchive = async (notificationId: number) => {
        try {
            await notificationsAPI.markAsArchived(String(notificationId), token);
            setNotifications(notifications.filter((n) => n.id !== notificationId));
            fetchUnreadCount();
        } catch (error) {
            console.error('Failed to archive notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        const iconClass = 'w-4 h-4';
        switch (type) {
            case 'ATTENDANCE_MARKED':
            case 'ATTENDANCE_DUE':
                return <Clock className={iconClass} />;
            case 'TASK_ASSIGNED':
            case 'TASK_COMPLETED':
            case 'TASK_OVERDUE':
            case 'TASK_DUE_SOON':
                return <CheckSquare className={iconClass} />;
            case 'DOCUMENT_UPLOADED':
            case 'DOCUMENT_APPROVED':
            case 'DOCUMENT_REJECTED':
                return <FileText className={iconClass} />;
            case 'PLANT_INSTALLATION_UPDATE':
                return <Zap className={iconClass} />;
            case 'PAYMENT_RECEIVED':
                return <CreditCard className={iconClass} />;
            default:
                return <Info className={iconClass} />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-50 border-red-200';
            case 'high':
                return 'bg-orange-50 border-orange-200';
            case 'normal':
                return 'bg-blue-50 border-blue-200';
            case 'low':
                return 'bg-gray-50 border-gray-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const getNotificationTypeLabel = (type: string) => {
        return type.replace(/_/g, ' ');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                title="Notifications"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notifications Dropdown */}
            {isOpen && (
                <div className="fixed md:absolute bottom-0 md:bottom-auto left-4 md:left-auto right-4 md:right-0 top-auto md:top-full md:mt-2 bg-white rounded-lg shadow-2xl z-50 border border-gray-200 max-h-[80vh] md:max-h-96 w-auto md:w-96 flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-lg flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-blue-800 p-1 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-8 px-6 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm font-medium">No new notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`border-b border-gray-100 p-4 hover:bg-gray-50 transition ${getPriorityColor(notification.priority)
                                        } ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Icon */}
                                        <div className="mt-1 flex-shrink-0">
                                            {getNotificationIcon(notification.notification_type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {getNotificationTypeLabel(notification.notification_type)}
                                                    </p>
                                                </div>
                                                {notification.priority === 'critical' && (
                                                    <span className="flex-shrink-0 px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded">
                                                        Critical
                                                    </span>
                                                )}
                                                {notification.priority === 'high' && (
                                                    <span className="flex-shrink-0 px-2 py-1 text-xs font-semibold text-orange-600 bg-orange-100 rounded">
                                                        High
                                                    </span>
                                                )}
                                            </div>

                                            {notification.message && (
                                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}

                                            <p className="text-xs text-gray-500 mt-2">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded transition"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3 h-3" />
                                                Mark Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleArchive(notification.id)}
                                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition ml-auto"
                                            title="Archive"
                                        >
                                            <Archive className="w-3 h-3" />
                                            Archive
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 rounded-b-lg flex-shrink-0">
                            <a
                                href="/notifications"
                                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                View all notifications →
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Import icons from lucide-react
import { Clock, CheckSquare, FileText, Zap, CreditCard, Info } from 'lucide-react';
