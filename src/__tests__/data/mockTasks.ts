// Mock data for Kanban dashboard testing
export interface RegisteredCustomerData {
    id: number;
    applicant_name: string;
    mobile_number: string;
    email_id?: string;
    solar_plant_type: string;
    solar_system_type: string;
    plant_category: string;
    plant_size_kw: number;
    plant_price?: number;
    district: string;
    installation_pincode: string;
    site_address?: string;
    site_latitude: number;
    site_longitude: number;
    meter_type: string;
    name_correction_required: string;
    correct_name?: string;
    load_enhancement_required: string;
    current_load?: string;
    required_load?: string;
    cot_required: string;
    cot_type?: string;
    cot_documents?: string;
    payment_mode: string;
    advance_payment_mode: string;
    upi_type?: string;
    margin_money?: number;
    special_finance_required: string;
    building_floor_number?: string;
    structure_type?: string;
    structure_length?: number;
    structure_height?: number;
    free_shadow_area?: number;
    installation_date_feasible?: string;
    application_status: string;
    aadhaar_front_url?: string;
    aadhaar_back_url?: string;
    pan_card_url?: string;
    electric_bill_url?: string;
    smart_meter_doc_url?: string;
    cancel_cheque_url?: string;
    bank_details_doc_url?: string;
    cot_death_certificate_url?: string;
    cot_house_papers_url?: string;
    cot_passport_photo_url?: string;
    cot_family_registration_url?: string;
    cot_aadhaar_photos_urls?: string;
    cot_live_aadhaar_1_url?: string;
    cot_live_aadhaar_2_url?: string;
    created_by: number;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    taskId: string;
    customerName: string;
    workTitle: string;
    work?: string;
    work_type?: string;
    assignedRole: string;
    status: 'pending' | 'in-progress' | 'completed';
    assignedOn: string;
    description?: string;
    location?: string;
    district?: string;
    systemCapacity?: string;
    applicationType?: string;
    requiredActions?: string[];
    registered_customer_data?: RegisteredCustomerData;
}

