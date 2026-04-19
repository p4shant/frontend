import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import { Save, CheckCircle2, XCircle, Search, Shield } from 'lucide-react';

interface Employee {
    employee_id: number;
    employee_name: string;
    employee_role: string;
    district?: string;
    attendance_id: number | null;
    punch_in_time: string | null;
    attendance_mode: string | null;
    marked_status: string | null;
    marked_by_name: string | null;
    is_late: number;
}

const AdminMarkAttendance = () => {
    const { token, user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [statusMap, setStatusMap] = useState<Map<number, 'present' | 'absent' | undefined>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');

    const todayDisplay = new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Check if after 10 AM IST
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const isAfter10AM = nowIST.getHours() >= 10;

    useEffect(() => { fetchStatus(); }, []);

    const fetchStatus = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await attendanceAPI.getAdminAttendanceStatus(token);
            const data: Employee[] = response.data || [];
            setEmployees(data);

            const newMap = new Map<number, 'present' | 'absent' | undefined>();
            data.forEach((emp) => {
                if (emp.marked_status) {
                    newMap.set(emp.employee_id, emp.marked_status as 'present' | 'absent');
                } else if (emp.punch_in_time) {
                    // Self-punched employee - mark as present in map but lock it
                    newMap.set(emp.employee_id, 'present');
                }
            });
            setStatusMap(newMap);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch employees');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = (employeeId: number) => {
        // Don't allow toggling employees who already self-punched
        const emp = employees.find(e => e.employee_id === employeeId);
        if (emp?.attendance_mode === 'self' && emp?.punch_in_time) return;

        setStatusMap((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(employeeId);
            if (!current) newMap.set(employeeId, 'present');
            else if (current === 'present') newMap.set(employeeId, 'absent');
            else newMap.delete(employeeId);
            return newMap;
        });
    };

    const handleSave = async () => {
        if (!token) return;
        setError(''); setSuccess(''); setSaving(true);

        try {
            // Only send employees that admin toggled (exclude self-punched)
            const attendance = Array.from(statusMap.entries())
                .filter(([id, status]) => {
                    const emp = employees.find(e => e.employee_id === id);
                    return status !== undefined && !(emp?.attendance_mode === 'self' && emp?.punch_in_time);
                })
                .map(([employee_id, status]) => ({ employee_id, status: status! }));

            if (attendance.length === 0) {
                setError('No changes to save');
                setSaving(false);
                return;
            }

            await attendanceAPI.adminMarkAttendance({ attendance }, token);
            setSuccess('Attendance marked successfully!');
            fetchStatus();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to mark attendance');
        } finally {
            setSaving(false);
        }
    };

    // Compute unique roles and districts for filter dropdowns
    const uniqueRoles = [...new Set(employees.map(e => e.employee_role))].sort();
    const uniqueDistricts = [...new Set(employees.map(e => e.district).filter(Boolean))].sort();

    const filtered = employees.filter(e => {
        const matchesSearch = e.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.employee_role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = !filterRole || e.employee_role === filterRole;
        const matchesDistrict = !filterDistrict || e.district === filterDistrict;
        return matchesSearch && matchesRole && matchesDistrict;
    });

    const presentCount = Array.from(statusMap.values()).filter(s => s === 'present').length;
    const absentCount = Array.from(statusMap.values()).filter(s => s === 'absent').length;
    const unmarkedCount = employees.length - statusMap.size;

    if (user?.employee_role !== 'Admin Assistant' && user?.employee_role !== 'Master Admin') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                    <Shield className="mx-auto mb-3 text-red-400" size={48} />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600 text-sm">This page is only available for Admin Assistant and Master Admin.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-3 sm:p-6">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="text-indigo-600" size={24} />
                    <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Admin — Mark Attendance</h1>
                </div>
                <p className="text-sm text-gray-500">
                    Admin: <span className="font-semibold text-gray-700">{user?.name}</span> •{' '}
                    Date: <span className="font-semibold text-gray-700">{todayDisplay}</span>
                </p>
                {isAfter10AM && (
                    <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-700 text-sm font-medium">
                        ⏱ It's after 10:00 AM IST — attendance marked now will be categorized as <strong>Late</strong>.
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:mb-6">
                <div className="bg-white rounded-lg shadow-sm border p-3 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-xl font-bold text-gray-800">{employees.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-green-200 p-3 text-center">
                    <p className="text-xs text-green-600">Present</p>
                    <p className="text-xl font-bold text-green-700">{presentCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-red-200 p-3 text-center">
                    <p className="text-xs text-red-600">Absent</p>
                    <p className="text-xl font-bold text-red-700">{absentCount}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-3 text-center">
                    <p className="text-xs text-gray-500">Unmarked</p>
                    <p className="text-xl font-bold text-gray-600">{unmarkedCount}</p>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="mb-4 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employees by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="">All Roles</option>
                        {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <select
                        value={filterDistrict}
                        onChange={(e) => setFilterDistrict(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="">All Districts</option>
                        {uniqueDistricts.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    {(filterRole || filterDistrict) && (
                        <button
                            onClick={() => { setFilterRole(''); setFilterDistrict(''); }}
                            className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium"
                        >
                            Clear filters
                        </button>
                    )}
                    <span className="ml-auto self-center text-xs text-gray-500">
                        Showing {filtered.length} of {employees.length}
                    </span>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-4 sm:mb-6">
                <div className="p-4 border-b bg-indigo-50">
                    <h2 className="text-lg font-semibold text-indigo-900">All Employees</h2>
                    <p className="text-xs text-indigo-600 mt-1">
                        Tap to toggle: Unmarked → Present → Absent → Unmarked. Self-punched employees are locked.
                    </p>
                </div>

                <div className="divide-y max-h-[60vh] overflow-y-auto">
                    {filtered.map((emp) => {
                        const status = statusMap.get(emp.employee_id);
                        const isPresent = status === 'present';
                        const isAbsent = status === 'absent';
                        const isSelfPunched = emp.attendance_mode === 'self' && emp.punch_in_time;

                        return (
                            <div
                                key={emp.employee_id}
                                onClick={() => toggleStatus(emp.employee_id)}
                                className={`p-3 sm:p-4 transition-colors ${isSelfPunched ? 'bg-green-50/50 cursor-default' : 'hover:bg-indigo-50/50 cursor-pointer active:bg-indigo-100/50'}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 ${isPresent ? 'bg-green-500' : isAbsent ? 'bg-red-500' : 'bg-gray-400'}`}>
                                            {emp.employee_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{emp.employee_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{emp.employee_role}{emp.district ? ` • ${emp.district}` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isSelfPunched ? (
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium text-xs border border-green-300">
                                                <CheckCircle2 size={14} />
                                                <span>Self ✓</span>
                                            </div>
                                        ) : isPresent ? (
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium text-xs">
                                                <CheckCircle2 size={14} />
                                                <span className="hidden sm:inline">Present</span>
                                                <span className="sm:hidden">✓</span>
                                            </div>
                                        ) : isAbsent ? (
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium text-xs">
                                                <XCircle size={14} />
                                                <span className="hidden sm:inline">Absent</span>
                                                <span className="sm:hidden">✕</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-medium border-2 border-dashed border-gray-300 text-xs">
                                                <span className="text-base">○</span>
                                                <span className="hidden sm:inline">Tap to mark</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Save Button + Messages */}
            <div className="space-y-3">
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
                {error && (
                    <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm flex items-start gap-2">
                        <XCircle className="flex-shrink-0 mt-0.5" size={18} /><span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm flex items-start gap-2">
                        <CheckCircle2 className="flex-shrink-0 mt-0.5" size={18} /><span>{success}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMarkAttendance;
