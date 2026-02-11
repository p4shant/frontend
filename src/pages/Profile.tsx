import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Profile() {
    const { user, token } = useAuth();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordForm({
            ...passwordForm,
            [e.target.name]: e.target.value
        });
        setError('');
        setSuccess('');
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setError('Please fill in all fields');
            return;
        }

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setError('New passwords do not match');
            return;
        }

        if (passwordForm.new_password.length < 6) {
            setError('New password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const API_BASE = import.meta.env.VITE_API_BASE || 'https://srv1304976.hstgr.cloud/api';
            const response = await fetch(`${API_BASE}/employees/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: passwordForm.current_password,
                    new_password: passwordForm.new_password
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to change password');
            }

            setSuccess('Password changed successfully!');
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });
            setIsChangingPassword(false);
        } catch (err: any) {
            setError(err.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-text">Profile</h2>
                <p className="text-muted">No employee information available.</p>
            </div>
        );
    }

    return (
        <div className="p-6 pb-32">
            <h2 className="text-2xl font-bold text-text mb-6">Profile</h2>

            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md shadow-sm mb-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Employee Name</label>
                        <p className="text-lg text-text font-medium">{user.name || 'N/A'}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Phone Number</label>
                        <p className="text-lg text-text font-medium">{user.phone_number || 'N/A'}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Employee Role</label>
                        <p className="text-lg text-text font-medium capitalize">{user.employee_role || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Password Change Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md shadow-sm">
                <h3 className="text-xl font-bold text-text mb-4">Change Password</h3>

                {!isChangingPassword ? (
                    <button
                        onClick={() => setIsChangingPassword(true)}
                        className="px-4 py-2 bg-blue text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Change Password
                    </button>
                ) : (
                    <form onSubmit={handleSubmitPassword} className="space-y-4">
                        {error && (
                            <div className="rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="rounded border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Current Password
                            </label>
                            <input
                                type="password"
                                name="current_password"
                                value={passwordForm.current_password}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                name="new_password"
                                value={passwordForm.new_password}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                name="confirm_password"
                                value={passwordForm.confirm_password}
                                onChange={handlePasswordChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Changing...' : 'Update Password'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsChangingPassword(false);
                                    setError('');
                                    setSuccess('');
                                    setPasswordForm({
                                        current_password: '',
                                        new_password: '',
                                        confirm_password: ''
                                    });
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Profile;

