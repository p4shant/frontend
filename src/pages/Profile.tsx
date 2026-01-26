import { useAuth } from '../context/AuthContext';

function Profile() {
    const { user } = useAuth();

    if (!user) {
        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold text-text">Profile</h2>
                <p className="text-muted">No employee information available.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-text mb-6">Profile</h2>

            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md shadow-sm">
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
        </div>
    );
}

export default Profile;
