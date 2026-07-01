import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { employeesAPI } from '../services/api';
import { KeyRound, Search, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

type Employee = {
    id: string;
    name: string;
    phone_number: string;
    employee_role: string;
    district?: string;
};

export default function ResetEmployeePassword() {
    const { token } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [resetting, setResetting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredEmployees(employees);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredEmployees(
                employees.filter(
                    (emp) =>
                        emp.name.toLowerCase().includes(q) ||
                        emp.phone_number.includes(q) ||
                        emp.employee_role.toLowerCase().includes(q)
                )
            );
        }
    }, [searchQuery, employees]);

    async function fetchEmployees() {
        try {
            setLoading(true);
            const response = await employeesAPI.list(token!);
            if (response?.data && Array.isArray(response.data)) {
                setEmployees(response.data);
                setFilteredEmployees(response.data);
            }
        } catch (err) {
            setErrorMessage('Failed to load employees');
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword() {
        if (!selectedEmployee || !token) return;

        setResetting(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            await employeesAPI.resetPassword(selectedEmployee.id, token);
            setSuccessMessage(
                `Password for "${selectedEmployee.name}" has been reset to the default password (Kaman@123). The employee can now login and change their password.`
            );
            setSelectedEmployee(null);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to reset password');
        } finally {
            setResetting(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-gradient-to-br from-brand/12 to-blue/8 rounded-xl">
                    <KeyRound size={24} className="text-blue-dark" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-text m-0">Reset Employee Password</h1>
                    <p className="text-sm text-muted m-0">Reset any employee's password to the default</p>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                        <p className="font-semibold m-0 mb-1">How it works</p>
                        <p className="m-0">
                            Select an employee and click "Reset Password" to set their password to the default:{' '}
                            <span className="font-mono font-semibold bg-amber-100 px-1.5 py-0.5 rounded">Kaman@123</span>.
                            The employee can then login and change their password from their profile.
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-2">
                    <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800 m-0">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-2">
                    <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 m-0">{errorMessage}</p>
                </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    type="text"
                    placeholder="Search by name, phone number, or role..."
                    className="w-full pl-10 pr-4 py-3 border border-blue/12 rounded-xl text-sm focus:outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/10 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Employee List */}
            <div className="border border-blue/12 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue"></div>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="text-center py-12 text-muted text-sm">
                        {searchQuery ? 'No employees match your search' : 'No employees found'}
                    </div>
                ) : (
                    <div className="max-h-[400px] overflow-y-auto divide-y divide-blue/8">
                        {filteredEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                className={`flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-blue/4 ${selectedEmployee?.id === emp.id
                                    ? 'bg-gradient-to-r from-brand/8 to-blue/6 border-l-4 border-l-blue'
                                    : ''
                                    }`}
                                onClick={() => {
                                    setSelectedEmployee(emp);
                                    setSuccessMessage('');
                                    setErrorMessage('');
                                }}
                            >
                                <div>
                                    <p className="font-medium text-text m-0">{emp.name}</p>
                                    <p className="text-xs text-muted m-0 mt-0.5">
                                        {emp.phone_number} • {emp.employee_role}
                                        {emp.district ? ` • ${emp.district}` : ''}
                                    </p>
                                </div>
                                {selectedEmployee?.id === emp.id && (
                                    <div className="w-3 h-3 rounded-full bg-blue flex-shrink-0"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reset Button */}
            {selectedEmployee && (
                <div className="mt-6 p-4 bg-gray-50 border border-blue/12 rounded-xl">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-sm font-medium text-text m-0">
                                Reset password for:{' '}
                                <span className="text-blue-dark">{selectedEmployee.name}</span>
                            </p>
                            <p className="text-xs text-muted m-0 mt-1">
                                Phone: {selectedEmployee.phone_number} • Role: {selectedEmployee.employee_role}
                            </p>
                        </div>
                        <button
                            onClick={handleResetPassword}
                            disabled={resetting}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
                            {resetting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
