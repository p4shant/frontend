import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import { Calendar, Save, Users, CheckCircle2, XCircle } from 'lucide-react';

interface TeamMember {
    id: number;
    name: string;
    employee_role: string;
}

interface AttendanceStatus {
    employee_id: number;
    status: 'present' | 'absent';
    marked_status?: 'present' | 'absent' | null;
}

const MarkTeamAttendance = () => {
    const { token, user } = useAuth();
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        // Get today's date in YYYY-MM-DD format (IST)
        const today = new Date();
        const istDate = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        return istDate.toISOString().split('T')[0];
    });
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [statusMap, setStatusMap] = useState<Map<number, 'present' | 'absent' | undefined>>(new Map());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    useEffect(() => {
        if (teamMembers.length > 0) {
            fetchTeamAttendance();
        }
    }, [selectedDate, teamMembers.length]);

    const fetchTeamMembers = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await attendanceAPI.getTeamMembers(token);
            setTeamMembers(response.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch team members');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamAttendance = async () => {
        if (!token) return;
        try {
            const response = await attendanceAPI.getTeamAttendance(selectedDate, token);
            const attendance: AttendanceStatus[] = response.data || [];

            // Build status map from existing attendance records ONLY
            // Don't add unmarked members to the map - they stay unmarked
            const newStatusMap = new Map<number, 'present' | 'absent' | undefined>();
            attendance.forEach((record) => {
                if (record.marked_status) {
                    newStatusMap.set(record.employee_id, record.marked_status);
                }
            });

            setStatusMap(newStatusMap);
        } catch (err: any) {
            console.error('Error fetching team attendance:', err);
            // If error, start with empty map (all unmarked)
            setStatusMap(new Map());
        }
    };

    const toggleStatus = (employeeId: number) => {
        setStatusMap((prev) => {
            const newMap = new Map(prev);
            const currentStatus = newMap.get(employeeId);

            if (!currentStatus) {
                // Unmarked → Present
                newMap.set(employeeId, 'present');
            } else if (currentStatus === 'present') {
                // Present → Absent
                newMap.set(employeeId, 'absent');
            } else {
                // Absent → Unmarked (remove from map)
                newMap.delete(employeeId);
            }

            return newMap;
        });
    };

    const handleSave = async () => {
        if (!token) return;

        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // Only send employees who are marked (present or absent)
            // Exclude unmarked employees (not in statusMap)
            const attendance = Array.from(statusMap.entries())
                .filter(([_, status]) => status !== undefined)
                .map(([employee_id, status]) => ({
                    employee_id,
                    status: status!,
                }));

            await attendanceAPI.markTeamAttendance({
                date: selectedDate,
                attendance,
            }, token);

            setSuccess('Team attendance marked successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to mark team attendance');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const presentCount = Array.from(statusMap.values()).filter((s) => s === 'present').length;
    const absentCount = Array.from(statusMap.values()).filter((s) => s === 'absent').length;
    const unmarkedCount = teamMembers.length - statusMap.size;

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
            <div className="mb-4 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <Users className="text-blue" size={24} />
                    <h1 className="text-xl sm:text-3xl font-bold text-text">Mark Team Attendance</h1>
                </div>
                <p className="text-sm sm:text-base text-text/60">
                    Supervisor: <span className="font-semibold text-text">{user?.name}</span>
                </p>
            </div>

            {/* Date Picker */}
            <div className="bg-white rounded-xl shadow-sm border border-blue/10 p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Calendar className="text-blue flex-shrink-0" size={18} />
                        <label htmlFor="date" className="font-medium text-text text-sm sm:text-base">
                            Select Date:
                        </label>
                    </div>
                    <input
                        type="date"
                        id="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-blue/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue/30"
                    />
                    <div className="text-xs sm:text-sm text-text/60 sm:ml-auto">
                        {formatDate(selectedDate)}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-blue/10 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                        <div className="w-full">
                            <p className="text-text/60 text-xs sm:text-sm">Total Team</p>
                            <p className="text-xl sm:text-2xl font-bold text-text">{teamMembers.length}</p>
                        </div>
                        <Users className="text-blue/40 hidden sm:block" size={32} />
                    </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-green-500/10 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                        <div className="w-full">
                            <p className="text-text/60 text-xs sm:text-sm">Present</p>
                            <p className="text-xl sm:text-2xl font-bold text-green-600">{presentCount}</p>
                        </div>
                        <CheckCircle2 className="text-green-500/40 hidden sm:block" size={32} />
                    </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-red-500/10 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                        <div className="w-full">
                            <p className="text-text/60 text-xs sm:text-sm">Absent</p>
                            <p className="text-xl sm:text-2xl font-bold text-red-600">{absentCount}</p>
                        </div>
                        <XCircle className="text-red-500/40 hidden sm:block" size={32} />
                    </div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-500/10 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                        <div className="w-full">
                            <p className="text-text/60 text-xs sm:text-sm">Unmarked</p>
                            <p className="text-xl sm:text-2xl font-bold text-gray-600">{unmarkedCount}</p>
                        </div>
                        <span className="text-gray-400 text-2xl sm:text-3xl hidden sm:block">○</span>
                    </div>
                </div>
            </div>

            {/* Team Members List */}
            <div className="bg-white rounded-xl shadow-sm border border-blue/10 overflow-hidden mb-4 sm:mb-6">
                <div className="p-4 sm:p-6 border-b border-blue/10">
                    <h2 className="text-lg sm:text-xl font-semibold text-text">Team Members</h2>
                    <p className="text-xs sm:text-sm text-text/60 mt-1">
                        Tap on each member to toggle their attendance status
                    </p>
                </div>

                <div className="divide-y divide-blue/10">
                    {teamMembers.map((member) => {
                        const status = statusMap.get(member.id);
                        const isPresent = status === 'present';
                        const isAbsent = status === 'absent';

                        return (
                            <div
                                key={member.id}
                                onClick={() => toggleStatus(member.id)}
                                className="p-3 sm:p-4 hover:bg-blue/5 cursor-pointer transition-colors active:bg-blue/10"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                                        <div
                                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base flex-shrink-0 ${isPresent ? 'bg-green-500' : isAbsent ? 'bg-red-500' : 'bg-gray-400'
                                                }`}
                                        >
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text text-sm sm:text-base truncate">{member.name}</p>
                                            <p className="text-xs sm:text-sm text-text/60 truncate">{member.employee_role}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        {isPresent ? (
                                            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-100 text-green-700 rounded-lg font-medium text-xs sm:text-sm">
                                                <CheckCircle2 size={14} className="sm:w-[18px] sm:h-[18px]" />
                                                <span className="hidden sm:inline">Present</span>
                                                <span className="sm:hidden">✓</span>
                                            </div>
                                        ) : isAbsent ? (
                                            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-lg font-medium text-xs sm:text-sm">
                                                <XCircle size={14} className="sm:w-[18px] sm:h-[18px]" />
                                                <span className="hidden sm:inline">Absent</span>
                                                <span className="sm:hidden">✕</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-100 text-gray-600 rounded-lg font-medium border-2 border-dashed border-gray-300 text-xs sm:text-sm">
                                                <span className="text-base sm:text-lg">○</span>
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

            {/* Save Button and Messages */}
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving || teamMembers.length === 0}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue text-white rounded-lg font-medium hover:bg-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base shadow-md"
                    >
                        <Save size={18} className="sm:w-5 sm:h-5" />
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>

                {/* Success/Error Messages below button */}
                {error && (
                    <div className="p-3 sm:p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm sm:text-base animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-2">
                            <XCircle className="flex-shrink-0 mt-0.5" size={18} />
                            <span>{error}</span>
                        </div>
                    </div>
                )}
                {success && (
                    <div className="p-3 sm:p-4 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm sm:text-base animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-2">
                            <CheckCircle2 className="flex-shrink-0 mt-0.5" size={18} />
                            <span>{success}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarkTeamAttendance;
