import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Users, CheckCircle, Clock, MapPin, AlertCircle, Download } from 'lucide-react'

interface Stats {
    totalEmployees: number
    presentToday: number
    lateToday: number
    absentToday: number
    forgotPunchOutToday: number
}

interface AttendanceRecord {
    id: number | null
    employee_id: number
    employee_name: string
    employee_role: string
    punch_in_time: string | null
    punch_out_time: string | null
    punch_in_location: string
    punch_out_location: string | null
    punch_in_image_url: string | null
    punch_out_image_url: string | null
    punch_in_latitude: string | number | null
    punch_in_longitude: string | number | null
    punch_out_latitude: string | number | null
    punch_out_longitude: string | number | null
    total_hours: number
    status: 'present' | 'late' | 'absent' | 'forgot_to_punch_out'
    attendance_date: string
    is_late: number
    forgot_to_punch_out: number
}

function MonitorAttendance() {
    const { user, token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE || 'https://backend-tkpl.onrender.com/api'

    const [stats, setStats] = useState<Stats>({
        totalEmployees: 0,
        presentToday: 0,
        lateToday: 0,
        absentToday: 0,
        forgotPunchOutToday: 0
    })
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [previewTitle, setPreviewTitle] = useState<string>('')

    useEffect(() => {
        if (user && token && user.employee_role === 'Master Admin') {
            fetchStats()
        }
    }, [user, token, startDate, endDate])

    const fetchStats = async () => {
        try {
            setLoading(true)
            // Fetch with includeAbsentees flag to get all employees including absent ones
            const response = await fetch(
                `${API_BASE}/attendance?limit=500&date_from=${startDate}&date_to=${endDate}&includeAbsentees=true`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (response.ok) {
                const result = await response.json()
                const records: AttendanceRecord[] = result.data || []

                setAttendanceRecords(records)

                // Calculate stats from response or records
                if (result.stats) {
                    setStats({
                        totalEmployees: result.totalEmployees || 0,
                        presentToday: result.stats.presentCount || 0,
                        lateToday: result.stats.lateCount || 0,
                        absentToday: result.stats.absentCount || 0,
                        forgotPunchOutToday: result.stats.forgotPunchOutCount || 0
                    })
                } else {
                    // Fallback calculation
                    const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length
                    const lateCount = records.filter(r => r.status === 'late').length
                    const absentCount = records.filter(r => r.status === 'absent').length
                    const forgotCount = records.filter(r => r.status === 'forgot_to_punch_out').length

                    setStats({
                        totalEmployees: records.length,
                        presentToday: presentCount,
                        lateToday: lateCount,
                        absentToday: absentCount,
                        forgotPunchOutToday: forgotCount
                    })
                }
            }
        } catch (err) {
            console.error('Error fetching stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredRecords = attendanceRecords.filter(record => {
        const matchesSearch = record.employee_name.toLowerCase().includes(searchTerm.toLowerCase())

        if (filterStatus === 'all') return matchesSearch
        if (filterStatus === 'present') return matchesSearch && record.status === 'present'
        if (filterStatus === 'late') return matchesSearch && record.status === 'late'
        if (filterStatus === 'absent') return matchesSearch && record.status === 'absent'
        if (filterStatus === 'forgot_punch_out') return matchesSearch && record.status === 'forgot_to_punch_out'

        return false
    })

    const formatTime = (time: string | null) => {
        if (!time) return '-'
        try {
            const d = new Date(time)
            return d.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            })
        } catch {
            return '-'
        }
    }

    const calculateHours = (punchIn: string | null, punchOut: string | null) => {
        if (!punchIn || !punchOut) return '-'
        try {
            const inTime = new Date(punchIn)
            const outTime = new Date(punchOut)
            const diff = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
            return `${diff.toFixed(1)} hrs`
        } catch {
            return '-'
        }
    }

    const openMapLocation = (lat: string | number | null, lng: string | number | null) => {
        if (!lat || !lng || lat === 'N/A' || lng === 'N/A') {
            alert('Location data not available')
            return
        }

        const latitude = typeof lat === 'string' ? parseFloat(lat) : lat
        const longitude = typeof lng === 'string' ? parseFloat(lng) : lng

        if (isNaN(latitude) || isNaN(longitude)) {
            alert('Invalid location data')
            return
        }

        // Open in Google Maps
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
        window.open(mapsUrl, '_blank')
    }

    const getStatusBadge = (status: string) => {
        const badgeStyles: Record<string, { bg: string; text: string; icon: string }> = {
            'present': { bg: 'bg-green-100', text: 'text-green-700 border border-green-300', icon: '✓' },
            'late': { bg: 'bg-yellow-100', text: 'text-yellow-700 border border-yellow-300', icon: '⏱' },
            'absent': { bg: 'bg-red-100', text: 'text-red-700 border border-red-300', icon: '✕' },
            'forgot_to_punch_out': { bg: 'bg-orange-100', text: 'text-orange-700 border border-orange-300', icon: '⚠' }
        }

        const style = badgeStyles[status] || badgeStyles['present']
        const labels: Record<string, string> = {
            'present': 'On Time',
            'late': 'Late',
            'absent': 'Absent',
            'forgot_to_punch_out': 'Forgot Punch Out'
        }

        return (
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${style.bg} ${style.text}`}>
                {style.icon} {labels[status]}
            </span>
        )
    }

    const exportToCSV = () => {
        if (filteredRecords.length === 0) {
            alert('No records to export')
            return
        }

        // Prepare CSV headers
        const headers = ['#', 'Employee Name', 'Role', 'Punch In Time', 'Punch Out Time', 'Punch In Location', 'Punch Out Location', 'Total Hours', 'Status']

        // Prepare CSV rows
        const rows = filteredRecords.map((record, index) => [
            index + 1,
            record.employee_name,
            record.employee_role,
            formatTime(record.punch_in_time),
            formatTime(record.punch_out_time),
            record.punch_in_location,
            record.punch_out_location || '-',
            calculateHours(record.punch_in_time, record.punch_out_time),
            record.status === 'present' ? 'On Time' :
                record.status === 'late' ? 'Late' :
                    record.status === 'absent' ? 'Absent' :
                        'Forgot Punch Out'
        ])

        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        const fileName = `Attendance_${new Date().toISOString().split('T')[0]}_${filterStatus}.csv`
        link.setAttribute('href', url)
        link.setAttribute('download', fileName)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (user?.employee_role !== 'Master Admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-6 sm:p-8 text-center max-w-md">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600 text-sm sm:text-base">This page is only available for Master Admin users.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-100 to-blue-50">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
                <div className="mb-4 sm:mb-8">
                    <p className="text-gray-600 text-sm sm:text-base">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="ml-3 text-gray-600 text-sm">Loading statistics...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-blue-500">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">Total Employees</p>
                                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{stats.totalEmployees}</p>
                                </div>
                                <div className="bg-blue-100 p-2 sm:p-3 rounded-lg hidden sm:block">
                                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-green-500">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">Present</p>
                                    <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.presentToday}</p>
                                </div>
                                <div className="bg-green-100 p-2 sm:p-3 rounded-lg hidden sm:block">
                                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-yellow-500">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">Late</p>
                                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.lateToday}</p>
                                </div>
                                <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg hidden sm:block">
                                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-orange-500">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">Forgot P.Out</p>
                                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.forgotPunchOutToday}</p>
                                </div>
                                <div className="bg-orange-100 p-2 sm:p-3 rounded-lg hidden sm:block">
                                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-red-500">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-500 font-medium mb-1">Absent</p>
                                    <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.absentToday}</p>
                                </div>
                                <div className="bg-red-100 p-2 sm:p-3 rounded-lg hidden sm:block">
                                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="flex-1 relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                />
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                />
                                <span className="hidden sm:flex items-center text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-1 sm:gap-2 flex-wrap">
                            {['all', 'present', 'late', 'absent', 'forgot_punch_out'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-bold transition-colors whitespace-nowrap ${filterStatus === status
                                        ? 'bg-blue text-white shadow-xl ring-2 ring-blue-400'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {status === 'all' ? 'All' :
                                        status === 'present' ? 'Present' :
                                            status === 'late' ? 'Late' :
                                                status === 'absent' ? 'Absent' :
                                                    'Forgot P.Out'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden mb-6">
                    <div className="bg-cyan-600 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
                        <h2 className="text-base sm:text-lg font-bold text-white">Attendance Records</h2>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white text-cyan-600 hover:bg-gray-100 rounded-lg font-bold text-xs sm:text-sm transition-colors shadow-md"
                            title="Download attendance report as CSV"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 sm:p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-gray-500 mt-2 text-sm">Loading attendance records...</p>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center text-gray-500">
                            <AlertCircle size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
                                <table className="w-full text-xs sm:text-sm border-collapse">
                                    <thead className="bg-blue order-b-2 border-slate-800 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap">#</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap">Employee</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap">Role</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap">Punch In</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-center font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">In Image</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap">Punch Out</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-center font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">Out Image</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">Punch In Location</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-left font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">Punch Out Location</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-center font-bold text-white text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">Hours</th>
                                            <th className="px-3 sm:px-4 py-3 sm:py-4 text-center font-bold text-white text-xs sm:text-sm whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredRecords.map((record, index) => (
                                            <tr
                                                key={record.id || `absent-${record.employee_id}`}
                                                className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                            >
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-700 font-medium align-middle">{index + 1}</td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 font-semibold text-gray-800 align-middle whitespace-nowrap">{record.employee_name}</td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-600 text-[10px] sm:text-xs align-middle whitespace-nowrap">{record.employee_role}</td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-700 align-middle">
                                                    <span className="font-medium">{formatTime(record.punch_in_time)}</span>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center align-middle hidden lg:table-cell">
                                                    {record.punch_in_image_url ? (
                                                        <button
                                                            onClick={() => {
                                                                const imageUrl = record.punch_in_image_url.startsWith('http')
                                                                    ? record.punch_in_image_url
                                                                    : `${API_BASE.replace('/api', '')}${record.punch_in_image_url}`
                                                                setPreviewImage(imageUrl)
                                                                setPreviewTitle(`${record.employee_name} - Punch In`)
                                                            }}
                                                            className="px-3 py-1.5 text-[10px] sm:text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-bold shadow-sm"
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-medium">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-700 align-middle">
                                                    <span className="font-medium">{formatTime(record.punch_out_time)}</span>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center align-middle hidden lg:table-cell">
                                                    {record.punch_out_image_url ? (
                                                        <button
                                                            onClick={() => {
                                                                const imageUrl = record.punch_out_image_url.startsWith('http')
                                                                    ? record.punch_out_image_url
                                                                    : `${API_BASE.replace('/api', '')}${record.punch_out_image_url}`
                                                                setPreviewImage(imageUrl)
                                                                setPreviewTitle(`${record.employee_name} - Punch Out`)
                                                            }}
                                                            className="px-3 py-1.5 text-[10px] sm:text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors font-bold shadow-sm"
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-medium">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-600 text-[10px] sm:text-xs align-middle hidden md:table-cell">
                                                    <div className="flex flex-col gap-1 max-w-[150px]">
                                                        <span className="truncate">{record.punch_in_location}</span>
                                                        {record.punch_in_latitude && record.punch_in_longitude && record.punch_in_latitude !== 'N/A' && (
                                                            <button
                                                                onClick={() => openMapLocation(record.punch_in_latitude, record.punch_in_longitude)}
                                                                className="text-[9px] sm:text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold"
                                                            >
                                                                <MapPin size={10} /> View Map
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-600 text-[10px] sm:text-xs align-middle hidden md:table-cell">
                                                    <div className="flex flex-col gap-1 max-w-[150px]">
                                                        <span className="truncate">{record.punch_out_location || '-'}</span>
                                                        {record.punch_out_latitude && record.punch_out_longitude && record.punch_out_latitude !== 'N/A' && (
                                                            <button
                                                                onClick={() => openMapLocation(record.punch_out_latitude, record.punch_out_longitude)}
                                                                className="text-[9px] sm:text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold"
                                                            >
                                                                <MapPin size={10} /> View Map
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-gray-700 font-medium align-middle text-center hidden sm:table-cell">{calculateHours(record.punch_in_time, record.punch_out_time)}</td>
                                                <td className="px-3 sm:px-4 py-3 sm:py-4 text-center align-middle min-w-[140px] sm:min-w-[160px]">
                                                    {getStatusBadge(record.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-xs sm:text-sm break-words pr-2">{previewTitle}</h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white flex-shrink-0"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-3 sm:p-4 max-h-[80vh] overflow-auto">
                            <img
                                src={previewImage}
                                alt={previewTitle}
                                className="max-w-full h-auto rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default MonitorAttendance
