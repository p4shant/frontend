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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8">
            {/* Warm Morning Solar Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-slate-50">
                {/* Subtle Solar Glow Pattern */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-300/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full blur-3xl"></div>
                </div>
            </div>

            {/* Login Card Container */}
            <div className="relative w-full max-w-md z-10">
                {/* Main Login Card */}
                <div className="bg-white border border-blue-200 rounded-2xl shadow-xl shadow-blue/10 overflow-hidden">

                    {/* Brand Header - Official & Warm */}
                    <div className="relative bg-blue px-8 pt-10 pb-8 text-center border-b-2 border-amber-500/80">
                        {/* Warm Solar Top Accent */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500"></div>

                        {/* Solar Icon/Badge */}
                        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-amber-500/10 backdrop-blur-sm rounded-full border-2 border-amber-500/30">
                            <svg className="w-9 h-9 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                            </svg>
                        </div>

                        {/* Company Branding */}
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">
                            KAMN ENTERPRISES
                        </h1>
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                            <div className="h-px w-6 bg-amber-500/50"></div>
                            <p className="text-amber-100 text-lg font-semibold tracking-wide">
                                Tata Solar Authorised Partner
                            </p>
                            <div className="h-px w-6 bg-amber-500/50"></div>
                        </div>
                        <p className="text-amber-100 text-xs font-medium">
                            India's Leading Solar Solutions Provider
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-5">

                        {/* Welcome Message */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-semibold text-blue mb-1">Welcome Back</h2>
                            <p className="text-sm text-blue-700">Sign in to access your dashboard</p>
                        </div>

                        {/* Error Messages */}
                        {(error || authError) && (
                            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
                                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                </svg>
                                <span>{error || authError}</span>
                            </div>
                        )}

                        {/* Phone Number Input */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-semibold text-blue-800 mb-2">
                                Phone Number
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="Enter your phone number"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-300 bg-white text-blue placeholder-blue-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-150"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-blue-800 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-blue-300 bg-white text-blue placeholder-blue-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-150"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Sign In Button - Official Portal Style */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 px-6 py-3.5 rounded-lg bg-blue text-white font-semibold text-base shadow-md hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-150"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="px-8 py-5 bg-blue-50 border-t border-blue-200">
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                            </svg>
                            <span>For new login credentials, contact your administrator</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-center gap-1.5 text-[10px] text-blue-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                            <span className="font-semibold">Secured by PM Surya Ghar Initiative</span>
                        </div>
                    </div>
                </div>

                {/* Trust Badge */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-blue-800 font-semibold">
                        Authorized Partner for PM Surya Ghar Muft Bijli Yojana
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
                            <span>Renewable Energy</span>
                        </div>
                        <div className="w-px h-3 bg-blue-300"></div>
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue"></div>
                            <span>Trusted Partner</span>
                        </div>
                        <div className="w-px h-3 bg-blue-300"></div>
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-700">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            <span>Clean Energy</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
