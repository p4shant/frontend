// Centralized API Service - All API endpoints consolidated in one place
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

// ============================================================================
// AUTH API
// ============================================================================
export const authAPI = {
    async login(phoneNumber: string, password: string) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: phoneNumber, password }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Login failed');
        }

        return await response.json();
    },

    async register(data: {
        name: string;
        phone_number: string;
        employee_role: string;
        district?: string;
        password: string;
    }) {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        return await response.json();
    },
};

// ============================================================================
// TASKS API
// ============================================================================
type Task = {
    id: string;
    taskId: string;
    customerName: string;
    workTitle: string;
    work?: string;
    work_type?: string;
    assignedRole: string;
    status: 'pending' | 'in-progress' | 'completed';
    assignedOn: string;
    systemCapacity?: string;
    description?: string;
    location?: string;
    district?: string;
    applicationType?: string;
    requiredActions?: string[];
    registered_customer_data?: any;
    assigned_to_name?: string;
};

function normalizeStatus(status: string): 'pending' | 'in-progress' | 'completed' {
    if (status === 'inprogress') return 'in-progress';
    return status as 'pending' | 'in-progress' | 'completed';
}

function transformTask(task: any): Task {
    const customerData = task.registered_customer_data || {};

    return {
        id: String(task.id),
        taskId: `TASK-${task.id}`,
        customerName: customerData.applicant_name || 'Unknown',
        workTitle: task.work || task.work_type || 'Untitled',
        work: task.work,
        work_type: task.work_type,
        assignedRole: task.assigned_to_role || 'Unassigned',
        assigned_to_name: task.assigned_to_name,
        status: normalizeStatus(task.status),
        assignedOn: task.created_at,
        systemCapacity: customerData.plant_size_kw ? `${customerData.plant_size_kw} kW` : 'TBD',
        description: task.work || task.work_type || 'No description',
        location: customerData.site_address || 'Location TBD',
        district: customerData.district || 'Unknown',
        applicationType: customerData.solar_system_type || task.work_type || 'General',
        requiredActions: [],
        registered_customer_data: task.registered_customer_data,
    };
}

export const tasksAPI = {
    async getByEmployeeId(employeeId: string, token: string): Promise<Task[]> {
        try {
            const response = await fetch(`${API_BASE}/tasks/employee/${employeeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.status}`);
            }

            const data = await response.json();
            const tasks = Array.isArray(data) ? data : data.data || [];

            return tasks.map(transformTask);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }
    },

    async getTaskById(taskId: string, token: string): Promise<Task | null> {
        try {
            const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Failed to fetch task: ${response.status}`);
            }

            const data = await response.json();
            return transformTask(data);
        } catch (error) {
            console.error('Error fetching task:', error);
            return null;
        }
    },

    async updateTaskStatus(taskId: string, newStatus: string, token: string): Promise<{ success: boolean; message?: string; data?: any }> {
        try {
            const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus === 'in-progress' ? 'inprogress' : newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update task status' }));
                return {
                    success: false,
                    message: errorData.message || `Failed to update task (Status: ${response.status})`
                };
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('Error updating task:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Network error occurred'
            };
        }
    },

    async getAllTasks(token: string, filters?: { page?: number; limit?: number; status?: string }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));
            if (filters?.status) params.append('status', filters.status);

            const response = await fetch(`${API_BASE}/tasks?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.status}`);
            }

            const data = await response.json();
            const tasks = Array.isArray(data) ? data : data.data || [];

            return {
                data: tasks.map(transformTask),
                pagination: data.pagination,
            };
        } catch (error) {
            console.error('Error fetching tasks:', error);
            return { data: [], pagination: null };
        }
    },
};

// ============================================================================
// REGISTERED CUSTOMERS API
// ============================================================================
export const customersAPI = {
    async create(formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to register customer');
        }

        return await response.json();
    },

    async getById(customerId: string, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch customer details');
        }

        return await response.json();
    },

    async update(customerId: string, formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Failed to update customer');
        }

        return await response.json();
    },

    async list(token: string, filters?: { page?: number; limit?: number; status?: string }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));
            if (filters?.status) params.append('status', filters.status);

            const response = await fetch(`${API_BASE}/registered-customers?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch customers');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    },
};

