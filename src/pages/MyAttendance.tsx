import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { DatesSetArg, EventInput } from '@fullcalendar/core'

interface AttendanceRecord {
    id: number | null
    employee_id: number
    employee_name: string
    employee_role: string
    punch_in_time: string | null
    punch_out_time: string | null
    punch_in_location: string
    punch_out_location: string | null
    total_hours: number
    status: 'present' | 'late' | 'absent' | 'forgot_to_punch_out'
    attendance_date: string
    is_late: number
    forgot_to_punch_out: number
}

function MyAttendance() {
    const { user, token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>(todayStr)

    const formatDateForApi = (date: Date) => {
        return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    }

    const getMonthRange = (baseDate = new Date()) => {
        const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
        const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
        return {
            from: formatDateForApi(start),
            to: formatDateForApi(end)
        }
    }

    const formatTime = (time: string | null) => {
        if (!time) return '-'
        let isoTime = time
        if (time && time.includes(' ') && !time.includes('T')) {
            isoTime = time.replace(' ', 'T') + 'Z'
        }
        const date = new Date(isoTime)
        if (isNaN(date.getTime())) return '-'
        return date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    const fetchMyAttendance = async (from: string, to: string) => {
        if (!token || !user) return
        try {
            setLoading(true)
            const response = await fetch(
                `${API_BASE}/attendance?employee_id=${user.id}&date_from=${from}&date_to=${to}&limit=500`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            )
            if (response.ok) {
                const result = await response.json()
                setRecords(result.data || [])
            } else {
                setRecords([])
            }
        } catch (err) {
            console.error('Error fetching attendance:', err)
            setRecords([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user && token) {
            const { from, to } = getMonthRange()
            setDateFrom(from)
            setDateTo(to)
            fetchMyAttendance(from, to)
        }
    }, [user, token])

    const sortedRecords = records.slice().sort((a, b) => (a.attendance_date < b.attendance_date ? 1 : -1))

    const isTechnician = user?.employee_role === 'Technician'

    const isSunday = (dateStr: string) => {
        const d = new Date(dateStr + 'T00:00:00')
        return d.getDay() === 0
    }

    const calendarEvents = useMemo<EventInput[]>(() => {
        return sortedRecords.map((record) => {
            const eventDate = record.attendance_date

            // Sunday = Holiday for non-technicians
            if (!isTechnician && isSunday(eventDate)) {
                return {
                    title: '🏖️ Holiday',
                    start: eventDate,
                    allDay: true,
                    backgroundColor: '#6366f1',
                    borderColor: '#6366f1',
                    textColor: '#ffffff'
                }
            }

            const isAbsent = record.status === 'absent'
            const isMissingPunchOut = record.status === 'forgot_to_punch_out' || !record.punch_out_time
            const title = isAbsent
                ? 'Absent'
                : `In: ${formatTime(record.punch_in_time)}\nOut: ${formatTime(record.punch_out_time)}`

            let color = '#22c55e'
            if (isMissingPunchOut) color = '#f97316'
            if (isAbsent) color = '#ef4444'

            return {
                title,
                start: eventDate,
                allDay: true,
                backgroundColor: color,
                borderColor: color,
                textColor: '#ffffff'
            }
        })
    }, [sortedRecords, isTechnician])

    const handleCalendarDatesSet = (info: DatesSetArg) => {
        if (!user) return
        const endInclusive = new Date(info.end)
        endInclusive.setDate(endInclusive.getDate() - 1)
        const from = formatDateForApi(info.start)
        const to = formatDateForApi(endInclusive)

        if (from !== dateFrom || to !== dateTo) {
            setDateFrom(from)
            setDateTo(to)
            fetchMyAttendance(from, to)
        }
    }

    const summary = sortedRecords.reduce(
        (acc, r) => {
            // Skip Sundays for non-technicians
            if (!isTechnician && isSunday(r.attendance_date)) return acc
            acc.total += 1
            const hasPunchIn = !!r.punch_in_time
            if (hasPunchIn) {
                acc.present += 1
                if (r.status === 'late') acc.late += 1
                if (!r.punch_out_time || r.status === 'forgot_to_punch_out') acc.forgot += 1
            } else {
                acc.absent += 1
            }
            return acc
        },
        { total: 0, present: 0, late: 0, absent: 0, forgot: 0 }
    )

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-100 to-blue-50">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
                {/* Header */}
                <div className="bg-violet-500 rounded-t-2xl px-4 sm:px-6 py-4">
                    <h3 className="text-white font-bold text-base sm:text-lg">{user?.name || 'My Attendance'}</h3>
                    <p className="text-blue-100 text-xs sm:text-sm">{user?.employee_role} • {dateFrom || todayStr} to {dateTo}</p>
                </div>

                <div className="bg-white rounded-b-2xl shadow-2xl border border-blue/10">
                    {/* Subtitle */}
                    <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-600">Monthly Attendance Calendar</p>
                        <p className="text-[10px] text-slate-500 mt-1">Navigate to view attendance for different months</p>
                    </div>

                    {/* Summary Stats */}
                    <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="text-[10px] text-slate-500 font-semibold">Total Days</p>
                                <p className="text-lg font-bold text-slate-800">{summary.total}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="text-[10px] text-green-600 font-semibold">Present</p>
                                <p className="text-lg font-bold text-green-700">{summary.present}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="text-[10px] text-yellow-600 font-semibold">Late</p>
                                <p className="text-lg font-bold text-yellow-700">{summary.late}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="text-[10px] text-orange-600 font-semibold">Forgot P.Out</p>
                                <p className="text-lg font-bold text-orange-700">{summary.forgot}</p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                <p className="text-[10px] text-red-600 font-semibold">Absent</p>
                                <p className="text-lg font-bold text-red-700">{summary.absent}</p>
                            </div>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="p-4 sm:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                                <span className="ml-3 text-sm text-slate-500">Loading attendance history...</span>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg">
                                <FullCalendar
                                    plugins={[dayGridPlugin]}
                                    initialView="dayGridMonth"
                                    events={calendarEvents}
                                    datesSet={handleCalendarDatesSet}
                                    headerToolbar={{
                                        left: 'prev,next today',
                                        center: 'title',
                                        right: ''
                                    }}
                                    height="auto"
                                    contentHeight="auto"
                                    eventDisplay="block"
                                    dayMaxEvents={2}
                                    eventClassNames="text-xs font-semibold"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MyAttendance
