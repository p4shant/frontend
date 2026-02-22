import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { Search, User, Users, FileText, CheckCircle2, AlertCircle, ChevronDown, X, ClipboardPlus } from 'lucide-react'
import workTypes from '../data/workTypes.json'

interface Employee {
    id: number
    name: string
    employee_role: string
}

interface Customer {
    id: number
    applicant_name: string
    mobile_number: string
    district: string
}

interface WorkType {
    key: string
    label: string
    description: string
}

const STATUSES = [
    { value: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'inprogress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100  text-green-700  border-green-200' },
]

function CreateTask() {
    const { token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE

    // ── Data lists ────────────────────────────────────────────────────────────
    const [employees, setEmployees] = useState<Employee[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loadingLists, setLoadingLists] = useState(true)

    // ── Form fields ───────────────────────────────────────────────────────────
    const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null)
    const [workDescription, setWorkDescription] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [status, setStatus] = useState<'pending' | 'inprogress' | 'completed'>('pending')

    // ── Search / filter state ─────────────────────────────────────────────────
    const [workTypeSearch, setWorkTypeSearch] = useState('')
    const [employeeSearch, setEmployeeSearch] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')

    // ── Dropdown open states ──────────────────────────────────────────────────
    const [wtOpen, setWtOpen] = useState(false)
    const [empOpen, setEmpOpen] = useState(false)
    const [custOpen, setCustOpen] = useState(false)

    // ── Submit state ──────────────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // ── Fetch lists on mount ──────────────────────────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            setLoadingLists(true)
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [empRes, custRes] = await Promise.all([
                    fetch(`${API_BASE}/employees?limit=500`, { headers }),
                    fetch(`${API_BASE}/registered-customers?limit=1000`, { headers }),
                ])
                if (empRes.ok) {
                    const d = await empRes.json()
                    setEmployees(d.data || [])
                }
                if (custRes.ok) {
                    const d = await custRes.json()
                    setCustomers(d.data || [])
                }
            } catch (e) {
                console.error('Failed to fetch lists', e)
            } finally {
                setLoadingLists(false)
            }
        }
        if (token) fetchAll()
    }, [token])

    // ── Auto-fill description when work type or customer changes ─────────────
    useEffect(() => {
        if (selectedWorkType) {
            const desc = `${selectedWorkType.key.replace(/_/g, ' ')} for ${selectedCustomer?.applicant_name || 'customer'} (Mobile: ${selectedCustomer?.mobile_number || 'unknown'}) in ${selectedCustomer?.district || 'district unknown'}`
            setWorkDescription(desc)
        }
    }, [selectedWorkType, selectedCustomer])

    // ── Unique roles for filter ───────────────────────────────────────────────
    const uniqueRoles = useMemo(
        () => ['all', ...Array.from(new Set(employees.map(e => e.employee_role))).sort()],
        [employees]
    )

    // ── Filtered lists ────────────────────────────────────────────────────────
    const filteredWorkTypes = useMemo(
        () => (workTypes as WorkType[]).filter(wt =>
            wt.label.toLowerCase().includes(workTypeSearch.toLowerCase()) ||
            wt.key.toLowerCase().includes(workTypeSearch.toLowerCase())
        ),
        [workTypeSearch]
    )

    const filteredEmployees = useMemo(
        () => employees.filter(emp => {
            const matchRole = roleFilter === 'all' || emp.employee_role === roleFilter
            const matchSearch = emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                emp.employee_role.toLowerCase().includes(employeeSearch.toLowerCase())
            return matchRole && matchSearch
        }),
        [employees, employeeSearch, roleFilter]
    )

    const filteredCustomers = useMemo(
        () => customers.filter(c =>
            c.applicant_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.mobile_number.includes(customerSearch) ||
            c.district?.toLowerCase().includes(customerSearch.toLowerCase()) ||
            String(c.id).includes(customerSearch)
        ),
        [customers, customerSearch]
    )

    // ── Reset form ────────────────────────────────────────────────────────────
    const resetForm = () => {
        setSelectedWorkType(null)
        setWorkDescription('')
        setSelectedEmployee(null)
        setSelectedCustomer(null)
        setStatus('pending')
        setWorkTypeSearch('')
        setEmployeeSearch('')
        setCustomerSearch('')
        setRoleFilter('all')
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedWorkType) { setResult({ type: 'error', message: 'Please select a work type.' }); return }
        if (!workDescription.trim()) { setResult({ type: 'error', message: 'Work description is required.' }); return }
        if (!selectedEmployee) { setResult({ type: 'error', message: 'Please select an employee to assign.' }); return }
        if (!selectedCustomer) { setResult({ type: 'error', message: 'Please select a customer.' }); return }

        setIsSubmitting(true)
        setResult(null)

        try {
            const res = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    work: workDescription.trim(),
                    work_type: selectedWorkType.key,
                    status,
                    assigned_to_id: selectedEmployee.id,
                    assigned_to_name: selectedEmployee.name,
                    assigned_to_role: selectedEmployee.employee_role,
                    registered_customer_id: selectedCustomer.id,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.message || 'Failed to create task')
            }
            setResult({ type: 'success', message: `Task #${data.id || ''} created successfully for ${selectedCustomer.applicant_name}!` })
            resetForm()
        } catch (err: any) {
            setResult({ type: 'error', message: err.message || 'An error occurred.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Shared dropdown wrapper styles ────────────────────────────────────────
    const dropdownBase = 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden'

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-3 sm:p-6">
            <div className="max-w-3xl mx-auto">

                {/* ── Page Header ── */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-blue flex items-center justify-center shadow">
                            <ClipboardPlus size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Create Task</h1>
                            <p className="text-xs sm:text-sm text-gray-500">Manually assign a workflow task to an employee for a customer</p>
                        </div>
                    </div>
                </div>

                {/* ── Result Banner ── */}
                {result && (
                    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 mb-5 border text-sm font-medium ${result.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                        }`}>
                        {result.type === 'success'
                            ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                            : <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        }
                        <span className="flex-1">{result.message}</span>
                        <button onClick={() => setResult(null)} className="flex-shrink-0 opacity-60 hover:opacity-100">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {loadingLists ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                        <p className="text-sm text-gray-500">Loading employees and customers…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible">

                        {/* ─── Section 1: Work Type ─── */}
                        <div className="p-5 sm:p-6 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                                <h2 className="font-bold text-gray-800 text-sm sm:text-base">Work Type</h2>
                            </div>

                            {/* Work type selector */}
                            <div className="relative mb-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Select Work Type *</label>
                                <button
                                    type="button"
                                    onClick={() => { setWtOpen(v => !v); setEmpOpen(false); setCustOpen(false) }}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 border-2 rounded-xl text-sm transition-colors text-left ${selectedWorkType ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                                        }`}
                                >
                                    <span className={selectedWorkType ? 'font-semibold text-blue-800' : 'text-gray-400'}>
                                        {selectedWorkType ? selectedWorkType.label : '— Select a work type —'}
                                    </span>
                                    <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${wtOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {wtOpen && (
                                    <div className={dropdownBase} style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search work types…"
                                                    value={workTypeSearch}
                                                    onChange={e => setWorkTypeSearch(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                />
                                            </div>
                                        </div>
                                        {filteredWorkTypes.length === 0 ? (
                                            <p className="text-xs text-gray-400 p-3 text-center">No results</p>
                                        ) : filteredWorkTypes.map(wt => (
                                            <button
                                                key={wt.key}
                                                type="button"
                                                onClick={() => { setSelectedWorkType(wt); setWtOpen(false); setWorkTypeSearch('') }}
                                                className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors ${selectedWorkType?.key === wt.key ? 'bg-blue-50' : ''
                                                    }`}
                                            >
                                                <p className="text-xs font-semibold text-gray-800">{wt.label}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{wt.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Work description */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    Work Description *
                                    {selectedWorkType && <span className="ml-2 font-normal text-blue-500 normal-case">(auto-filled — edit if needed)</span>}
                                </label>
                                <textarea
                                    value={workDescription}
                                    onChange={e => setWorkDescription(e.target.value)}
                                    placeholder="Describe what the employee needs to do for this task…"
                                    rows={4}
                                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl resize-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-300"
                                />
                                <p className="text-[10px] text-gray-400 mt-1 text-right">{workDescription.length} chars</p>
                            </div>
                        </div>

                        {/* ─── Section 2: Assign To Employee ─── */}
                        <div className="p-5 sm:p-6 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                                <h2 className="font-bold text-gray-800 text-sm sm:text-base">Assign To Employee</h2>
                            </div>

                            {/* Selected employee preview */}
                            {selectedEmployee && (
                                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {selectedEmployee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-indigo-900 truncate">{selectedEmployee.name}</p>
                                        <p className="text-[10px] text-indigo-600">{selectedEmployee.employee_role}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedEmployee(null)} className="text-indigo-400 hover:text-indigo-700">
                                        <X size={15} />
                                    </button>
                                </div>
                            )}

                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    {selectedEmployee ? 'Change Employee' : 'Select Employee *'}
                                </label>

                                {/* Role filter + search row */}
                                <div className="flex gap-2 mb-2">
                                    <select
                                        value={roleFilter}
                                        onChange={e => setRoleFilter(e.target.value)}
                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 flex-shrink-0"
                                    >
                                        {uniqueRoles.map(r => (
                                            <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>
                                        ))}
                                    </select>
                                    <div className="relative flex-1">
                                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or role…"
                                            value={employeeSearch}
                                            onChange={e => { setEmployeeSearch(e.target.value); setEmpOpen(true) }}
                                            onFocus={() => { setEmpOpen(true); setWtOpen(false); setCustOpen(false) }}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                    </div>
                                </div>

                                {empOpen && (
                                    <div className={dropdownBase} style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                        {filteredEmployees.length === 0 ? (
                                            <p className="text-xs text-gray-400 p-3 text-center">No employees match</p>
                                        ) : filteredEmployees.map(emp => (
                                            <button
                                                key={emp.id}
                                                type="button"
                                                onClick={() => { setSelectedEmployee(emp); setEmpOpen(false); setEmployeeSearch('') }}
                                                className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors ${selectedEmployee?.id === emp.id ? 'bg-indigo-50' : ''
                                                    }`}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                                                    {emp.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800">{emp.name}</p>
                                                    <p className="text-[10px] text-gray-400">{emp.employee_role}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Section 3: Customer ─── */}
                        <div className="p-5 sm:p-6 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                                <h2 className="font-bold text-gray-800 text-sm sm:text-base">Customer</h2>
                            </div>

                            {/* Selected customer preview */}
                            {selectedCustomer && (
                                <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {selectedCustomer.applicant_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-purple-900 truncate">{selectedCustomer.applicant_name}</p>
                                            <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0">APP-{selectedCustomer.id}</span>
                                        </div>
                                        <p className="text-[10px] text-purple-600">{selectedCustomer.mobile_number} · {selectedCustomer.district}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedCustomer(null)} className="text-purple-400 hover:text-purple-700">
                                        <X size={15} />
                                    </button>
                                </div>
                            )}

                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                    {selectedCustomer ? 'Change Customer' : 'Select Customer *'}
                                </label>
                                <div className="relative">
                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, mobile, district or APP ID…"
                                        value={customerSearch}
                                        onChange={e => { setCustomerSearch(e.target.value); setCustOpen(true) }}
                                        onFocus={() => { setCustOpen(true); setWtOpen(false); setEmpOpen(false) }}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200"
                                    />
                                </div>

                                {custOpen && (
                                    <div className={dropdownBase} style={{ maxHeight: '280px', overflowY: 'auto' }}>
                                        {filteredCustomers.length === 0 ? (
                                            <p className="text-xs text-gray-400 p-3 text-center">No customers match</p>
                                        ) : filteredCustomers.slice(0, 50).map(c => (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => { setSelectedCustomer(c); setCustOpen(false); setCustomerSearch('') }}
                                                className={`w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors ${selectedCustomer?.id === c.id ? 'bg-purple-50' : ''
                                                    }`}
                                            >
                                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold flex-shrink-0">
                                                    {c.applicant_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-xs font-semibold text-gray-800 truncate">{c.applicant_name}</p>
                                                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded font-bold flex-shrink-0">#{c.id}</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400">{c.mobile_number} · {c.district}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredCustomers.length > 50 && (
                                            <p className="text-[10px] text-gray-400 text-center py-2">Showing first 50 — refine your search</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Section 4: Initial Status ─── */}
                        <div className="p-5 sm:p-6 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                                <h2 className="font-bold text-gray-800 text-sm sm:text-base">Initial Status</h2>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {STATUSES.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => setStatus(s.value as typeof status)}
                                        className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold transition-all ${status === s.value
                                            ? s.color + ' border-current scale-[1.02] shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ─── Summary Preview ─── */}
                        {(selectedWorkType || selectedEmployee || selectedCustomer) && (
                            <div className="mx-5 sm:mx-6 my-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FileText size={12} /> Task Summary
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div>
                                        <p className="text-gray-400">Work Type</p>
                                        <p className="font-semibold text-gray-700">{selectedWorkType?.label || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Status</p>
                                        <p className="font-semibold text-gray-700 capitalize">{status}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 flex items-center gap-1"><User size={10} /> Assigned To</p>
                                        <p className="font-semibold text-gray-700">{selectedEmployee?.name || '—'}</p>
                                        {selectedEmployee && <p className="text-[10px] text-gray-400">{selectedEmployee.employee_role}</p>}
                                    </div>
                                    <div>
                                        <p className="text-gray-400 flex items-center gap-1"><Users size={10} /> Customer</p>
                                        <p className="font-semibold text-gray-700">{selectedCustomer?.applicant_name || '—'}</p>
                                        {selectedCustomer && <p className="text-[10px] text-gray-400">APP-{selectedCustomer.id}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── Actions ─── */}
                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-blue hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting
                                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
                                    : <><ClipboardPlus size={16} /> Create Task</>
                                }
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="sm:w-auto px-6 py-3 border-2 border-gray-200 text-gray-600 bg-white hover:bg-gray-50 font-bold rounded-xl text-sm transition-all"
                            >
                                Reset
                            </button>
                        </div>

                    </form>
                )}
            </div>

            {/* Click-outside handler for dropdowns */}
            {(wtOpen || empOpen || custOpen) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => { setWtOpen(false); setEmpOpen(false); setCustOpen(false) }}
                />
            )}
        </div>
    )
}

export default CreateTask
