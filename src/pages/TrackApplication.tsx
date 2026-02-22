import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, Search, Filter, ChevronDown, ChevronUp, CheckCircle2, Loader2, Clock, Circle, Minus, MapPin, Phone, User } from 'lucide-react'

// All possible work types in order (matching backend Tasks.js)
const WORK_TYPES = [
    { key: 'customer_data_gathering', label: 'Data Collection' },
    { key: 'finance_registration', label: 'Finance Reg' },
    { key: 'submit_finance_to_bank', label: 'Submit to Bank' },
    { key: 'complete_registration', label: 'Registration' },
    { key: 'cot_request', label: 'COT Request' },
    { key: 'name_correction_request', label: 'Name Correction' },
    { key: 'load_request', label: 'Load Request' },
    { key: 'hard_copy_indent_creation', label: 'Indent Creation' },
    { key: 'submit_indent_to_electrical_department', label: 'Submit Indent' },
    { key: 'meter_installation', label: 'Meter Install' },
    { key: 'collect_remaining_amount', label: 'Payment Collection' },
    { key: 'generate_bill', label: 'Bill Generation' },
    { key: 'approval_of_payment_collection', label: 'Payment Approval' },
    { key: 'plant_installation', label: 'Plant Installation' },
    { key: 'approval_of_plant_installation', label: 'Installation Approval' },
    { key: 'take_installed_item_photos', label: 'Take Photos' },
    { key: 'upload_installed_item_serial_number', label: 'Upload Serial No' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'create_cdr', label: 'Create CDR' },
    { key: 'apply_subsidy', label: 'Apply Subsidy' },
    { key: 'subsidy_redemption', label: 'Subsidy Redemption' },
    { key: 'document_handover', label: 'Document Handover' },
    { key: 'quality_assurance', label: 'Quality Assurance' },
    { key: 'submit_warranty_document', label: 'Submit Warranty' },
    { key: 'assign_qa', label: 'Assign QA' },
]

// Work types that are conditional on customer data
const CONDITIONAL_WORK_TYPES = new Set([
    'finance_registration',
    'submit_finance_to_bank',
    'cot_request',
    'name_correction_request',
    'load_request',
    'collect_remaining_amount',
])

// Phase groupings for the pipeline panel (all Tailwind classes are full static strings)
const PIPELINE_PHASES = [
    {
        id: 'initiation',
        label: 'Initiation',
        emoji: '📋',
        numBg: 'bg-blue-500',
        spineBg: 'bg-blue-200',
        connectorBg: 'bg-blue-300',
        progressFill: 'bg-blue-500',
        countText: 'text-blue-600',
        workTypes: ['customer_data_gathering'],
    },
    {
        id: 'registration',
        label: 'Registration & Compliance',
        emoji: '📝',
        numBg: 'bg-indigo-500',
        spineBg: 'bg-indigo-200',
        connectorBg: 'bg-indigo-300',
        progressFill: 'bg-indigo-500',
        countText: 'text-indigo-600',
        workTypes: ['complete_registration', 'cot_request', 'name_correction_request', 'load_request', 'finance_registration', 'submit_finance_to_bank'],
    },
    {
        id: 'electrical',
        label: 'Indent & Metering Installation',
        emoji: '🔌',
        numBg: 'bg-amber-500',
        spineBg: 'bg-amber-200',
        connectorBg: 'bg-amber-300',
        progressFill: 'bg-amber-500',
        countText: 'text-amber-600',
        workTypes: ['hard_copy_indent_creation', 'submit_indent_to_electrical_department', 'meter_installation'],
    },
    {
        id: 'payment',
        label: 'Payment & Billing',
        emoji: '💰',
        numBg: 'bg-green-500',
        spineBg: 'bg-green-200',
        connectorBg: 'bg-green-300',
        progressFill: 'bg-green-500',
        countText: 'text-green-600',
        workTypes: ['collect_remaining_amount', 'approval_of_payment_collection', 'generate_bill', 'create_cdr'],
    },
    {
        id: 'installation',
        label: 'Installation & Documentation',
        emoji: '🏗️',
        numBg: 'bg-purple-500',
        spineBg: 'bg-purple-200',
        connectorBg: 'bg-purple-300',
        progressFill: 'bg-purple-500',
        countText: 'text-purple-600',
        workTypes: ['approval_of_plant_installation', 'plant_installation', 'take_installed_item_photos', 'upload_installed_item_serial_number'],
    },
    {
        id: 'verification',
        label: 'Verification & Handover',
        emoji: '✅',
        numBg: 'bg-emerald-500',
        spineBg: 'bg-emerald-200',
        connectorBg: 'bg-emerald-300',
        progressFill: 'bg-emerald-500',
        countText: 'text-emerald-600',
        workTypes: ['inspection', 'apply_subsidy', 'subsidy_redemption', 'assign_qa', 'quality_assurance', 'submit_warranty_document', 'document_handover'],
    },
]

