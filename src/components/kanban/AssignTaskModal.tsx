import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { tasksAPI } from '../../services/api';

interface Employee {
    name: string;
    phone_number: string;
    employee_role: string;
}

interface AssignTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
    taskWork: string;
    work_type?: string;
    registeredCustomerId?: number;
    onSuccess?: () => void;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
    isOpen,
    onClose,
    taskId,
    taskWork,
    registeredCustomerId,
    work_type,
    onSuccess,
}) => {
    const { user, token } = useAuth();
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [uniqueRoles, setUniqueRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Debug: Log when modal opens with registeredCustomerId
    useEffect(() => {
        if (isOpen) {
            console.log('AssignTaskModal opened with registeredCustomerId:', registeredCustomerId);
        }
    }, [isOpen, registeredCustomerId]);
    // Load employees from localStorage on mount
    useEffect(() => {
        if (isOpen) {
            try {
                const storedEmployees = localStorage.getItem('employees_list');
                if (storedEmployees) {
                    const parsedEmployees = JSON.parse(storedEmployees) as Employee[];
                    setEmployees(parsedEmployees);

                    // Extract unique roles
                    const roles = Array.from(new Set(parsedEmployees.map(emp => emp.employee_role)));
                    setUniqueRoles(roles.sort());

                    // Reset selections
                    setSelectedRole('');
                    setSelectedEmployee('');
                    setError('');
                }
            } catch (err) {
                setError('Failed to load employees list');
                console.error('Error loading employees:', err);
            }
        }
    }, [isOpen]);

    // Get employees filtered by selected role
    const filteredEmployees = useMemo(() => {
        if (!selectedRole) return [];
        return employees.filter(emp => emp.employee_role === selectedRole);
    }, [selectedRole, employees]);

    // Reset employee selection when role changes
    useEffect(() => {
        setSelectedEmployee('');
    }, [selectedRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedRole || !selectedEmployee) {
            setError('Please select both role and employee');
            return;
        }

        if (!user || !token) {
            setError('User not authenticated');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const selectedEmp = employees.find(emp => emp.phone_number === selectedEmployee);
            if (!selectedEmp) {
                setError('Selected employee not found');
                return;
            }

            // Create task data
            const finalCustomerId = registeredCustomerId && registeredCustomerId > 0 ? registeredCustomerId : 0;
            console.log('Creating reassign task with taskWork:', taskWork);

            const requesterName = user.name || 'Unknown';
            const requesterPhone = user.phone_number || 'N/A';
            const targetName = selectedEmp.name || 'Unknown';
            const targetPhone = selectedEmp.phone_number || 'N/A';
            const workDescription = `${requesterName} (${requesterPhone}) requested to reassign the ${taskWork} ${taskId} to ${targetName} (${targetPhone})`;

            const taskData = {
                work: workDescription,
                work_type: `reassign_task_approval_${work_type}`,
                status: 'pending',
                assigned_to_id: user.id,
                assigned_to_name: user.name,
                assigned_to_role: user.employee_role,
                registered_customer_id: finalCustomerId,
            };

            // Call API to create the reassignment task
            const response = await tasksAPI.createReassignTask(taskData, token);

            if (response.success || response.id) {
                onClose();
                onSuccess?.();
            } else {
                setError(response.message || 'Failed to assign task');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An error occurred';
            setError(message);
            console.error('Error assigning task:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-blue/20 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue to-blue-800 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Assign Task</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                            disabled={loading}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Task Info Display */}
                        <div className="bg-blue-50 rounded-lg p-3 border border-blue/20">
                            <p className="text-xs font-medium text-blue-700 uppercase">Task ID</p>
                            <p className="text-sm font-semibold text-text mt-1">{taskId}</p>
                        </div>

                        {/* Role Dropdown */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-semibold text-text mb-2">
                                Select Role
                            </label>
                            <select
                                id="role"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                disabled={loading || uniqueRoles.length === 0}
                                className="w-full px-4 py-2.5 border border-blue/20 rounded-lg bg-white text-text focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="">-- Select a role --</option>
                                {uniqueRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Employee Name Dropdown */}
                        <div>
                            <label htmlFor="employee" className="block text-sm font-semibold text-text mb-2">
                                Select Employee
                            </label>
                            <select
                                id="employee"
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                disabled={loading || filteredEmployees.length === 0}
                                className="w-full px-4 py-2.5 border border-blue/20 rounded-lg bg-white text-text focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="">-- Select an employee --</option>
                                {filteredEmployees.map((emp) => (
                                    <option key={emp.phone_number} value={emp.phone_number}>
                                        {emp.name} ({emp.phone_number})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 border border-blue/20 rounded-lg text-text font-medium hover:bg-blue/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedRole || !selectedEmployee}
                                className="flex-1 px-4 py-2.5 bg-blue text-white rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader size={16} className="animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    'Assign Task'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
