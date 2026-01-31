import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const EMPLOYEE_ROLES = [
    'Master Admin',
    'Operation Manager',
    'Sale Executive',
    'SFDC Admin',
    'Electrician',
    'System Admin',
    'Technician',
    'Technical Assistant',
    'Accountant'
];

const DISTRICTS = [
    'All',
    'Varanasi',
    'Ghazipur',
    'Mau',
    'Ballia',
    'Azamgarh'
];

function RegisterEmployee() {
    const { user, token } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        phone_number: '',
        district: '',
        employee_role: '',
        password: 'Kaman@123' // Default password
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.phone_number || !formData.district || !formData.employee_role) {
            setError('Please fill in all required fields');
            return;
        }

        if (!/^\d{10}$/.test(formData.phone_number)) {
            setError('Phone number must be 10 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'https://srv1304976.hstgr.cloud/api';
            const response = await fetch(`${API_BASE}/employees`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to register employee');
            }

            setSuccess('Employee registered successfully!');
            setFormData({
                name: '',
                phone_number: '',
                district: '',
                employee_role: '',
                password: 'Kaman@123'
            });
        } catch (err: any) {
            setError(err.message || 'Failed to register employee');
        } finally {
            setLoading(false);
        }
    };

    if (user?.employee_role !== 'Master Admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-6 sm:p-8 text-center max-w-md">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600 text-sm sm:text-base">This page is only available for Master Admin users.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Register New Employee</h1>

            {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 rounded border border-green-200 bg-green-50 text-green-700 px-4 py-3">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Employee Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter full name"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        District <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select District</option>
                        {DISTRICTS.map(district => (
                            <option key={district} value={district}>{district}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Employee Role <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="employee_role"
                        value={formData.employee_role}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select Role</option>
                        {EMPLOYEE_ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Default Password
                    </label>
                    <input
                        type="text"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">Default password: Kaman@123 (Employee can change it later)</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Registering...' : 'Register Employee'}
                </button>
            </form>
        </div>
    );
}

export default RegisterEmployee;