// ============================================================================
// ATTENDANCE API
// ============================================================================
export const attendanceAPI = {
    async getTodayStatus(token: string) {
        const response = await fetch(`${API_BASE}/attendance/today`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch attendance status');
        }

        return await response.json();
    },

    async punchIn(formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/attendance/punch-in`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record punch-in');
        }

        return await response.json();
    },

    async punchOut(formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/attendance/punch-out`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record punch-out');
        }

        return await response.json();
    },

    async getHistory(token: string, filters?: { page?: number; limit?: number; date_from?: string; date_to?: string; employee_id?: string }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));
            if (filters?.date_from) params.append('date_from', filters.date_from);
            if (filters?.date_to) params.append('date_to', filters.date_to);
            if (filters?.employee_id) params.append('employee_id', filters.employee_id);

            const response = await fetch(`${API_BASE}/attendance?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch attendance history');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching attendance history:', error);
            throw error;
        }
    },
};

// ============================================================================
// EMPLOYEES API
// ============================================================================
export const employeesAPI = {
    async getById(employeeId: string, token: string) {
        const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch employee details');
        }

        return await response.json();
    },

    async list(token: string, filters?: { page?: number; limit?: number }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));

            const response = await fetch(`${API_BASE}/employees?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch employees');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching employees:', error);
            throw error;
        }
    },

    async updateProfile(employeeId: string, data: any, token: string) {
        const response = await fetch(`${API_BASE}/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }

        return await response.json();
    },
};

// ============================================================================
// TRANSACTION LOGS API
// ============================================================================
export const transactionLogsAPI = {
    async list(token: string, filters?: { page?: number; limit?: number }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));

            const response = await fetch(`${API_BASE}/transaction-logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch transaction logs');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching transaction logs:', error);
            throw error;
        }
    },

    async recordPayment(customerId: number, amount: string, proofFile: File, token: string) {
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('proof', proofFile);

            const response = await fetch(`${API_BASE}/transaction-logs/${customerId}/payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to record payment');
            }

            return await response.json();
        } catch (error) {
            console.error('Error recording payment:', error);
            throw error;
        }
    },
};

// ============================================================================
// ADDITIONAL DOCUMENTS API
// ============================================================================
export const additionalDocumentsAPI = {
    async uploadFinanceDocuments(customerId: number, quotationFile: File, approvalFile: File, token: string) {
        try {
            const formData = new FormData();
            formData.append('quotation', quotationFile);
            formData.append('approval', approvalFile);

            const response = await fetch(`${API_BASE}/additional-documents/${customerId}/finance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload finance documents');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading finance documents:', error);
            throw error;
        }
    },

    async uploadRegistrationDocuments(
        customerId: number,
        applicationForm: File,
        feasibilityForm: File,
        etokenDocument: File,
        netMeteringDocument: File,
        token: string
    ) {
        try {
            const formData = new FormData();
            formData.append('application_form', applicationForm);
            formData.append('feasibility_form', feasibilityForm);
            formData.append('etoken_document', etokenDocument);
            formData.append('net_metering_document', netMeteringDocument);

            const response = await fetch(`${API_BASE}/additional-documents/${customerId}/registration`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload registration documents');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading registration documents:', error);
            throw error;
        }
    },

    async uploadWarrantyDocument(customerId: number, warrantyFile: File, token: string) {
        try {
            const formData = new FormData();
            formData.append('warranty_card_document', warrantyFile);

            const response = await fetch(`${API_BASE}/additional-documents/${customerId}/warranty`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload warranty document');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading warranty document:', error);
            throw error;
        }
    },

    async uploadDcrDocument(customerId: number, dcrFile: File, token: string) {
        try {
            const formData = new FormData();
            formData.append('dcr_document', dcrFile);

            const response = await fetch(`${API_BASE}/additional-documents/${customerId}/dcr`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload DCR document');
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading DCR document:', error);
            throw error;
        }
    },
};

// ============================================================================
// PLANT INSTALLATIONS API
// ============================================================================
export const plantInstallationsAPI = {
    async create(data: any, token: string) {
        const response = await fetch(`${API_BASE}/plant-installations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create plant installation');
        }

        return await response.json();
    },

    async getById(installationId: string, token: string) {
        const response = await fetch(`${API_BASE}/plant-installations/${installationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch plant installation details');
        }

        return await response.json();
    },

    async list(token: string, filters?: { page?: number; limit?: number }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));

            const response = await fetch(`${API_BASE}/plant-installations?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch plant installations');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching plant installations:', error);
            throw error;
        }
    },
};

// ============================================================================
// APPLICATIONS API (Customer Registration Applications)
// ============================================================================
export const registeredCustomersAPI = {
    async create(data: Record<string, any>, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to create customer');
        }

        return await response.json();
    },

    async getById(customerId: string, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch customer');
        }

        return await response.json();
    },

    async update(customerId: string, data: Record<string, any>, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers/${customerId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to update customer');
        }

        return await response.json();
    },

    async uploadDocument(customerId: string, file: File, token: string) {
        const fd = new FormData();
        fd.append('image', file);
        const response = await fetch(`${API_BASE}/registered-customers/${customerId}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: fd,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload document');
        }

        return await response.json();
    },

    async uploadDocuments(customerId: string, files: Record<string, File | File[]>, token: string) {
        const fd = new FormData();

        // Append all files with their field names
        for (const [fieldName, fileData] of Object.entries(files)) {
            if (Array.isArray(fileData)) {
                // Handle multiple files (e.g., aadhaar_photos)
                fileData.forEach(file => {
                    if (file) fd.append(fieldName, file);
                });
            } else if (fileData) {
                // Handle single file
                fd.append(fieldName, fileData);
            }
        }

        const response = await fetch(`${API_BASE}/registered-customers/${customerId}/upload-batch`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: fd,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to upload documents');
        }

        return await response.json();
    },

    async list(token: string, filters?: { page?: number; limit?: number; status?: string }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));
            if (filters?.status) params.append('status', filters.status);

            const response = await fetch(`${API_BASE}/registered-customers?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch customers');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching customers:', error);
            throw error;
        }
    },

    async getByEmployee(employeeId: string, token: string) {
        const response = await fetch(`${API_BASE}/registered-customers/employee/${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch customers by employee');
        }

        return await response.json();
    },
};

export default {
    authAPI,
    tasksAPI,
    customersAPI,
    registeredCustomersAPI,
    attendanceAPI,
    employeesAPI,
    transactionLogsAPI,
    plantInstallationsAPI,
};
