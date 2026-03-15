import { useEffect, useState } from 'react'
import { registeredCustomersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

type FormState = {
    applicant_name: string;
    mobile_number: string;
    email_id: string;
    solar_plant_type: string;
    solar_system_type: string;
    plant_category: string;
    plant_size_kw: string;
    plant_price: string;
    district: string;
    installation_pincode: string;
    site_address: string;
    site_latitude: string;
    site_longitude: string;
    meter_type: string;
    name_correction_required: string;
    correct_name: string;
    load_enhancement_required: string;
    current_load: string;
    required_load: string;
    cot_required: string;
    cot_type: string;
    cot_documents: string;
    payment_mode: string;
    advance_payment_mode: string;
    upi_type: string;
    margin_money: string;
    special_finance_required: string;
    building_floor_number: string;
    structure_type: string;
    structure_length: string;
    structure_height: string;
    free_shadow_area: string;
    installation_date_feasible: string;
    application_status: string;
    [key: string]: string | boolean | File | null;
};

/** Determine preview type from a URL's extension (for existing server-stored files). */
const getFileTypeFromUrl = (url: string): 'image' | 'pdf' | 'other' => {
    if (!url) return 'image'
    const lower = url.toLowerCase().split('?')[0]
    if (lower.endsWith('.pdf')) return 'pdf'
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return 'image'
    return 'image' // default – blob URLs carry no extension, rely on fileTypes state
}

export default function RegisterCustomerForm({
    session = { employeeId: '', name: '' },
    applicationId = null,
    preFilledData = null,
    onSuccess,
    onCancel
}: {
    session?: { employeeId: string; name: string };
    applicationId?: string | null;
    preFilledData?: any;
    onSuccess?: (customerId?: number) => void;
    onCancel?: () => void;
}) {
    const { token } = useAuth()
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [locationLoading, setLocationLoading] = useState(false)
    const [prefillLoading, setPrefillLoading] = useState(false)
    const [manualGps, setManualGps] = useState(false)

    const isEditMode = Boolean(applicationId)

    const UP_DISTRICTS = [
        'Ghazipur',
        'Varanasi',
        'Azamgarh',
        'Mau',
        'Ballia',
        'Other'
    ]

    const [form, setForm] = useState<FormState>({
        // Applicant
        applicant_name: '',
        mobile_number: '',
        email_id: '',

        // Solar plant
        solar_plant_type: 'Residential',
        solar_system_type: 'TATA On-Grid',
        plant_category: 'Residential',
        plant_size_kw: '',
        plant_price: '',

        // Location
        district: '',
        installation_pincode: '',
        site_address: '',
        site_latitude: '',
        site_longitude: '',

        // Meter details
        meter_type: 'Electric Meter',

        // Special flags
        name_correction_required: 'Not Required',
        correct_name: '',
        load_enhancement_required: 'Not Required',
        current_load: '',
        required_load: '',

        // COT
        cot_required: 'No',
        cot_type: '',
        cot_documents: '',

        // Payment details
        payment_mode: 'Cash',
        advance_payment_mode: 'Cash',
        upi_type: 'Company',
        margin_money: '',
        special_finance_required: 'No',

        // Plant structure
        building_floor_number: '',
        structure_type: '',
        structure_length: '',
        structure_height: '',
        free_shadow_area: '',

        // Feasibility
        installation_date_feasible: '',

        // System
        application_status: 'DRAFT',
    })

    const [files, setFiles] = useState<Record<string, File | null>>({
        aadhaar_front: null,
        aadhaar_back: null,
        pan_card: null,
        electric_bill: null,
        ceiling_paper_photo: null,
        cancel_cheque: null,
        site_image_gps: null,
    })

    const [cotFiles, setCotFiles] = useState<{
        death_certificate: File | null;
        house_papers: File | null;
        passport_photo: File | null;
        family_registration: File | null;
        aadhaar_photos: (File | null)[];
        live_to_live_aadhaar_1: File | null;
        live_to_live_aadhaar_2: File | null;
    }>({
        death_certificate: null,
        house_papers: null,
        passport_photo: null,
        family_registration: null,
        aadhaar_photos: [],
        live_to_live_aadhaar_1: null,
        live_to_live_aadhaar_2: null
    })

    const [cotPreviews, setCotPreviews] = useState<{
        death_certificate: string | null;
        house_papers: string | null;
        passport_photo: string | null;
        family_registration: string | null;
        aadhaar_photos: (string | null)[];
        live_to_live_aadhaar_1: string | null;
        live_to_live_aadhaar_2: string | null;
    }>({
        death_certificate: null,
        house_papers: null,
        passport_photo: null,
        family_registration: null,
        aadhaar_photos: [],
        live_to_live_aadhaar_1: null,
        live_to_live_aadhaar_2: null
    })

    const [previews, setPreviews] = useState<Record<string, string | null>>({})
    const [fileTypes, setFileTypes] = useState<Record<string, 'image' | 'pdf' | 'other'>>({})
    const [cotFileTypes, setCotFileTypes] = useState<Record<string, 'image' | 'pdf' | 'other'>>({})
    const [previewModal, setPreviewModal] = useState<{ url: string; type: 'image' | 'pdf' | 'other'; label: string } | null>(null)
    const [creatorInfo, setCreatorInfo] = useState<{ name: string; role?: string; phone?: string } | null>(null)

    const normalizeSelectNumericValue = (value: any): string => {
        if (value === null || value === undefined || value === '') return ''
        const num = Number(value)
        if (Number.isNaN(num)) return String(value)
        return String(num)
    }

    // Auto-set payment mode to Finance when finance is required
    useEffect(() => {
        if (form.special_finance_required === 'Yes') {
            setForm(f => ({ ...f, payment_mode: 'Finance' }))
        }
    }, [form.special_finance_required])

    // Prefill existing application when editing a draft
    useEffect(() => {
        if (!isEditMode) return

        const loadApplication = async () => {
            try {
                setPrefillLoading(true)
                let data = preFilledData
                if (!data && applicationId) {
                    data = await registeredCustomersAPI.getById(applicationId!, token!)
                }
                if (!data) {
                    setMsg('Unable to load application for editing')
                    setPrefillLoading(false)
                    return
                }

                setForm((f) => ({
                    ...f,
                    applicant_name: data.applicant_name || '',
                    mobile_number: data.mobile_number || '',
                    email_id: data.email_id || '',
                    solar_plant_type: data.solar_plant_type || 'Residential',
                    solar_system_type: data.solar_system_type || 'TATA On-Grid',
                    plant_category: data.plant_category || 'Residential',
                    plant_size_kw: normalizeSelectNumericValue(data.plant_size_kw),
                    plant_price: data.plant_price || '',
                    district: data.district || '',
                    installation_pincode: data.installation_pincode || '',
                    site_address: data.site_address || '',
                    site_latitude: data.site_latitude || '',
                    site_longitude: data.site_longitude || '',
                    meter_type: data.meter_type || 'Electric Meter',
                    name_correction_required: data.name_correction_required || 'Not Required',
                    correct_name: data.correct_name || '',
                    load_enhancement_required: data.load_enhancement_required || 'Not Required',
                    current_load: data.current_load || '',
                    required_load: data.required_load || '',
                    cot_required: data.cot_required || 'No',
                    cot_type: data.cot_type || '',
                    cot_documents: data.cot_documents || '',
                    payment_mode: data.payment_mode || 'Cash',
                    advance_payment_mode: data.advance_payment_mode || 'Cash',
                    upi_type: data.upi_type || 'Company',
                    margin_money: data.margin_money || '',
                    special_finance_required: data.special_finance_required || 'No',
                    building_floor_number: data.building_floor_number || '',
                    structure_type: data.structure_type || '',
                    structure_length: data.structure_length || '',
                    structure_height: data.structure_height || '',
                    free_shadow_area: data.free_shadow_area || '',
                    installation_date_feasible: data.installation_date_feasible ? String(data.installation_date_feasible).slice(0, 10) : '',
                    application_status: data.application_status || 'DRAFT',
                }))

                // Populate previews from existing document URLs
                const API_ORIGIN = import.meta.env.VITE_API_ORIGIN;
                // Helper to build full URL, handling both relative paths and already-full URLs
                const buildFullUrl = (url: string | null | undefined) => {
                    if (!url) return null;
                    // If URL already starts with http:// or https://, return as-is
                    if (url.startsWith('http://') || url.startsWith('https://')) {
                        return url;
                    }
                    // Otherwise, it's a relative path - prepend API origin
                    return `${API_ORIGIN}${url}`;
                };

                const existingPreviews: Record<string, string> = {}
                const aadhaarFrontUrl = buildFullUrl(data.aadhaar_front_url);
                const aadhaarBackUrl = buildFullUrl(data.aadhaar_back_url);
                const panCardUrl = buildFullUrl(data.pan_card_url);
                const electricBillUrl = buildFullUrl(data.electric_bill_url);
                const ceilingPaperUrl = buildFullUrl(data.ceiling_paper_photo_url);
                const cancelChequeUrl = buildFullUrl(data.cancel_cheque_url);
                const siteImageUrl = buildFullUrl(data.site_image_gps_url);
                const otherDocUrl = buildFullUrl(data.other_document_url);
                const buildingPhotoUrl = buildFullUrl(data.building_photo_url);
                const meterRoomUrl = buildFullUrl(data.meter_room_photo_url);
                const selfieUrl = buildFullUrl(data.selfie_url);

                if (aadhaarFrontUrl) existingPreviews.aadhaar_front = aadhaarFrontUrl;
                if (aadhaarBackUrl) existingPreviews.aadhaar_back = aadhaarBackUrl;
                if (panCardUrl) existingPreviews.pan_card = panCardUrl;
                if (electricBillUrl) existingPreviews.electric_bill = electricBillUrl;
                if (ceilingPaperUrl) existingPreviews.ceiling_paper_photo = ceilingPaperUrl;
                if (cancelChequeUrl) existingPreviews.cancel_cheque = cancelChequeUrl;
                if (siteImageUrl) existingPreviews.site_image_gps = siteImageUrl;
                if (otherDocUrl) existingPreviews.other_document = otherDocUrl;
                if (buildingPhotoUrl) existingPreviews.building_photo = buildingPhotoUrl;
                if (meterRoomUrl) existingPreviews.meter_room_photo = meterRoomUrl;
                if (selfieUrl) existingPreviews.selfie = selfieUrl;

                // Load COT documents if available
                const existingCotPreviews: typeof cotPreviews = {
                    death_certificate: null,
                    house_papers: null,
                    passport_photo: null,
                    family_registration: null,
                    aadhaar_photos: [],
                    live_to_live_aadhaar_1: null,
                    live_to_live_aadhaar_2: null
                };

                const cotDeathCertUrl = buildFullUrl(data.cot_death_certificate_url);
                const cotHousePapersUrl = buildFullUrl(data.cot_house_papers_url);
                const cotPassportPhotoUrl = buildFullUrl(data.cot_passport_photo_url);
                const cotFamilyRegUrl = buildFullUrl(data.cot_family_registration_url);
                const cotLiveAadhaar1Url = buildFullUrl(data.cot_live_aadhaar_1_url);
                const cotLiveAadhaar2Url = buildFullUrl(data.cot_live_aadhaar_2_url);

                if (cotDeathCertUrl) existingCotPreviews.death_certificate = cotDeathCertUrl;
                if (cotHousePapersUrl) existingCotPreviews.house_papers = cotHousePapersUrl;
                if (cotPassportPhotoUrl) existingCotPreviews.passport_photo = cotPassportPhotoUrl;
                if (cotFamilyRegUrl) existingCotPreviews.family_registration = cotFamilyRegUrl;
                if (cotLiveAadhaar1Url) existingCotPreviews.live_to_live_aadhaar_1 = cotLiveAadhaar1Url;
                if (cotLiveAadhaar2Url) existingCotPreviews.live_to_live_aadhaar_2 = cotLiveAadhaar2Url;

                // Handle COT aadhaar photos array
                if (data.cot_aadhaar_photos_urls) {
                    try {
                        const aadhaarPhotosUrls = typeof data.cot_aadhaar_photos_urls === 'string'
                            ? JSON.parse(data.cot_aadhaar_photos_urls)
                            : data.cot_aadhaar_photos_urls;
                        if (Array.isArray(aadhaarPhotosUrls)) {
                            existingCotPreviews.aadhaar_photos = aadhaarPhotosUrls.map((url: string) => buildFullUrl(url));
                        }
                    } catch (err) {
                        console.error('Error parsing COT aadhaar photos:', err);
                    }
                }

                if (Object.keys(existingPreviews).length > 0) {
                    setPreviews(existingPreviews)
                    // Infer file types from URL extensions so preview renders correctly
                    const existingFileTypes: Record<string, 'image' | 'pdf' | 'other'> = {}
                    for (const [key, url] of Object.entries(existingPreviews)) {
                        existingFileTypes[key] = getFileTypeFromUrl(url)
                    }
                    setFileTypes(existingFileTypes)
                }

                // Set COT previews if any COT documents exist
                const hasCotPreviews = Object.values(existingCotPreviews).some(val =>
                    Array.isArray(val) ? val.length > 0 : val !== null
                );
                if (hasCotPreviews) {
                    setCotPreviews(existingCotPreviews);
                    // Infer COT file types from URL extensions
                    const existingCotFileTypes: Record<string, 'image' | 'pdf' | 'other'> = {}
                    for (const [key, val] of Object.entries(existingCotPreviews)) {
                        if (Array.isArray(val)) {
                            val.forEach((url, i) => {
                                if (url) existingCotFileTypes[`aadhaar_photos_${i}`] = getFileTypeFromUrl(url)
                            })
                        } else if (val) {
                            existingCotFileTypes[key] = getFileTypeFromUrl(val as string)
                        }
                    }
                    setCotFileTypes(existingCotFileTypes)
                }

                // Set creator info for edit mode
                if (data.created_by_name) {
                    setCreatorInfo({
                        name: data.created_by_name,
                        role: data.created_by_role,
                        phone: data.created_by_phone
                    })
                }
            } catch (err) {
                console.error('Prefill error', err)
                setMsg('Unable to load application for editing')
            } finally {
                setPrefillLoading(false)
            }
        }

        loadApplication()
    }, [isEditMode, applicationId, token])

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement
        const { name, value } = target
        const checked = target.checked || false
        setForm((f) => ({ ...f, [name]: target.type === 'checkbox' ? checked : value }))
    }

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setMsg('❌ Geolocation is not supported by your browser. Please use Chrome, Firefox, Safari, or Edge.')
            return
        }

        setLocationLoading(true)
        setMsg('📍 Getting GPS location...')

        // First try with high accuracy
        const tryGetLocation = (highAccuracy: boolean, retryCount = 0) => {
            const options = {
                enableHighAccuracy: highAccuracy,
                timeout: highAccuracy ? 15000 : 30000, // 15s for high accuracy, 30s for low
                maximumAge: 0 // Don't use cached position
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords
                    console.log(`GPS Location obtained: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)

                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                            { headers: { 'User-Agent': 'SolarCRM/1.0' } }
                        )
                        const data = await response.json()

                        const address = data.display_name || ''
                        const pincode = data.address?.postcode || ''

                        setForm((f) => ({
                            ...f,
                            site_latitude: latitude.toFixed(6),
                            site_longitude: longitude.toFixed(6),
                            // Only update site_address if it's empty (don't overwrite manual entry)
                            site_address: f.site_address || address,
                            installation_pincode: pincode || f.installation_pincode,
                        }))
                        setMsg(`✅ Location captured successfully! (Accuracy: ${Math.round(accuracy)}m)`)
                    } catch (err) {
                        console.error('Reverse geocoding failed:', err)
                        setForm((f) => ({
                            ...f,
                            site_latitude: latitude.toFixed(6),
                            site_longitude: longitude.toFixed(6),
                        }))
                        setMsg(`✅ Location coordinates captured! (Accuracy: ${Math.round(accuracy)}m)`)
                    }
                    setLocationLoading(false)
                },
                (error) => {
                    console.error('Geolocation error:', error.code, error.message)

                    // If high accuracy failed, try with low accuracy
                    if (highAccuracy && retryCount < 1) {
                        console.log('High accuracy failed, trying with low accuracy...')
                        setMsg('⚙️ Trying alternative GPS method...')
                        tryGetLocation(false, retryCount + 1)
                        return
                    }

                    // Provide specific error messages with detailed instructions
                    let errorMsg = ''
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg = `❌ PERMISSION DENIED - To fix:\n
1. Click the 🔒 lock icon next to the URL\n
2. Find "Location" and set to "Allow"\n
3. Refresh the page and try again\n
4. If on mobile: Go to Settings → Privacy → Location Services and allow`
                            break
                        case error.POSITION_UNAVAILABLE:
                            errorMsg = '❌ GPS DATA UNAVAILABLE - Please ensure:\n1. GPS is enabled on your device\n2. You are in an open area (not indoors)\n3. Try again in a few seconds'
                            break
                        case error.TIMEOUT:
                            errorMsg = '⏱️ TIMEOUT - Location took too long. Please:\n1. Try again in an open area\n2. Disable VPN if using one\n3. Check internet connection'
                            break
                        default:
                            errorMsg = '❌ LOCATION ERROR - Please check:\n1. GPS permissions are allowed\n2. Internet connection is active\n3. Browser is up to date'
                    }
                    setMsg(errorMsg)
                    setLocationLoading(false)
                },
                options
            )
        }

        // Start with high accuracy
        tryGetLocation(true)
    }

    const onFile = async (name: string, file: File | null) => {
        if (!file) return
        const previewUrl = URL.createObjectURL(file)
        const type: 'image' | 'pdf' | 'other' =
            file.type === 'application/pdf' ? 'pdf'
                : file.type.startsWith('image/') ? 'image'
                    : 'other'
        setPreviews((prev) => ({ ...prev, [name]: previewUrl }))
        setFileTypes((prev) => ({ ...prev, [name]: type }))
        setFiles((prev) => ({ ...prev, [name]: file }))
    }

    const retakePhoto = (name: string) => {
        const currentPreview = previews[name]
        if (currentPreview && currentPreview.startsWith('blob:')) {
            URL.revokeObjectURL(currentPreview)
        }
        setPreviews((prev) => ({ ...prev, [name]: null }))
        setFiles((prev) => ({ ...prev, [name]: null }))
        setFileTypes((prev) => { const n = { ...prev }; delete n[name]; return n })
    }

    const onCotFile = (name: string, file: File | null) => {
        if (!file) return
        const previewUrl = URL.createObjectURL(file)
        const type: 'image' | 'pdf' | 'other' =
            file.type === 'application/pdf' ? 'pdf'
                : file.type.startsWith('image/') ? 'image'
                    : 'other'
        setCotPreviews((prev) => ({ ...prev, [name]: previewUrl }))
        setCotFileTypes((prev) => ({ ...prev, [name]: type }))
        setCotFiles((prev) => ({ ...prev, [name]: file }))
    }

    const addAadhaarPhoto = () => {
        if (cotFiles.aadhaar_photos.length < 6) {
            setCotFiles(prev => ({
                ...prev,
                aadhaar_photos: [...prev.aadhaar_photos, null]
            }))
            setCotPreviews(prev => ({
                ...prev,
                aadhaar_photos: [...prev.aadhaar_photos, null]
            }))
        }
    }

    const onAadhaarPhoto = (index: number, file: File | null) => {
        if (!file) return
        const previewUrl = URL.createObjectURL(file)
        const type: 'image' | 'pdf' | 'other' =
            file.type === 'application/pdf' ? 'pdf'
                : file.type.startsWith('image/') ? 'image'
                    : 'other'

        setCotFiles(prev => {
            const newPhotos = [...prev.aadhaar_photos]
            newPhotos[index] = file
            return { ...prev, aadhaar_photos: newPhotos }
        })

        setCotPreviews(prev => {
            const newPreviews = [...prev.aadhaar_photos]
            newPreviews[index] = previewUrl
            return { ...prev, aadhaar_photos: newPreviews }
        })

        setCotFileTypes(prev => ({ ...prev, [`aadhaar_photos_${index}`]: type }))
    }

    const removeAadhaarPhoto = (index: number) => {
        if (cotPreviews.aadhaar_photos[index]) {
            URL.revokeObjectURL(cotPreviews.aadhaar_photos[index])
        }

        setCotFiles(prev => ({
            ...prev,
            aadhaar_photos: prev.aadhaar_photos.filter((_, i) => i !== index)
        }))

        setCotPreviews(prev => ({
            ...prev,
            aadhaar_photos: prev.aadhaar_photos.filter((_, i) => i !== index)
        }))
    }

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setMsg('')

        // Validate required fields if status is COMPLETED
        if (form.application_status === 'COMPLETED') {
            const requiredFields = [
                // Customer Details
                { field: 'applicant_name', label: 'Customer Name' },
                { field: 'mobile_number', label: 'Mobile Number' },
                { field: 'email_id', label: 'Email ID' },

                // Solar Plant Details
                { field: 'solar_plant_type', label: 'Solar Plant Type' },
                { field: 'solar_system_type', label: 'Solar System Type' },
                { field: 'plant_size_kw', label: 'Plant Size (kW)' },
                { field: 'plant_price', label: 'Plant Price' },

                // Location Details
                { field: 'district', label: 'District' },
                { field: 'installation_pincode', label: 'Pincode' },
                { field: 'site_address', label: 'Site Address' },

                // Meter Details
                { field: 'meter_type', label: 'Meter Type' },

                // Payment Details
                { field: 'payment_mode', label: 'Payment Mode' },
                { field: 'advance_payment_mode', label: 'Advance Payment Mode' },
                { field: 'margin_money', label: 'Margin Money' },

                // Plant Structure
                { field: 'building_floor_number', label: 'Building Floor Number' },
                { field: 'structure_type', label: 'Structure Type' },
                { field: 'free_shadow_area', label: 'Free Shadow Area' },

                // Feasibility
                { field: 'installation_date_feasible', label: 'Installation Date Feasible' },
            ]

            const missingFields = requiredFields.filter(({ field }) => !form[field] || String(form[field]).trim() === '')

            if (missingFields.length > 0) {
                setMsg(`Please fill all required fields before marking as completed: ${missingFields.map(f => f.label).join(', ')}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }

            // Additional validation for custom structure type
            if (form.structure_type === 'Custom' && (!form.structure_length || !form.structure_height)) {
                setMsg('Please provide both length and height for custom structure type')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }

            // Validate required documents
            // Check both newly uploaded files AND existing previews (for edit mode)
            const requiredDocs = ['aadhaar_front', 'aadhaar_back', 'pan_card', 'electric_bill']
            const missingDocs = requiredDocs.filter((doc) => !files[doc] && !previews[doc])

            if (missingDocs.length > 0) {
                setMsg(`Please upload all required documents: ${missingDocs.map(d => d.replace(/_/g, ' ').toUpperCase()).join(', ')}`)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }
        }

        setLoading(true)

        try {
            if (!token) throw new Error('Missing auth token')

            const toNum = (v: string) => (v && v.trim() !== '' ? Number(v) : null)
            const toDate = (v: string) => (v && v.trim() !== '' ? v : null)

            const payload = {
                applicant_name: form.applicant_name,
                mobile_number: form.mobile_number,
                email_id: form.email_id || null,
                solar_plant_type: form.solar_plant_type,
                solar_system_type: form.solar_system_type,
                plant_category: form.plant_category,
                plant_size_kw: toNum(form.plant_size_kw),
                plant_price: toNum(form.plant_price),
                district: form.district,
                installation_pincode: form.installation_pincode,
                site_address: form.site_address || null,
                site_latitude: toNum(form.site_latitude),
                site_longitude: toNum(form.site_longitude),
                meter_type: form.meter_type,
                name_correction_required: form.name_correction_required,
                correct_name: form.correct_name || null,
                load_enhancement_required: form.load_enhancement_required,
                current_load: form.current_load || null,
                required_load: form.required_load || null,
                cot_required: form.cot_required,
                cot_type: form.cot_type || null,
                cot_documents: form.cot_documents || null,
                payment_mode: form.payment_mode,
                advance_payment_mode: form.advance_payment_mode,
                upi_type: form.upi_type || null,
                margin_money: toNum(form.margin_money),
                special_finance_required: form.special_finance_required,
                building_floor_number: form.building_floor_number || null,
                structure_type: form.structure_type || null,
                structure_length: toNum(form.structure_length),
                structure_height: toNum(form.structure_height),
                free_shadow_area: toNum(form.free_shadow_area),
                installation_date_feasible: toDate(form.installation_date_feasible),
                application_status: form.application_status || 'DRAFT',
                created_by: session?.employeeId || '',
            }

            const created = isEditMode
                ? await registeredCustomersAPI.update(applicationId!, payload, token)
                : await registeredCustomersAPI.create(payload, token)

            console.log('=== Customer API Response ===');
            console.log('Full response:', created);
            console.log('created.id:', created?.id);
            console.log('created.data?.id:', created?.data?.id);

            const customerId = created?.data?.id || created?.id || applicationId;
            console.log('Extracted customerId:', customerId, typeof customerId);

            // Prepare all files for batch upload
            const filesToUpload: Record<string, File | File[]> = {};
            const urlMapping: Record<string, string> = {
                'aadhaar_front': 'aadhaar_front_url',
                'aadhaar_back': 'aadhaar_back_url',
                'pan_card': 'pan_card_url',
                'electric_bill': 'electric_bill_url',
                'ceiling_paper_photo': 'ceiling_paper_photo_url',
                'cancel_cheque': 'cancel_cheque_url',
                'site_image_gps': 'site_image_gps_url',
                'cot_death_certificate': 'cot_death_certificate_url',
                'cot_house_papers': 'cot_house_papers_url',
                'cot_passport_photo': 'cot_passport_photo_url',
                'cot_family_registration': 'cot_family_registration_url',
                'cot_live_aadhaar_1': 'cot_live_aadhaar_1_url',
                'cot_live_aadhaar_2': 'cot_live_aadhaar_2_url',
            };

            // Collect all files to upload
            for (const key of Object.keys(files)) {
                if (files[key]) {
                    filesToUpload[key] = files[key] as File;
                }
            }

            // Add COT files
            if (cotFiles.death_certificate) filesToUpload['cot_death_certificate'] = cotFiles.death_certificate;
            if (cotFiles.house_papers) filesToUpload['cot_house_papers'] = cotFiles.house_papers;
            if (cotFiles.passport_photo) filesToUpload['cot_passport_photo'] = cotFiles.passport_photo;
            if (cotFiles.family_registration) filesToUpload['cot_family_registration'] = cotFiles.family_registration;
            if (cotFiles.live_to_live_aadhaar_1) filesToUpload['cot_live_aadhaar_1'] = cotFiles.live_to_live_aadhaar_1;
            if (cotFiles.live_to_live_aadhaar_2) filesToUpload['cot_live_aadhaar_2'] = cotFiles.live_to_live_aadhaar_2;

            // Add aadhaar photos array
            const validAadhaarPhotos = cotFiles.aadhaar_photos.filter(f => f !== null) as File[];
            if (validAadhaarPhotos.length > 0) {
                filesToUpload['cot_aadhaar_photos'] = validAadhaarPhotos;
            }

            // Upload all files at once if there are any
            const urlUpdates: Record<string, any> = {};
            let fileUploadSuccess = true;
            let fileUploadWarning = '';

            if (Object.keys(filesToUpload).length > 0) {
                try {
                    const uploadResult = await registeredCustomersAPI.uploadDocuments(String(customerId), filesToUpload, token);

                    if (uploadResult?.files) {
                        // Map uploaded file URLs to database column names
                        for (const [fieldName, fileInfo] of Object.entries(uploadResult.files)) {
                            if (fieldName === 'cot_aadhaar_photos' && Array.isArray(fileInfo)) {
                                // Handle multiple aadhaar photos
                                const urls = fileInfo.map((f: any) => f.url);
                                urlUpdates['cot_aadhaar_photos_urls'] = JSON.stringify(urls);
                            } else if (urlMapping[fieldName]) {
                                // Handle single file
                                urlUpdates[urlMapping[fieldName]] = (fileInfo as any).url;
                            }
                        }
                    }
                } catch (fileErr) {
                    fileUploadSuccess = false;
                    const fileErrMsg = fileErr instanceof Error ? fileErr.message : 'File upload failed';
                    fileUploadWarning = `⚠️ Customer ${isEditMode ? 'saved' : 'created'} successfully but file upload failed: ${fileErrMsg}. You can upload files later.`;
                    console.error('File upload error:', fileErr);
                }
            }

            if (Object.keys(urlUpdates).length > 0) {
                try {
                    await registeredCustomersAPI.update(String(customerId), urlUpdates, token)
                } catch (updateErr) {
                    console.error('Error updating file URLs:', updateErr);
                    // Don't throw - customer and files are already created/uploaded
                }
            }

            // Show appropriate success message
            if (fileUploadWarning) {
                setMsg(fileUploadWarning);
            } else {
                setMsg(isEditMode ? '✅ Application saved successfully!' : '✅ Application created successfully!');
            }

            Object.values(previews).forEach((url) => url && URL.revokeObjectURL(url))

            // Call onSuccess callback if provided (for modal closing)
            if (onSuccess) {
                const numericId = customerId ? Number(customerId) : undefined;
                console.log('Calling onSuccess with customerId:', numericId);
                setTimeout(() => onSuccess(numericId), fileUploadSuccess ? 500 : 2000)
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Network error.'
            setMsg(`❌ Error: ${errMsg}`)
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    /** Renders a compact preview thumbnail for COT documents with a Preview button. */
    const renderCotPreview = (
        previewUrl: string | null | undefined,
        typeKey: string,
        altLabel: string
    ) => {
        if (!previewUrl) return null
        const type = cotFileTypes[typeKey] || getFileTypeFromUrl(previewUrl)
        return (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
                {type === 'pdf' ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-red-600 font-medium">PDF uploaded ✓</span>
                    </div>
                ) : (
                    <img
                        src={previewUrl}
                        alt={altLabel}
                        className="w-24 h-24 object-cover rounded-lg border-2 border-green-500 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setPreviewModal({ url: previewUrl, type, label: altLabel })}
                    />
                )}
                <button
                    type="button"
                    onClick={() => setPreviewModal({ url: previewUrl, type, label: altLabel })}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                </button>
            </div>
        )
    }

    const CameraCapture = ({ name, label }: { name: string; label: string }) => {
        const previewUrl = previews[name]
        const fileType = previewUrl ? (fileTypes[name] || getFileTypeFromUrl(previewUrl)) : null
        return (
            <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
                {!previewUrl ? (
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                            capture="environment"
                            onChange={(e) => onFile(name, e.target.files?.[0] || null)}
                            className="hidden"
                            id={`file-${name}`}
                        />
                        <label
                            htmlFor={`file-${name}`}
                            className="flex flex-col items-center justify-center w-full h-24 md:h-28 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                            <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs md:text-sm text-blue-600 font-medium">📷 Capture Photo</span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Thumbnail / PDF placeholder */}
                        {fileType === 'pdf' ? (
                            <div
                                className="w-full h-32 md:h-40 bg-red-50 border-4 border-green-500 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-red-100 transition-colors"
                                onClick={() => setPreviewModal({ url: previewUrl, type: 'pdf', label })}
                            >
                                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-semibold text-red-600">PDF Uploaded ✓</span>
                                <span className="text-xs text-slate-500">Click to preview</span>
                            </div>
                        ) : (
                            <div
                                className="relative group cursor-pointer"
                                onClick={() => setPreviewModal({ url: previewUrl, type: 'image', label })}
                            >
                                <img
                                    src={previewUrl}
                                    alt={label}
                                    className="w-full h-32 md:h-40 object-cover rounded-lg border-4 border-green-500"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-all flex items-center justify-center">
                                    <span className="opacity-0 group-hover:opacity-100 text-white bg-black/70 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Click to Preview
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPreviewModal({ url: previewUrl, type: fileType || 'image', label })}
                                className="flex-1 py-2 md:py-2.5 rounded-lg font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => retakePhoto(name)}
                                className="flex-1 py-2 md:py-2.5 rounded-lg font-medium text-sm text-white bg-slate-600 hover:bg-slate-700 transition-colors"
                            >
                                📷 Retake
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (isEditMode && prefillLoading) {
        return (
            <div className="w-full flex items-center justify-center py-8">
                <div className="bg-white shadow-md rounded-lg p-6 text-center border border-slate-200">
                    <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-slate-700 font-medium">Loading application...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto">
            <form onSubmit={submit} className="space-y-5 md:space-y-6">

                {/* Sales Executive Info */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                        Sales Executive {isEditMode && creatorInfo && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold ml-auto">(Created by)</span>}
                    </h3>
                    {isEditMode && creatorInfo ? (
                        <div className="space-y-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                                <input
                                    value={creatorInfo.name || ''}
                                    disabled
                                    className="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white text-slate-700 text-sm"
                                />
                            </div>
                            {creatorInfo.role && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                                    <input
                                        value={creatorInfo.role}
                                        disabled
                                        className="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white text-slate-700 text-sm"
                                    />
                                </div>
                            )}
                            {creatorInfo.phone && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                                    <input
                                        value={creatorInfo.phone}
                                        disabled
                                        className="w-full border border-emerald-300 rounded-lg px-4 py-2.5 bg-white text-slate-700 text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <input
                            value={session?.name || ''}
                            disabled
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-slate-50 text-slate-600 text-sm"
                        />
                    )}
                </section>

                {/* Applicant Details */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                        Customer Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                            <input
                                name="applicant_name"
                                value={form.applicant_name}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter customer's full name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number *</label>
                            <input
                                name="mobile_number"
                                value={form.mobile_number}
                                onChange={onChange}
                                type="tel"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="10-digit mobile number"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email ID <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                name="email_id"
                                value={form.email_id}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="customer@gmail.com"
                                required
                            />
                        </div>
                    </div>
                </section>

                {/* Location Details */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                        Location Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">District *</label>
                            <select
                                name="district"
                                value={form.district}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select District</option>
                                {UP_DISTRICTS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Installation Pin Code *</label>
                            <input
                                name="installation_pincode"
                                value={form.installation_pincode}
                                onChange={onChange}
                                type="tel"
                                maxLength={6}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="6-digit pincode"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Address *</label>
                            <textarea
                                name="site_address"
                                value={form.site_address}
                                onChange={onChange}
                                rows={2}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter complete site address for installation"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Location (GPS) - Optional</label>
                            <div className="flex items-center gap-3 mb-3">
                                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={manualGps}
                                        onChange={(e) => setManualGps(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Add manually
                                </label>
                            </div>

                            {!manualGps && (
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    disabled={locationLoading}
                                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {locationLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Getting Location...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Get GPS Coordinates (Optional)
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {manualGps && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude</label>
                                    <input
                                        name="site_latitude"
                                        value={form.site_latitude}
                                        onChange={onChange}
                                        type="number"
                                        step="0.000001"
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter latitude"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude</label>
                                    <input
                                        name="site_longitude"
                                        value={form.site_longitude}
                                        onChange={onChange}
                                        type="number"
                                        step="0.000001"
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter longitude"
                                    />
                                </div>
                            </>
                        )}
                        {form.site_latitude && form.site_longitude && (
                            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-xs text-green-800 font-semibold mb-2">📍 GPS Coordinates Captured:</p>
                                <p className="text-xs text-green-600">
                                    Latitude: {form.site_latitude}, Longitude: {form.site_longitude}
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Documents */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">4</span>
                        Documents
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <CameraCapture name="aadhaar_front" label="Aadhaar Card - Front Side" />
                        <CameraCapture name="aadhaar_back" label="Aadhaar Card - Back Side" />
                        <CameraCapture name="pan_card" label="PAN Card" />
                        <CameraCapture name="electric_bill" label="Electricity Bill" />
                        <CameraCapture name="cancel_cheque" label="Cancel Cheque / Passbook" />
                        <CameraCapture name="site_image_gps" label="Site Image with GPS Geo Location" />
                    </div>
                </section>

                {/* Solar Plant Details */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">5</span>
                        Solar Plant Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Type of Plant *</label>
                            <select
                                name="solar_system_type"
                                value={form.solar_system_type}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="TATA On-Grid">TATA On-Grid</option>
                                <option value="Customise On-Grid">Customise On-Grid</option>
                                <option value="TATA Hybrid">TATA Hybrid</option>
                                <option value="Customise Hybrid">Customise Hybrid</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Category *</label>
                            <select
                                name="plant_category"
                                value={form.plant_category}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="Residential">Residential</option>
                                <option value="Commercial">Commercial</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Size (kW) *</label>
                            <select
                                name="plant_size_kw"
                                value={form.plant_size_kw}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select Size</option>
                                {form.plant_category === 'Residential' ? (
                                    <>
                                        <option value="1">1 kW</option>
                                        <option value="2">2 kW</option>
                                        <option value="3">3 kW</option>
                                        <option value="4">4 kW</option>
                                        <option value="5">5 kW (I)</option>
                                        <option value="5.5">5 kW (III)</option>
                                        <option value="6">6 kW</option>
                                        <option value="8">8 kW</option>
                                        <option value="10">10 kW</option>
                                        <option value="12">12 kW</option>
                                        <option value="15">15 kW</option>
                                        <option value="18">18 kW</option>
                                        <option value="20">20 kW</option>
                                    </>
                                ) : (
                                    Array.from({ length: 199 }, (_, i) => i + 2).map((kw) => (
                                        <option key={kw} value={kw}>{kw} kW</option>
                                    ))
                                )}
                            </select>
                            <p className="text-xs text-slate-500 mt-1.5">
                                {form.plant_category === 'Residential' ? 'Range: 1-20 kW' : 'Range: 2-200 kW'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plant Price (₹) *</label>
                            <input
                                type="number"
                                name="plant_price"
                                value={form.plant_price}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter total price"
                                required
                            />
                        </div>
                    </div>
                </section>

                {/* Meter Details */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">6</span>
                        Meter Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Meter Type *</label>
                            <select
                                name="meter_type"
                                value={form.meter_type}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="Electric Meter">Electric Meter</option>
                                <option value="Smart Meter">Smart Meter</option>
                            </select>
                        </div>
                        {form.meter_type === 'Smart Meter' && (
                            <div className="md:col-span-2">
                                <div className="border-t border-slate-200 pt-4 mt-2">
                                    <CameraCapture name="ceiling_paper_photo" label="Ceiling Paper Photo *" />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Special Requests */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">7</span>
                        Special Requests
                    </h3>
                    <div className="space-y-5">

                        {/* 1. Name Correction */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">1. Name Correction</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, name_correction_required: 'Not Required', correct_name: '' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.name_correction_required === 'Not Required'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Not Required
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, name_correction_required: 'Required' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.name_correction_required === 'Required'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Required
                                </button>
                            </div>
                            {form.name_correction_required === 'Required' && (
                                <div className="mt-3">
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">What is the correct name? *</label>
                                    <input
                                        name="correct_name"
                                        value={form.correct_name}
                                        onChange={onChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                        placeholder="Enter the correct name for this customer"
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. Load Enhancement */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">2. Load Enhancement</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, load_enhancement_required: 'Not Required', current_load: '', required_load: '' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.load_enhancement_required === 'Not Required'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Not Required
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, load_enhancement_required: 'Required' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.load_enhancement_required === 'Required'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Required
                                </button>
                            </div>
                            {form.load_enhancement_required === 'Required' && (
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Old Sanction Load (kW) *</label>
                                        <input
                                            name="current_load"
                                            value={form.current_load}
                                            onChange={onChange}
                                            type="number"
                                            step="0.1"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                            placeholder="e.g., 2"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">New Load Required (kW) *</label>
                                        <input
                                            name="required_load"
                                            value={form.required_load}
                                            onChange={onChange}
                                            type="number"
                                            step="0.1"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                            placeholder="e.g., 5"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. COT */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">3. COT (Connection Transfer)</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, cot_required: 'No', cot_type: '', cot_documents: '' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.cot_required === 'No'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Not Required
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, cot_required: 'Yes' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.cot_required === 'Yes'
                                        ? 'bg-orange-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Required
                                </button>
                            </div>
                            {form.cot_required === 'Yes' && (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">COT Type *</label>
                                        <select
                                            name="cot_type"
                                            value={form.cot_type}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-orange-500"
                                            required
                                        >
                                            <option value="">Select Type</option>
                                            <option value="Live to Live">Live to Live</option>
                                            <option value="Death to Live">Death to Live</option>
                                        </select>
                                    </div>

                                    {/* Live to Live Document Uploads */}
                                    {form.cot_type === 'Live to Live' && (
                                        <div className="space-y-4 mt-4">
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                                <p className="text-xs font-semibold text-amber-800 mb-1">📋 Required Documents:</p>
                                                <p className="text-xs text-amber-700">Aadhaar card of both persons required</p>
                                            </div>

                                            {/* First Person Aadhaar */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">First Person Aadhaar Card *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('live_to_live_aadhaar_1', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.live_to_live_aadhaar_1, 'live_to_live_aadhaar_1', 'First Person Aadhaar Card')}
                                            </div>

                                            {/* Second Person Aadhaar */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">Second Person Aadhaar Card *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('live_to_live_aadhaar_2', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.live_to_live_aadhaar_2, 'live_to_live_aadhaar_2', 'Second Person Aadhaar Card')}
                                            </div>
                                        </div>
                                    )}

                                    {/* Death to Live Document Uploads */}
                                    {form.cot_type === 'Death to Live' && (
                                        <div className="space-y-4 mt-4">
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                                <p className="text-xs font-semibold text-amber-800 mb-1">📋 Required Documents:</p>
                                                <p className="text-xs text-amber-700">
                                                    Death certificate + Up to 6 persons Aadhaar + Family register + House papers + Passport photo
                                                </p>
                                            </div>
                                            {/* Death Certificate */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">Death Certificate *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('death_certificate', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.death_certificate, 'death_certificate', 'Death Certificate')}
                                            </div>

                                            {/* House Papers */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">House Papers *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('house_papers', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.house_papers, 'house_papers', 'House Papers')}
                                            </div>

                                            {/* Passport Size Photo */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">Passport Size Photo *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('passport_photo', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.passport_photo, 'passport_photo', 'Passport Size Photo')}
                                            </div>

                                            {/* Family Registration Papers */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">Family Registration Papers *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                    onChange={(e) => onCotFile('family_registration', e.target.files?.[0] ?? null)}
                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                />
                                                {renderCotPreview(cotPreviews.family_registration, 'family_registration', 'Family Registration Papers')}
                                            </div>

                                            {/* Aadhaar Photos (up to 6) */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-2">Aadhaar Photos (Up to 6 persons)</label>
                                                <div className="space-y-3">
                                                    {cotFiles.aadhaar_photos.map((_, index) => (
                                                        <div key={index} className="flex gap-2 items-start">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                                                                    onChange={(e) => onAadhaarPhoto(index, e.target.files?.[0] ?? null)}
                                                                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500"
                                                                />
                                                                {renderCotPreview(cotPreviews.aadhaar_photos[index], `aadhaar_photos_${index}`, `Aadhaar Card ${index + 1}`)}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAadhaarPhoto(index)}
                                                                className="mt-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {cotFiles.aadhaar_photos.length < 6 && (
                                                        <button
                                                            type="button"
                                                            onClick={addAadhaarPhoto}
                                                            className="w-full py-2 px-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <span className="text-xl">+</span>
                                                            <span className="text-sm font-medium">Add Aadhaar Photo ({cotFiles.aadhaar_photos.length}/6)</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Additional Notes</label>
                                        <textarea
                                            name="cot_documents"
                                            value={form.cot_documents}
                                            onChange={onChange}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                                            rows={2}
                                            placeholder="Add any notes about COT documents..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. Finance Required */}
                        <div className="border border-slate-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">4. Finance Required</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, special_finance_required: 'No' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.special_finance_required === 'No'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    No
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, special_finance_required: 'Yes' }))}
                                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${form.special_finance_required === 'Yes'
                                        ? 'bg-blue text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                        }`}
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Payment Details */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">8</span>
                        Payment Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode of Payment *</label>
                            <select
                                name="payment_mode"
                                value={form.payment_mode}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="UPI">UPI</option>
                                <option value="Finance">Finance</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Advance Payment Mode *</label>
                            <select
                                name="advance_payment_mode"
                                value={form.advance_payment_mode}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="UPI">UPI</option>
                            </select>
                        </div>
                        {form.advance_payment_mode === 'UPI' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI Account *</label>
                                    <select
                                        name="upi_type"
                                        value={form.upi_type}
                                        onChange={onChange}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="Company">Company UPI</option>
                                        <option value="Prashant">Prashant</option>
                                        <option value="SN Singh">SN Singh</option>
                                    </select>
                                </div>
                                {form.upi_type && (
                                    <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <p className="text-sm font-semibold text-blue-800 mb-3">📱 UPI QR Code for {form.upi_type}</p>
                                        <div className="flex justify-center">
                                            <div className="bg-white p-4 rounded-lg shadow-md">
                                                <svg className="w-48 h-48 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                                </svg>
                                                <p className="text-center text-xs text-slate-500 mt-2">Scan to Pay</p>
                                                <p className="text-center text-xs font-semibold text-slate-700">{form.upi_type}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Margin Money (₹)</label>
                            <input
                                type="number"
                                name="margin_money"
                                value={form.margin_money}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter advance amount"
                            />
                        </div>
                    </div>
                </section>

                {/* Plant Structure */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">9</span>
                        Plant Structure
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Building Height/Floor</label>
                            <input
                                type="number"
                                name="building_floor_number"
                                value={form.building_floor_number}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0 for Ground, 1, 2, 3..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Structure Type</label>
                            <select
                                name="structure_type"
                                value={form.structure_type}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Type</option>
                                <option value="3*5">3 × 5</option>
                                <option value="5*7">5 × 7</option>
                                <option value="Custom">Custom (Length × Height)</option>
                            </select>
                        </div>
                        {form.structure_type === 'Custom' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Length (ft)</label>
                                    <input
                                        type="number"
                                        name="structure_length"
                                        value={form.structure_length}
                                        onChange={onChange}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter length"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Height (ft)</label>
                                    <input
                                        type="number"
                                        name="structure_height"
                                        value={form.structure_height}
                                        onChange={onChange}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter height"
                                    />
                                </div>
                            </>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Free Shadow Area (sq. ft.)</label>
                            <input
                                type="number"
                                name="free_shadow_area"
                                value={form.free_shadow_area}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter free shadow area in square feet"
                            />
                        </div>
                    </div>
                </section>

                {/* Installation Date */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">10</span>
                        Expected Installation Date
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Installation Date</label>
                        <input
                            type="date"
                            name="installation_date_feasible"
                            value={form.installation_date_feasible}
                            onChange={onChange}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </section>

                {/* Application Status */}
                <section className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-slate-200">
                    <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 md:gap-3">
                        <span className="w-7 h-7 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">11</span>
                        Application Status
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                            <select
                                name="application_status"
                                value={form.application_status}
                                onChange={onChange}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <p className="font-semibold text-slate-800 mb-1">When to use:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><span className="font-semibold">Draft</span> - Save now and finish later.</li>
                                <li><span className="font-semibold">Completed</span> - Form is fully filled.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Message */}
                {msg && (
                    <div className={`p-4 rounded-xl text-center font-medium border ${msg.includes('success')
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                        {msg}
                    </div>
                )}

                {/* Submit Buttons */}
                <div className="grid md:grid-cols-2 gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-bold text-base hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-2 md:order-1 shadow-md"
                    >
                        {loading
                            ? (isEditMode ? '⏳ Saving...' : '⏳ Creating...')
                            : (isEditMode ? '✓ Save Application' : '✓ Create Application')}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (onCancel) onCancel()
                            setMsg('')
                        }}
                        className="w-full py-3.5 rounded-xl bg-slate-200 text-slate-700 font-medium text-base hover:bg-slate-300 transition-colors order-1 md:order-2"
                    >
                        Cancel
                    </button>
                </div>
            </form>

            {/* ── Document Preview Modal ── */}
            {previewModal && (
                <div
                    className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewModal(null)}
                >
                    <div
                        className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                        style={{ maxHeight: '92vh' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
                            <h3 className="font-semibold text-slate-800 text-sm md:text-base truncate pr-4">
                                {previewModal.label}
                            </h3>
                            <div className="flex items-center gap-2 shrink-0">
                                <a
                                    href={previewModal.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    🔗 Open in New Tab
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewModal(null)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors text-base leading-none"
                                    aria-label="Close preview"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="overflow-auto flex-1 bg-slate-100">
                            {previewModal.type === 'pdf' ? (
                                <iframe
                                    src={previewModal.url}
                                    className="w-full border-0"
                                    style={{ height: '78vh' }}
                                    title={previewModal.label}
                                />
                            ) : (
                                <div className="flex items-center justify-center p-4 min-h-[50vh]">
                                    <img
                                        src={previewModal.url}
                                        alt={previewModal.label}
                                        className="max-w-full object-contain rounded-lg shadow-md"
                                        style={{ maxHeight: '78vh' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
