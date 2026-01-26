import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login, error: authError } = useAuth();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!phoneNumber.trim() || !password.trim()) {
            setError('Phone number and password are required');
            return;
        }

        setLoading(true);

        try {
            await login(phoneNumber, password);
            navigate('/');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg via-bg-alt to-bg px-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-panel border border-blue/12 rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue to-blue/80 px-6 py-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">DataSphere</h1>
                        <p className="text-blue/80 text-sm">Solar CRM System</p>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Error Messages */}
                        {(error || authError) && (
                            <div className="rounded-lg border border-red/20 bg-red/10 text-red px-4 py-3 text-sm">
                                {error || authError}
                            </div>
                        )}

                        {/* Phone Number */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-text mb-1.5">
                                Phone Number
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter your phone number"
                                className="w-full px-4 py-2.5 rounded-lg border border-blue/20 bg-bg text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-transparent transition"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text mb-1.5">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full px-4 py-2.5 rounded-lg border border-blue/20 bg-bg text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-blue/50 focus:border-transparent transition"
                                disabled={loading}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 px-4 py-2.5 rounded-lg bg-blue text-bg font-semibold hover:bg-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-bg/50 border-t border-blue/12 text-center text-xs text-text-dim">
                        Demo credentials (if available from your admin)
                    </div>
                </div>
            </div>
        </div>
    );
}
