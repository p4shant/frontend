import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Task {
    id: number;
    work: string;
    work_type: string;
    status: string;
    assigned_to_id: number;
    assigned_to_name: string;
    assigned_to_role: string;
    registered_customer_id: number;
    created_at: string;
    updated_at: string;
    registered_customer_data?: {
        id: number;
        applicant_name: string;
        mobile_number: string;
        district: string;
    };
}

const API_BASE = import.meta.env.VITE_API_BASE;

export const TaskApproval: React.FC = () => {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchTasks = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/tasks/reassignment-approvals`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }

            const data = await response.json();
            setTasks(data.data || data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            showToast('Failed to load approval tasks', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [token]);

    const handleAction = async (taskId: number, action: 'approve' | 'reject') => {
        if (!token) return;

        setActionLoading(taskId);
        try {
            const response = await fetch(`${API_BASE}/tasks/${taskId}/reassignment-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to process action');
            }

            showToast(
                action === 'approve'
                    ? 'Task reassignment approved successfully'
                    : 'Task reassignment rejected',
                'success'
            );

            // Refresh the list
            fetchTasks();
        } catch (error) {
            console.error('Error processing action:', error);
            showToast(
                error instanceof Error ? error.message : 'Failed to process action',
                'error'
            );
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTargetAssignee = (work: string) => {
        if (!work) return 'N/A';

        // Expected pattern: "... TASK-XXX to Name (Phone)"
        const match = work.match(/\bto\s+([^()]+)\s*\((\d{10})\)\s*$/i);
        if (!match) return 'N/A';

        const name = match[1].trim();
        const phone = match[2].trim();
        return `${name} (${phone})`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader className="animate-spin h-10 w-10 text-blue" />
                    <p className="text-text-dim text-sm">Loading approval tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text">Task Approval</h1>
                    <p className="text-sm text-muted mt-1">Review and approve task reassignment requests</p>
                </div>
                <div className="bg-blue/10 px-4 py-2 rounded-lg border border-blue/20">
                    <p className="text-xs text-muted uppercase font-semibold">Pending Approvals</p>
                    <p className="text-2xl font-bold text-blue">{tasks.length}</p>
                </div>
            </div>

            {/* Tasks Table */}
            {tasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-blue/12 p-12 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted mb-4" />
                    <h3 className="text-lg font-semibold text-text mb-2">No Pending Approvals</h3>
                    <p className="text-sm text-muted">All task reassignment requests have been processed</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-blue/12 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-blue/5 border-b border-blue/12">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Task Details
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Assigned To
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Reassign To
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-text uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-text uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue/8">
                                {tasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-blue/3 transition-colors">
                                        <td className="px-4 py-4">
                                            <p className="text-sm font-medium text-text line-clamp-2">
                                                {task.work}
                                            </p>
                                            <p className="text-xs text-muted mt-1">
                                                Type: {task.work_type.replace(/_/g, ' ')}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm font-medium text-text">
                                                {task.registered_customer_data?.applicant_name || 'N/A'}
                                            </p>
                                            <p className="text-xs text-muted">
                                                {task.registered_customer_data?.mobile_number || 'N/A'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm font-medium text-text">
                                                {task.assigned_to_name}
                                            </p>
                                            <p className="text-xs text-muted">{task.assigned_to_role}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-sm font-medium text-text">
                                                {getTargetAssignee(task.work)}
                                            </p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${task.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : task.status === 'in-progress'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}
                                            >
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <p className="text-xs text-muted">{formatDate(task.created_at)}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleAction(task.id, 'approve')}
                                                    disabled={actionLoading === task.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Approve"
                                                >
                                                    {actionLoading === task.id ? (
                                                        <Loader className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(task.id, 'reject')}
                                                    disabled={actionLoading === task.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Reject"
                                                >
                                                    {actionLoading === task.id ? (
                                                        <Loader className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    Reject
                                                </button>
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
    );
};

export default TaskApproval;
