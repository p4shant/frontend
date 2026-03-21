// Centralized API Service - All API endpoints consolidated in one place
const API_BASE = import.meta.env.VITE_API_BASE;

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
    registered_customer_id?: number;
    assigned_to_name?: string;
    assigned_to_id?: number | number[];
    assigned_to_ids?: number[];
};

function normalizeStatus(status: string): 'pending' | 'in-progress' | 'completed' {
    if (status === 'inprogress') return 'in-progress';
    return status as 'pending' | 'in-progress' | 'completed';
}

function transformTask(task: any): Task {
    const customerData = task.registered_customer_data || {};
    const assignedToIds = Array.isArray(task.assigned_to_ids)
        ? task.assigned_to_ids
        : Array.isArray(task.assigned_to_id)
            ? task.assigned_to_id
            : typeof task.assigned_to_ids === 'string'
                ? (() => {
                    try {
                        const parsed = JSON.parse(task.assigned_to_ids);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })()
                : task.assigned_to_id
                    ? [Number(task.assigned_to_id)]
                    : [];

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
        registered_customer_id: task.registered_customer_id,
        registered_customer_data: task.registered_customer_data,
        assigned_to_id: task.assigned_to_id,
        assigned_to_ids: assignedToIds,
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

    async createReassignTask(data: any, token: string) {
        try {
            const response = await fetch(`${API_BASE}/tasks/reassign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create reassignment task');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating reassignment task:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create reassignment task'
            };
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

    async getTeamMembers(token: string) {
        const response = await fetch(`${API_BASE}/attendance/team/members`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch team members');
        }

        return await response.json();
    },

    async getTeamAttendance(date: string, token: string) {
        const params = new URLSearchParams();
        params.append('date', date);

        const response = await fetch(`${API_BASE}/attendance/team/status?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch team attendance');
        }

        return await response.json();
    },

    async markTeamAttendance(data: { date: string; attendance: Array<{ employee_id: number; status: 'present' | 'absent' }> }, token: string) {
        const response = await fetch(`${API_BASE}/attendance/team/mark`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to mark team attendance');
        }

        return await response.json();
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

    async getPaymentTracking(token: string) {
        try {
            const response = await fetch(`${API_BASE}/transaction-logs/payment-tracking`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payment tracking');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching payment tracking:', error);
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

// ============================================================================
// UNCONFIRMED LEADS API
// ============================================================================
export const unconfirmedLeadsAPI = {
    async create(data: Record<string, any>, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to create lead');
        }

        return await response.json();
    },

    async getById(id: string, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch lead');
        }

        return await response.json();
    },

    async update(id: string, data: Record<string, any>, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Failed to update lead');
        }

        return await response.json();
    },

    async remove(id: string, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete lead');
        }

        return await response.json();
    },

    async list(token: string, filters?: { page?: number; limit?: number; status?: string; district?: string; search?: string }) {
        try {
            const params = new URLSearchParams();
            if (filters?.page) params.append('page', String(filters.page));
            if (filters?.limit) params.append('limit', String(filters.limit));
            if (filters?.status) params.append('status', filters.status);
            if (filters?.district) params.append('district', filters.district);
            if (filters?.search) params.append('search', filters.search);

            const response = await fetch(`${API_BASE}/unconfirmed-leads?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch leads');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching leads:', error);
            throw error;
        }
    },

    async getByEmployee(employeeId: string, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads/employee/${employeeId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch leads by employee');
        }

        const data = await response.json();
        return data;
    },

    async convertToCustomer(id: string, customerId: number, token: string) {
        const response = await fetch(`${API_BASE}/unconfirmed-leads/${id}/convert`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ customerId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to convert lead');
        }

        return await response.json();
    },
};

// ============================================================================
// STATS API (Master Admin only)
// ============================================================================
export const statsAPI = {
    async getOverview(token: string) {
        const res = await fetch(`${API_BASE}/stats/overview`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed to fetch overview stats');
        return await res.json();
    },
    async getInstallationsByDistrict(token: string) {
        const res = await fetch(`${API_BASE}/stats/installations-by-district`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getEmployeesByDistrict(token: string) {
        const res = await fetch(`${API_BASE}/stats/employees-by-district`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getFinanceCases(token: string) {
        const res = await fetch(`${API_BASE}/stats/finance-cases`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getSalesExecutiveStats(token: string, filters?: { year?: number; month?: number; district?: string }) {
        const params = new URLSearchParams();
        if (filters?.year) params.append('year', String(filters.year));
        if (filters?.month) params.append('month', String(filters.month));
        if (filters?.district) params.append('district', filters.district);
        const res = await fetch(`${API_BASE}/stats/sales-executive?${params}`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getMonthlyTrend(token: string, year?: number) {
        const p = year ? `?year=${year}` : '';
        const res = await fetch(`${API_BASE}/stats/monthly-trend${p}`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getTaskPipeline(token: string) {
        const res = await fetch(`${API_BASE}/stats/task-pipeline`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getAttendanceSummary(token: string, filters?: { month?: number; year?: number }) {
        const params = new URLSearchParams();
        if (filters?.month) params.append('month', String(filters.month));
        if (filters?.year) params.append('year', String(filters.year));
        const res = await fetch(`${API_BASE}/stats/attendance-summary?${params}`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getPlantSizeDistribution(token: string) {
        const res = await fetch(`${API_BASE}/stats/plant-size-distribution`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getPaymentCollectionTrend(token: string, year?: number) {
        const p = year ? `?year=${year}` : '';
        const res = await fetch(`${API_BASE}/stats/payment-collection-trend${p}`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getSpecialRequirements(token: string) {
        const res = await fetch(`${API_BASE}/stats/special-requirements`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
    async getRecentActivity(token: string) {
        const res = await fetch(`${API_BASE}/stats/recent-activity`, { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
    },
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================
export const notificationsAPI = {
    async listNotifications(token: string, filters?: { is_read?: boolean; is_archived?: boolean; page?: number; limit?: number }) {
        let url = `${API_BASE}/notifications`;
        if (filters) {
            const params = new URLSearchParams();
            if (filters.is_read !== undefined) params.append('is_read', String(filters.is_read));
            if (filters.is_archived !== undefined) params.append('is_archived', String(filters.is_archived));
            if (filters.page) params.append('page', String(filters.page));
            if (filters.limit) params.append('limit', String(filters.limit));
            if (params.toString()) url += '?' + params.toString();
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch notifications');
        return await response.json();
    },

    async getNotificationById(id: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch notification');
        return await response.json();
    },

    async getEmployeeNotifications(employeeId: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/employee/${employeeId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch employee notifications');
        return await response.json();
    },

    async getUnreadCount(employeeId: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/employee/${employeeId}/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch unread count');
        return await response.json();
    },

    async markAsRead(id: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/${id}/mark-as-read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to mark notification as read');
        return await response.json();
    },

    async markAsUnread(id: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/${id}/mark-as-unread`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to mark notification as unread');
        return await response.json();
    },

    async markAsArchived(id: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/${id}/mark-as-archived`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to archive notification');
        return await response.json();
    },

    async markMultipleAsRead(notificationIds: string[], token: string) {
        const response = await fetch(`${API_BASE}/notifications/bulk/mark-as-read`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notification_ids: notificationIds }),
        });

        if (!response.ok) throw new Error('Failed to mark notifications as read');
        return await response.json();
    },

    async deleteNotification(id: string, token: string) {
        const response = await fetch(`${API_BASE}/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to delete notification');
        return await response.json();
    },

    async sendForgotPunchOutReminder(token: string, message?: string) {
        const response = await fetch(`${API_BASE}/notifications/send/forgot-punch-out`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message || 'You forgot to punch out today. Please mark your punch-out time.' }),
        });

        if (!response.ok) throw new Error('Failed to send punch-out reminders');
        return await response.json();
    },
};

// ============================================================================
// PUSH NOTIFICATIONS API
// ============================================================================
export const pushAPI = {
    async getVapidPublicKey(): Promise<string> {
        const response = await fetch(`${API_BASE}/push/vapid-public-key`, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch VAPID public key');
        const data = await response.json();
        return data.publicKey as string;
    },

    async subscribe(subscription: PushSubscriptionJSON, token: string) {
        const response = await fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to subscribe for push notifications' }));
            throw new Error(error.message || 'Failed to subscribe for push notifications');
        }

        return await response.json();
    },

    async unsubscribe(endpoint: string, token: string) {
        const response = await fetch(`${API_BASE}/push/unsubscribe`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Failed to unsubscribe from push notifications' }));
            throw new Error(error.message || 'Failed to unsubscribe from push notifications');
        }

        return await response.json();
    },
};

// ============================================================================
// STOCK MANAGEMENT API
// ============================================================================
export const stockAPI = {
    // --- Config ---
    async getConfig(token: string) {
        const response = await fetch(`${API_BASE}/stock/config`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch stock config');
        return await response.json();
    },

    // --- Inventory ---
    async getInventory(token: string, filters?: { district?: string; brand?: string; dcr_type?: string; component?: string }) {
        const params = new URLSearchParams();
        if (filters?.district) params.set('district', filters.district);
        if (filters?.brand) params.set('brand', filters.brand);
        if (filters?.dcr_type) params.set('dcr_type', filters.dcr_type);
        if (filters?.component) params.set('component', filters.component);
        const response = await fetch(`${API_BASE}/stock/inventory?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch inventory');
        return await response.json();
    },

    async getInventorySummary(token: string) {
        const response = await fetch(`${API_BASE}/stock/inventory/summary`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch inventory summary');
        return await response.json();
    },

    async validateStock(token: string, data: { district: string; brand: string; dcr_type: string; items: { component: string; sub_type?: string | null; actual_quantity: number }[] }) {
        const response = await fetch(`${API_BASE}/stock/inventory/validate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to validate stock');
        return await response.json();
    },

    // --- Inward ---
    async createInward(token: string, data: any) {
        const response = await fetch(`${API_BASE}/stock/inward`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create inward record');
        }
        return await response.json();
    },

    async listInward(token: string, filters?: { page?: number; limit?: number; district?: string; brand?: string; dcr_type?: string; from_date?: string; to_date?: string }) {
        const params = new URLSearchParams();
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        if (filters?.district) params.set('district', filters.district);
        if (filters?.brand) params.set('brand', filters.brand);
        if (filters?.dcr_type) params.set('dcr_type', filters.dcr_type);
        if (filters?.from_date) params.set('from_date', filters.from_date);
        if (filters?.to_date) params.set('to_date', filters.to_date);
        const response = await fetch(`${API_BASE}/stock/inward?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch inward records');
        return await response.json();
    },

    async getInwardById(token: string, id: number) {
        const response = await fetch(`${API_BASE}/stock/inward/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch inward record');
        return await response.json();
    },

    // --- Outward ---
    async createOutward(token: string, data: any) {
        const response = await fetch(`${API_BASE}/stock/outward`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            const error = new Error(err.message || 'Failed to create outward record') as any;
            error.shortages = err.shortages;
            throw error;
        }
        return await response.json();
    },

    async listOutward(token: string, filters?: { page?: number; limit?: number; from_district?: string; dispatch_type?: string; brand?: string; dcr_type?: string; from_date?: string; to_date?: string }) {
        const params = new URLSearchParams();
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        if (filters?.from_district) params.set('from_district', filters.from_district);
        if (filters?.dispatch_type) params.set('dispatch_type', filters.dispatch_type);
        if (filters?.brand) params.set('brand', filters.brand);
        if (filters?.dcr_type) params.set('dcr_type', filters.dcr_type);
        if (filters?.from_date) params.set('from_date', filters.from_date);
        if (filters?.to_date) params.set('to_date', filters.to_date);
        const response = await fetch(`${API_BASE}/stock/outward?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch outward records');
        return await response.json();
    },

    async getOutwardById(token: string, id: number) {
        const response = await fetch(`${API_BASE}/stock/outward/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch outward record');
        return await response.json();
    },

    // --- Dealers ---
    async listDealers(token: string) {
        const response = await fetch(`${API_BASE}/stock/dealers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch dealers');
        return await response.json();
    },

    async createDealer(token: string, name: string) {
        const response = await fetch(`${API_BASE}/stock/dealers`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create dealer');
        }
        return await response.json();
    },

    // --- Movement Log ---
    async listMovementLog(token: string, filters?: { page?: number; limit?: number; district?: string; component?: string; brand?: string; dcr_type?: string; movement_type?: string; from_date?: string; to_date?: string }) {
        const params = new URLSearchParams();
        if (filters?.page) params.set('page', String(filters.page));
        if (filters?.limit) params.set('limit', String(filters.limit));
        if (filters?.district) params.set('district', filters.district);
        if (filters?.component) params.set('component', filters.component);
        if (filters?.brand) params.set('brand', filters.brand);
        if (filters?.dcr_type) params.set('dcr_type', filters.dcr_type);
        if (filters?.movement_type) params.set('movement_type', filters.movement_type);
        if (filters?.from_date) params.set('from_date', filters.from_date);
        if (filters?.to_date) params.set('to_date', filters.to_date);
        const response = await fetch(`${API_BASE}/stock/movement-log?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch movement log');
        return await response.json();
    },

    // --- Customer Search ---
    async searchCustomers(token: string, query: string) {
        const response = await fetch(`${API_BASE}/stock/customers/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to search customers');
        return await response.json();
    },

    // --- Daily Snapshots ---
    async getDailySnapshots(token: string, filters?: { date?: string; district?: string; from_date?: string; to_date?: string }) {
        const params = new URLSearchParams();
        if (filters?.date) params.set('date', filters.date);
        if (filters?.district) params.set('district', filters.district);
        if (filters?.from_date) params.set('from_date', filters.from_date);
        if (filters?.to_date) params.set('to_date', filters.to_date);
        const response = await fetch(`${API_BASE}/stock/snapshots?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch daily snapshots');
        return await response.json();
    },

    async triggerSnapshot(token: string) {
        const response = await fetch(`${API_BASE}/stock/snapshots/trigger`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to trigger snapshot');
        return await response.json();
    },

    // --- Stock Corrections (Master Admin) ---
    async correctMovementLog(token: string, logId: number, data: { new_quantity_change: number; reason: string }) {
        const response = await fetch(`${API_BASE}/stock/movement-log/${logId}/correct`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to correct movement log');
        }
        return await response.json();
    },
};

// ============================================================================
// QA TRAVEL ALLOWANCE API
// ============================================================================
export const qaTravelAPI = {
    async getTodayStatus(token: string) {
        const response = await fetch(`${API_BASE}/qa-travel/today`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch travel status');
        return await response.json();
    },

    async punchIn(formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/qa-travel/punch-in`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record travel punch-in');
        }
        return await response.json();
    },

    async punchOut(formData: FormData, token: string) {
        const response = await fetch(`${API_BASE}/qa-travel/punch-out`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to record travel punch-out');
        }
        return await response.json();
    },

    async getLogs(
        token: string,
        filters?: { page?: number; limit?: number; date_from?: string; date_to?: string; employee_id?: string }
    ) {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.date_from) params.append('date_from', filters.date_from);
        if (filters?.date_to) params.append('date_to', filters.date_to);
        if (filters?.employee_id) params.append('employee_id', filters.employee_id);
        const response = await fetch(`${API_BASE}/qa-travel/logs?${params}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch travel logs');
        return await response.json();
    },

    async getLogDetail(token: string, id: number) {
        const response = await fetch(`${API_BASE}/qa-travel/logs/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch travel log detail');
        return await response.json();
    },

    async searchCustomers(token: string, query: string) {
        const response = await fetch(
            `${API_BASE}/qa-travel/customers/search?q=${encodeURIComponent(query)}`,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (!response.ok) throw new Error('Failed to search customers');
        return await response.json();
    },

    async getQATesters(token: string) {
        const response = await fetch(`${API_BASE}/qa-travel/testers`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch QA Testers');
        return await response.json();
    },
};

export default {
    authAPI,
    tasksAPI,
    customersAPI,
    registeredCustomersAPI,
    unconfirmedLeadsAPI,
    attendanceAPI,
    qaTravelAPI,
    employeesAPI,
    transactionLogsAPI,
    plantInstallationsAPI,
    statsAPI,
    notificationsAPI,
    stockAPI,
};