export const mockTasks: Task[] = [
    // Pending Tasks
    {
        id: '1',
        taskId: 'TATA-2401-001',
        customerName: 'Rajesh Kumar Singh',
        workTitle: 'Site Survey & Feasibility Report',
        assignedRole: 'Field Engineer',
        status: 'pending',
        assignedOn: '2024-01-20',
        description: 'Complete site survey and prepare feasibility report for 5 kW rooftop solar installation.',
        location: '123 Ram Nagar, Gorakhpur',
        district: 'Gorakhpur',
        systemCapacity: '5 kW',
        applicationType: 'Residential',
        requiredActions: ['upload_site_photos', 'upload_survey_report'],
    },
    {
        id: '2',
        taskId: 'TATA-2401-002',
        customerName: 'Priya Sharma',
        workTitle: 'Bill Upload & Verification',
        assignedRole: 'Back Office',
        status: 'pending',
        assignedOn: '2024-01-22',
        description: 'Customer to upload latest electricity bill for subsidy eligibility verification.',
        location: '456 MG Road, Lucknow',
        district: 'Lucknow',
        systemCapacity: '3 kW',
        applicationType: 'Residential',
        requiredActions: ['upload_bill', 'verify_consumption'],
    },
    {
        id: '3',
        taskId: 'TATA-2401-003',
        customerName: 'Manufacturing Ltd.',
        workTitle: 'Commercial Quote Preparation',
        assignedRole: 'Sales Manager',
        status: 'pending',
        assignedOn: '2024-01-21',
        description: 'Prepare detailed quotation for 50 kW commercial solar installation with financing options.',
        location: 'Industrial Park, Kanpur',
        district: 'Kanpur',
        systemCapacity: '50 kW',
        applicationType: 'Commercial',
        requiredActions: ['prepare_quotation', 'send_proposal'],
    },
    {
        id: '4',
        taskId: 'TATA-2401-004',
        customerName: 'Akshay Verma',
        workTitle: 'Net Metering Application',
        assignedRole: 'Regulatory Specialist',
        status: 'pending',
        assignedOn: '2024-01-23',
        description: 'File net metering application with distribution company.',
        location: '789 Civil Lines, Varanasi',
        district: 'Varanasi',
        systemCapacity: '4 kW',
        applicationType: 'Residential',
        requiredActions: ['prepare_documentation', 'submit_application'],
    },

    // In-Progress Tasks
    {
        id: '5',
        taskId: 'TATA-2401-005',
        customerName: 'Anjali Patel',
        workTitle: 'Material Procurement',
        assignedRole: 'Procurement Officer',
        status: 'in-progress',
        assignedOn: '2024-01-15',
        description: 'Order and track solar panels, inverters, and other equipment for installation.',
        location: '321 Sector 5, Noida',
        district: 'Gautam Budh Nagar',
        systemCapacity: '6 kW',
        applicationType: 'Residential',
        requiredActions: ['track_shipment', 'verify_quality'],
    },
    {
        id: '6',
        taskId: 'TATA-2401-006',
        customerName: 'Vikas Khanna',
        workTitle: 'Installation & Commissioning',
        assignedRole: 'Installation Team',
        status: 'in-progress',
        assignedOn: '2024-01-18',
        description: 'Install solar panels, inverter, and balance of system. Perform safety checks.',
        location: '654 Defence Colony, Delhi',
        district: 'South Delhi',
        systemCapacity: '8 kW',
        applicationType: 'Residential',
        requiredActions: ['upload_installation_photos', 'update_serial_numbers', 'safety_checklist'],
    },
    {
        id: '7',
        taskId: 'TATA-2401-007',
        customerName: 'Sumit Industries',
        workTitle: 'Finance Documentation',
        assignedRole: 'Finance Advisor',
        status: 'in-progress',
        assignedOn: '2024-01-19',
        description: 'Complete loan/subsidy documentation and submit to financial institutions.',
        location: 'Business Hub, Meerut',
        district: 'Meerut',
        systemCapacity: '25 kW',
        applicationType: 'Commercial',
        requiredActions: ['upload_fin_docs', 'bank_approval_status'],
    },

    // Completed Tasks
    {
        id: '8',
        taskId: 'TATA-2401-008',
        customerName: 'Harpreet Kaur',
        workTitle: 'Complete Installation',
        assignedRole: 'Installation Team',
        status: 'completed',
        assignedOn: '2024-01-10',
        description: '3 kW rooftop solar system successfully installed and commissioned.',
        location: '111 Punjabi Market, Chandni Chowk',
        district: 'Central Delhi',
        systemCapacity: '3 kW',
        applicationType: 'Residential',
        requiredActions: [],
    },
    {
        id: '9',
        taskId: 'TATA-2401-009',
        customerName: 'Deepak Yadav',
        workTitle: 'Post-Installation Support',
        assignedRole: 'Customer Care',
        status: 'completed',
        assignedOn: '2024-01-05',
        description: 'Provided 1-month post-installation monitoring and customer training.',
        location: '222 Sector 8, Gurgaon',
        district: 'Gurugram',
        systemCapacity: '5 kW',
        applicationType: 'Residential',
        requiredActions: [],
    },
    {
        id: '10',
        taskId: 'TATA-2401-010',
        customerName: 'Metro Energy Corp',
        workTitle: 'Commercial System Go-Live',
        assignedRole: 'Project Manager',
        status: 'completed',
        assignedOn: '2024-01-08',
        description: '100 kW commercial solar system fully operational and generating power.',
        location: 'Tech Park, Bangalore',
        district: 'Bangalore',
        systemCapacity: '100 kW',
        applicationType: 'Commercial',
        requiredActions: [],
    },
];

// Group tasks by status
export const getTasksByStatus = (tasks: Task[], status: Task['status']): Task[] => {
    return tasks.filter(task => task.status === status);
};

// Get all unique statuses
export const getTaskStatuses = (): Task['status'][] => {
    return ['pending', 'in-progress', 'completed'];
};

// Update task status
export const updateTaskStatus = (tasks: Task[], taskId: string, newStatus: Task['status']): Task[] => {
    return tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
    );
};
