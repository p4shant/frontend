import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, Eye, Search, Filter } from 'lucide-react'

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
}

function TrackApplication() {
    const { token } = useAuth()
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://srv1304976.hstgr.cloud:3000/api'

    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [showCustomerModal, setShowCustomerModal] = useState(false)

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

    // Filter customers
    const filteredCustomers = customers.filter(customer => {
        const matchesSearch =
            customer.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.mobile_number?.includes(searchTerm) ||
            customer.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(customer.id).includes(searchTerm)

        if (filterStatus === 'all') return matchesSearch

        const progress = calculateProgress(customer)
        if (filterStatus === 'completed' && progress === 100) return matchesSearch
        if (filterStatus === 'in-progress' && progress > 0 && progress < 100) return matchesSearch
        if (filterStatus === 'pending' && progress === 0) return matchesSearch

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
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
                                className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold sticky left-0 z-10 shadow-md" style={{ backgroundColor: '#BFC6C4', color: '#30364F' }}>Customer Name</th>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold border-l border-gray-300" style={{ backgroundColor: '#F5E7C6', color: '#0C2C55' }}>Mobile Number</th>
                                        <th className="px-3 sm:px-4 py-4 text-left font-bold border-l border-gray-300" style={{ backgroundColor: '#FFFDE1', color: '#233D4D' }}>District</th>
                                        <th className="px-3 sm:px-4 py-4 text-center font-bold border-l border-gray-300" style={{ backgroundColor: '#BFC6C4', color: '#0F2854' }}>Progress</th>
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
                                                className={`border-b-2 border-gray-200 hover:bg-blue-50 hover:shadow-md cursor-pointer transition-all duration-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                            >
                                                <td className="px-3 sm:px-4 py-4 sticky left-0 bg-inherit z-10 shadow-sm">
                                                    <div className="font-bold text-gray-900 whitespace-nowrap">{customer.applicant_name}</div>
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
                                                                {task?.created_at && (
                                                                    <span className="text-[10px] text-gray-600">
                                                                        Assigned on {new Date(task.created_at).toLocaleDateString('en-GB')}
                                                                    </span>
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

            {/* Customer Details Modal */}
            {showCustomerModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-2 sm:p-4" onClick={closeModal}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="customer-details-title"
                        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-xl md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-blue px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <Eye size={20} className="text-white flex-shrink-0 sm:w-6 sm:h-6" />
                                <h3 id="customer-details-title" className="text-sm sm:text-xl font-bold bg-[#F6F0D7] text-gray-900 px-2 sm:px-3 py-1 rounded truncate">
                                    {selectedCustomer.applicant_name}
                                </h3>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors flex-shrink-0 ml-2"
                            >
                                <X size={20} className="sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                            {/* Top Stats Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase mb-1">Application ID</p>
                                    <p className="text-base sm:text-lg font-bold text-gray-800">APP-{selectedCustomer.id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase mb-1">Progress</p>
                                    <p className="text-base sm:text-lg font-bold text-blue-600">{calculateProgress(selectedCustomer)}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase mb-1">Status</p>
                                    <p className="text-base sm:text-lg font-bold text-green-600">{calculateProgress(selectedCustomer) === 100 ? 'DONE' : calculateProgress(selectedCustomer) > 0 ? 'ACTIVE' : 'PENDING'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase mb-1">Date</p>
                                    <p className="text-base sm:text-lg font-bold text-gray-800">{selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div>
                                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">👤</span> <span className="hidden sm:inline">Personal Information</span><span className="sm:hidden">Personal Info</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Name</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{selectedCustomer.applicant_name}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Mobile</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.mobile_number}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Email</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{selectedCustomer.email_id || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Aadhaar</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.aadhaar_number || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">District</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.district}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Pincode</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.installation_pincode || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3 col-span-1 sm:col-span-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Site Address</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base break-words">{selectedCustomer.site_address || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Plant Details */}
                            <div>
                                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">⚡</span> <span className="hidden sm:inline">Plant Details</span><span className="sm:hidden">Plant Info</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Solar Type</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.solar_system_type || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Size</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.plant_size_kw} kW</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Roof Type</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.roof_type || '-'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Price</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">₹{selectedCustomer.plant_price?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Margin</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">₹{selectedCustomer.margin_money?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium mb-1">Payment</p>
                                        <p className="text-gray-900 font-semibold text-sm sm:text-base">{selectedCustomer.payment_mode || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Progress */}
                            <div>
                                <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">📋</span> <span className="hidden sm:inline">Workflow Progress</span><span className="sm:hidden">Workflow</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    {WORK_TYPES.map(wt => {
                                        const status = getTaskStatus(selectedCustomer, wt.key)
                                        const task = selectedCustomer.tasks?.find(t => t.work_type === wt.key)
                                        return (
                                            <div key={wt.key} className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                                    <span className="text-xs sm:text-sm font-medium text-gray-700 break-words">{wt.label}</span>
                                                    <StatusBadge status={status} />
                                                </div>
                                                {task?.created_at && (
                                                    <span className="text-[9px] sm:text-[10px] text-gray-600 block">
                                                        {new Date(task.created_at).toLocaleDateString('en-GB')}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TrackApplication