interface Task {
    id: number
    work: string
    work_type: string
    status: 'pending' | 'inprogress' | 'completed'
    assigned_to_name: string
    assigned_to_role: string
    created_at: string
}

interface Customer {
    id: number
    applicant_name: string
    mobile_number: string
    district: string
    application_status: string
    plant_size_kw: number
    plant_price: number
    tasks: Task[]
    payment_mode?: string
    special_finance_required?: string
    name_correction_required?: string
    load_enhancement_required?: string
    cot_required?: string
    email_id?: string
    aadhaar_number?: string
    installation_pincode?: string
    site_address?: string
    solar_system_type?: string
    solar_plant_type?: string
    roof_type?: string
    plant_category?: string
    margin_money?: number
    created_at?: string
    created_by_name?: string
    created_by_role?: string
}

function TrackApplication() {
    const { token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE

    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [districtFilter, setDistrictFilter] = useState('all')
    const [createdByFilter, setCreatedByFilter] = useState('all')
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (token) {
            fetchCustomersWithTasks()
        }
    }, [token])

    const fetchCustomersWithTasks = async () => {
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE}/registered-customers/with-tasks?limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (res.ok) {
                const data = await res.json()
                setCustomers(data.data || [])
            }
        } catch (err) {
            console.error('Error fetching customers:', err)
        } finally {
            setLoading(false)
        }
    }

    // Get task status for a specific work type
    const getTaskStatus = (customer: Customer, workType: string): 'completed' | 'inprogress' | 'pending' | 'not_applicable' | 'not_started' => {
        const task = customer.tasks?.find(t => t.work_type === workType)

        if (!task) {
            // Check if task is not applicable based on customer data
            if ((workType === 'finance_registration' || workType === 'submit_finance_to_bank') && customer.payment_mode !== 'Finance' && customer.special_finance_required !== 'Yes') {
                return 'not_applicable'
            }
            if (workType === 'collect_remaining_amount' && (customer.payment_mode === 'Finance' || customer.special_finance_required === 'Yes')) {
                return 'not_applicable'
            }
            if (workType === 'cot_request' && customer.cot_required !== 'Required') {
                return 'not_applicable'
            }
            if (workType === 'name_correction_request' && customer.name_correction_required !== 'Required') {
                return 'not_applicable'
            }
            if (workType === 'load_request' && customer.load_enhancement_required !== 'Required') {
                return 'not_applicable'
            }
            return 'not_started'
        }

        return task.status
    }

    // Calculate progress percentage
    const calculateProgress = (customer: Customer): number => {
        let total = 0
        let completed = 0

        WORK_TYPES.forEach(wt => {
            const status = getTaskStatus(customer, wt.key)
            if (status !== 'not_applicable') {
                total++
                if (status === 'completed') {
                    completed++
                }
            }
        })

        return total > 0 ? Math.round((completed / total) * 100) : 0
    }

    const uniqueDistricts = Array.from(new Set(customers.map(c => c.district).filter(Boolean))).sort()
    const uniqueCreatedBy = Array.from(new Set(customers.map(c => c.created_by_name).filter(Boolean))).sort()

    // Filter customers
    const filteredCustomers = customers.filter(customer => {
        const matchesSearch =
            customer.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.mobile_number?.includes(searchTerm) ||
            customer.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(customer.id).includes(searchTerm)

        const matchesDistrict = districtFilter === 'all' || customer.district === districtFilter
        const matchesCreatedBy = createdByFilter === 'all' || customer.created_by_name === createdByFilter

        if (filterStatus === 'all') return matchesSearch && matchesDistrict && matchesCreatedBy

        const progress = calculateProgress(customer)
        if (filterStatus === 'completed' && progress === 100) return matchesSearch && matchesDistrict && matchesCreatedBy
        if (filterStatus === 'in-progress' && progress > 0 && progress < 100) return matchesSearch && matchesDistrict && matchesCreatedBy
        if (filterStatus === 'pending' && progress === 0) return matchesSearch && matchesDistrict && matchesCreatedBy

        return false
    })

    // Status badge component
    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-500 text-white border-2 border-green-600 shadow-sm',
            inprogress: 'bg-yellow-400 text-gray-900 border-2 border-yellow-500 shadow-sm font-bold',
            pending: 'bg-orange-400 text-white border-2 border-orange-500 shadow-sm',
            not_started: 'bg-blue-500 text-white border-2 border-blue-600 shadow-sm',
            not_applicable: 'bg-gray-300 text-gray-700 border-2 border-gray-400',
        }

        const labels: Record<string, string> = {
            completed: '✓',
            inprogress: '●',
            pending: '⏸',
            not_started: '○',
            not_applicable: 'N/A',
        }

        return (
            <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-lg ${styles[status] || styles.pending}`}>
                {labels[status] || '○'}
            </span>
        )
    }

    const handleRowClick = (customer: Customer) => {
        setSelectedCustomer(customer)
        setShowCustomerModal(true)
        // Auto-collapse fully completed phases
        const initialCollapsed = new Set<string>()
        PIPELINE_PHASES.forEach(phase => {
            const applicable = phase.workTypes.filter(wt => getTaskStatus(customer, wt) !== 'not_applicable')
            const allDone = applicable.length > 0 && applicable.every(wt => getTaskStatus(customer, wt) === 'completed')
            if (allDone) initialCollapsed.add(phase.id)
        })
        setCollapsedPhases(initialCollapsed)
    }

    // Centralized modal close
    const closeModal = () => {
        setShowCustomerModal(false)
        setSelectedCustomer(null)
    }

    // Lock body scroll when modal is open
    useEffect(() => {
        if (showCustomerModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [showCustomerModal])

    // Close modal on Escape key
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal()
        }
        if (showCustomerModal) {
            window.addEventListener('keydown', onKeyDown)
        }
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [showCustomerModal])

    // Circular SVG progress ring used in the slide-over header
    const ProgressRing = ({ progress }: { progress: number }) => {
        const r = 22
        const circ = 2 * Math.PI * r
        const offset = circ * (1 - progress / 100)
        const color = progress === 100 ? '#22c55e' : progress > 50 ? '#3b82f6' : '#f97316'
        return (
            <div className="relative w-14 h-14">
                <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                    <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
                    <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-gray-800">{progress}%</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 p-2 sm:p-4 md:p-6">
            <div className="max-w-[1600px] mx-auto">

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border-l-4 border-blue-500">
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{customers.length}</p>
                    </div>
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border-l-4 border-green-500">
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Completed</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                            {customers.filter(c => calculateProgress(c) === 100).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border-l-4 border-blue-500">
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">In Progress</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
                            {customers.filter(c => { const p = calculateProgress(c); return p > 0 && p < 100; }).length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 border-l-4 border-red-500">
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Pending</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                            {customers.filter(c => calculateProgress(c) === 0).length}
                        </p>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, mobile, district, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:gap-2 md:flex md:gap-2">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-slate-800 text-white ring-2 ring-slate-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('completed')}
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Done
                            </button>
                            <button
                                onClick={() => setFilterStatus('in-progress')}
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'in-progress' ? 'bg-indigo-700 text-white ring-2 ring-indigo-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setFilterStatus('pending')}
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'pending' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Pending
                            </button>
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading applications...</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Filter size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No applications found</p>
                            <p className="text-sm mt-2">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto relative">
                            <table className="w-full min-w-max text-xs border-separate border-spacing-0">
                                <thead className="sticky top-0 z-30">
                                    <tr>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold sticky left-0 z-40 shadow-md border-r border-gray-300 bg-[#BFC6C4] text-[#30364F]">Customer Name</th>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold border-l border-gray-300" style={{ backgroundColor: '#F5E7C6', color: '#0C2C55' }}>
                                            <div className="flex flex-col gap-1">
                                                <span>Created By</span>
                                                <select
                                                    value={createdByFilter}
                                                    onChange={(e) => setCreatedByFilter(e.target.value)}
                                                    className="w-full max-w-[160px] rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
                                                >
                                                    <option value="all">All</option>
                                                    {uniqueCreatedBy.map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </th>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold border-l border-gray-300" style={{ backgroundColor: '#FFFDE1', color: '#233D4D' }}>Mobile Number</th>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold border-l border-gray-300" style={{ backgroundColor: '#BFC6C4', color: '#30364F' }}>
                                            <div className="flex flex-col gap-1">
                                                <span>District</span>
                                                <select
                                                    value={districtFilter}
                                                    onChange={(e) => setDistrictFilter(e.target.value)}
                                                    className="w-full max-w-[140px] rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
                                                >
                                                    <option value="all">All</option>
                                                    {uniqueDistricts.map(d => (
                                                        <option key={d} value={d}>{d}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </th>
                                        <th className="px-3 sm:px-4 py-4 text-center font-bold border-l border-gray-300" style={{ backgroundColor: '#F5E7C6', color: '#0F2854' }}>Progress</th>
                                        {WORK_TYPES.map((wt, idx) => (
                                            <th key={wt.key} className="px-2 sm:px-3 py-4 text-center font-bold whitespace-nowrap border-l border-gray-300"
                                                style={{
                                                    backgroundColor: idx % 3 === 0 ? '#F5E7C6' : idx % 3 === 1 ? '#FFFDE1' : '#BFC6C4',
                                                    color: idx % 4 === 0 ? '#30364F' : idx % 4 === 1 ? '#0C2C55' : idx % 4 === 2 ? '#233D4D' : '#0F2854'
                                                }}
                                                title={wt.label}>
                                                {wt.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((customer, idx) => {
                                        const progress = calculateProgress(customer)
                                        return (
                                            <tr
                                                key={customer.id}
                                                onClick={() => handleRowClick(customer)}
                                                className={`border-b-2 border-gray-200 hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                            >
                                                <td className={`px-3 sm:px-4 py-4 sticky left-0 z-10 shadow-sm border-r border-gray-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                    <div className="font-bold text-gray-900 whitespace-nowrap">{customer.applicant_name}</div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-4 text-gray-800 whitespace-nowrap border-l border-gray-300 font-medium">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-semibold text-gray-900">{customer.created_by_name}</span>
                                                        <span className="text-xs text-gray-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit">{customer.created_by_role}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 sm:px-4 py-4 text-gray-800 whitespace-nowrap border-l border-gray-300 font-medium">{customer.mobile_number}</td>
                                                <td className="px-3 sm:px-4 py-4 text-gray-800 border-l border-gray-300 font-medium">{customer.district}</td>
                                                <td className="px-3 sm:px-4 py-4 border-l border-gray-300">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-20 sm:w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${progress === 100 ? 'text-green-600' : progress > 50 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                </td>
                                                {WORK_TYPES.map(wt => {
                                                    const status = getTaskStatus(customer, wt.key)
                                                    const task = customer.tasks?.find(t => t.work_type === wt.key)
                                                    return (
                                                        <td key={wt.key} className="px-2 sm:px-3 py-4 text-center border-l border-gray-300">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <StatusBadge status={status} />
                                                                {task && (
                                                                    <>
                                                                        {task.created_at && (
                                                                            <span className="text-[10px] text-gray-600">
                                                                                {new Date(task.created_at).toLocaleDateString('en-GB')}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[9px] text-gray-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                                            {task.assigned_to_name}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 sm:space-y-4">
                    {loading ? (
                        <div className="bg-white rounded-lg p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600 text-sm">Loading applications...</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                            <Filter size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-base font-medium">No applications found</p>
                            <p className="text-xs mt-2">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        filteredCustomers.map((customer) => {
                            const progress = calculateProgress(customer)
                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => handleRowClick(customer)}
                                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 overflow-hidden"
                                >
                                    {/* Card Header */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 border-b border-gray-200">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-900 text-sm sm:text-base break-words">{customer.applicant_name}</h3>
                                                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">{customer.mobile_number}</p>
                                            </div>
                                            <span className="text-xs sm:text-sm font-semibold bg-blue-600 text-white px-2 py-1 rounded whitespace-nowrap">
                                                APP-{customer.id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">{customer.district}</p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-700">Progress</span>
                                            <span className={`text-sm font-bold ${progress === 100 ? 'text-green-600' : progress > 50 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                {progress}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Status Summary */}
                                    <div className="px-3 sm:px-4 py-3">
                                        <div className="grid grid-cols-3 gap-2 mb-3">
                                            <div className="bg-green-50 rounded p-2 text-center">
                                                <p className="text-xs text-gray-600">Completed</p>
                                                <p className="text-lg font-bold text-green-600">
                                                    {customer.tasks?.filter(t => t.status === 'completed').length || 0}
                                                </p>
                                            </div>
                                            <div className="bg-yellow-50 rounded p-2 text-center">
                                                <p className="text-xs text-gray-600">In Progress</p>
                                                <p className="text-lg font-bold text-yellow-600">
                                                    {customer.tasks?.filter(t => t.status === 'inprogress').length || 0}
                                                </p>
                                            </div>
                                            <div className="bg-orange-50 rounded p-2 text-center">
                                                <p className="text-xs text-gray-600">Pending</p>
                                                <p className="text-lg font-bold text-orange-600">
                                                    {customer.tasks?.filter(t => t.status === 'pending').length || 0}
                                                </p>
                                            </div>
                                        </div>

                                        {/* View Details Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRowClick(customer)
                                            }}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                                        >
                                            View Full Details
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Legend */}
                <div className="hidden md:block bg-white rounded-xl shadow-lg p-4 mt-4">
                    <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <StatusBadge status="completed" />
                            <span className="text-gray-700 font-medium">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status="inprogress" />
                            <span className="text-gray-700 font-medium">In Progress (Highlighted)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status="pending" />
                            <span className="text-gray-700 font-medium">Pending</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status="not_started" />
                            <span className="text-gray-700 font-medium">Not Started</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status="not_applicable" />
                            <span className="text-gray-700 font-medium">Not Required</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customer Details Slide-Over Panel */}
            {showCustomerModal && selectedCustomer && (
                <>
                    <style>{`
                        @keyframes slideInRight {
                            from { transform: translateX(100%); }
                            to   { transform: translateX(0); }
                        }
                        .slide-panel { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    `}</style>

                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/50 z-[1000]" onClick={closeModal} />

                    {/* Slide-over panel */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pipeline-title"
                        className="slide-panel fixed right-0 top-0 bottom-0 w-full md:w-[65%] lg:w-[60%] bg-gray-50 z-[1001] shadow-2xl flex flex-col"
                    >
                        {/* ── Sticky Header ── */}
                        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex-shrink-0 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">APP-{selectedCustomer.id}</span>
                                        {calculateProgress(selectedCustomer) === 100 && (
                                            <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-md">✓ COMPLETED</span>
                                        )}
                                        {calculateProgress(selectedCustomer) > 0 && calculateProgress(selectedCustomer) < 100 && (
                                            <span className="text-xs font-bold bg-amber-400 text-gray-900 px-2 py-0.5 rounded-md">ACTIVE</span>
                                        )}
                                    </div>
                                    <h2 id="pipeline-title" className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{selectedCustomer.applicant_name}</h2>
                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <Phone size={11} className="text-gray-400" /> {selectedCustomer.mobile_number}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin size={11} className="text-gray-400" /> {selectedCustomer.district}
                                        </span>
                                        {selectedCustomer.plant_size_kw && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {selectedCustomer.plant_size_kw} kW · {selectedCustomer.solar_system_type || 'Solar'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Progress ring + close */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <ProgressRing progress={calculateProgress(selectedCustomer)} />
                                    <button
                                        onClick={closeModal}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800"
                                        aria-label="Close"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Scrollable Pipeline Body ── */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
                            {PIPELINE_PHASES.map((phase, phaseIdx) => {
                                const isCollapsed = collapsedPhases.has(phase.id)
                                const applicable = phase.workTypes.filter(wt => getTaskStatus(selectedCustomer, wt) !== 'not_applicable')
                                const completedCount = applicable.filter(wt => getTaskStatus(selectedCustomer, wt) === 'completed').length
                                const hasInProgress = phase.workTypes.some(wt => getTaskStatus(selectedCustomer, wt) === 'inprogress')
                                const allDone = applicable.length > 0 && completedCount === applicable.length

                                return (
                                    <div key={phase.id}>
                                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                                            {/* Phase Header */}
                                            <button
                                                type="button"
                                                className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${allDone ? 'bg-green-50 hover:bg-green-100'
                                                    : hasInProgress ? 'bg-amber-50 hover:bg-amber-100'
                                                        : 'bg-white hover:bg-gray-50'
                                                    }`}
                                                onClick={() => setCollapsedPhases(prev => {
                                                    const next = new Set(prev)
                                                    if (next.has(phase.id)) next.delete(phase.id)
                                                    else next.add(phase.id)
                                                    return next
                                                })}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${phase.numBg}`}>
                                                        {phaseIdx + 1}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm">{phase.emoji}</span>
                                                        <span className="font-semibold text-gray-800 text-sm">{phase.label}</span>
                                                        {allDone && <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">ALL DONE</span>}
                                                        {hasInProgress && !allDone && <span className="text-[10px] font-bold bg-amber-400 text-gray-900 px-1.5 py-0.5 rounded-full">ACTIVE</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className="hidden sm:block w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${phase.progressFill}`}
                                                            style={{ width: applicable.length > 0 ? `${Math.round((completedCount / applicable.length) * 100)}%` : '0%' }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-semibold ${phase.countText}`}>{completedCount}/{applicable.length}</span>
                                                    {isCollapsed
                                                        ? <ChevronDown size={15} className="text-gray-400" />
                                                        : <ChevronUp size={15} className="text-gray-400" />
                                                    }
                                                </div>
                                            </button>

                                            {/* Phase Body */}
                                            {!isCollapsed && (
                                                <div className="px-3 pt-2 pb-4">
                                                    <div className="relative">
                                                        {/* Vertical spine */}
                                                        <div className={`absolute left-[19px] top-2 bottom-0 w-0.5 ${phase.spineBg}`} />
                                                        <div className="space-y-3">
                                                            {phase.workTypes.map(workTypeKey => {
                                                                const status = getTaskStatus(selectedCustomer, workTypeKey)
                                                                const task = selectedCustomer.tasks?.find(t => t.work_type === workTypeKey)
                                                                const wt = WORK_TYPES.find(w => w.key === workTypeKey)!
                                                                const isConditional = CONDITIONAL_WORK_TYPES.has(workTypeKey)
                                                                const isNA = status === 'not_applicable'

                                                                const dotClass = isNA
                                                                    ? 'bg-gray-300 border-gray-300'
                                                                    : status === 'completed' ? 'bg-green-500 border-green-500'
                                                                        : status === 'inprogress' ? 'bg-yellow-400 border-yellow-500 ring-2 ring-yellow-200 ring-offset-1'
                                                                            : status === 'pending' ? 'bg-orange-400 border-orange-400'
                                                                                : 'bg-white border-blue-400'

                                                                const cardBorderL = isNA
                                                                    ? 'border-l-gray-300'
                                                                    : status === 'completed' ? 'border-l-green-500'
                                                                        : status === 'inprogress' ? 'border-l-yellow-400'
                                                                            : status === 'pending' ? 'border-l-orange-400'
                                                                                : 'border-l-blue-400'

                                                                const cardBg = isNA
                                                                    ? 'bg-gray-50'
                                                                    : status === 'completed' ? 'bg-green-50/60'
                                                                        : status === 'inprogress' ? 'bg-yellow-50'
                                                                            : status === 'pending' ? 'bg-orange-50/40'
                                                                                : 'bg-white'

                                                                const statusLabel = isNA ? 'Skipped'
                                                                    : status === 'completed' ? 'Completed'
                                                                        : status === 'inprogress' ? 'In Progress'
                                                                            : status === 'pending' ? 'Pending'
                                                                                : 'Not Started'

                                                                const statusLabelColor = isNA ? 'text-gray-400'
                                                                    : status === 'completed' ? 'text-green-600'
                                                                        : status === 'inprogress' ? 'text-yellow-600'
                                                                            : status === 'pending' ? 'text-orange-500'
                                                                                : 'text-blue-500'

                                                                const statusIcon = isNA
                                                                    ? <Minus size={13} className="text-gray-400 flex-shrink-0" />
                                                                    : status === 'completed' ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                                                                        : status === 'inprogress' ? <Loader2 size={13} className="text-yellow-600 animate-spin flex-shrink-0" />
                                                                            : status === 'pending' ? <Clock size={13} className="text-orange-500 flex-shrink-0" />
                                                                                : <Circle size={13} className="text-blue-400 flex-shrink-0" />

                                                                return (
                                                                    <div key={workTypeKey} className="relative flex items-start pl-10">
                                                                        {/* Dot on spine */}
                                                                        <div className={`absolute left-[15px] top-4 w-[9px] h-[9px] rounded-full border-2 z-10 ${dotClass}`} />
                                                                        {/* Connector */}
                                                                        {isNA ? (
                                                                            <div className="absolute left-6 top-5 w-4 border-t-2 border-dashed border-gray-300" />
                                                                        ) : (
                                                                            <div className={`absolute left-6 top-5 w-4 h-px ${phase.connectorBg}`} />
                                                                        )}
                                                                        {/* Task Card */}
                                                                        <div
                                                                            className={`w-full rounded-lg border border-l-4 p-2.5 sm:p-3 transition-shadow ${cardBorderL} ${cardBg} ${isNA ? 'opacity-60' : ''} ${status === 'inprogress' ? 'shadow-md' : 'shadow-sm'} hover:shadow-md`}
                                                                            title={task?.work || wt?.label}
                                                                        >
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                                    {statusIcon}
                                                                                    <span className={`font-semibold text-xs sm:text-sm text-gray-800 leading-snug ${isNA ? 'line-through' : ''}`}>
                                                                                        {wt?.label}
                                                                                    </span>
                                                                                    {isConditional && !isNA && (
                                                                                        <span className="hidden sm:inline text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 whitespace-nowrap">
                                                                                            Conditional
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className={`text-[10px] font-semibold whitespace-nowrap flex-shrink-0 ${statusLabelColor}`}>
                                                                                    {statusLabel}
                                                                                </span>
                                                                            </div>
                                                                            {task && !isNA && (
                                                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                                                    <div className="flex items-center gap-1 bg-white rounded border border-gray-200 px-1.5 py-0.5">
                                                                                        <User size={10} className="text-gray-400" />
                                                                                        <span className="text-[11px] font-semibold text-gray-700">{task.assigned_to_name}</span>
                                                                                        <span className="text-[10px] text-gray-400">·</span>
                                                                                        <span className="text-[10px] text-gray-500">{task.assigned_to_role}</span>
                                                                                    </div>
                                                                                    {task.created_at && (
                                                                                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                            {new Date(task.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            {isNA && (
                                                                                <p className="text-[10px] text-gray-400 mt-1">Not applicable for this customer</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dashed connector between phases */}
                                        {phaseIdx < PIPELINE_PHASES.length - 1 && (
                                            <div className="flex justify-center py-0.5">
                                                <div className="w-px h-4 border-l-2 border-dashed border-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default TrackApplication
