import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { unconfirmedLeadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type FormState = {
    name: string;
    district: string;
    phone_number: string;
    confirmation_percentage: number;
    notes: string;
};

const UP_DISTRICTS = [
    'Ghazipur',
    'Varanasi',
    'Azamgarh',
    'Mau',
    'Ballia',
    'Other'
];

export default function UnconfirmedLeadForm({
    editData,
    onSuccess,
    onCancel
}: {
    editData?: any;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<FormState>({
        name: '',
        district: '',
        phone_number: '',
        confirmation_percentage: 0,
        notes: ''
    });

    useEffect(() => {
        if (editData) {
            setForm({
                name: editData.name || '',
                district: editData.district || '',
                phone_number: editData.phone_number || '',
                confirmation_percentage: editData.confirmation_percentage || 0,
                notes: editData.notes || ''
            });
        }
    }, [editData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, confirmation_percentage: parseInt(e.target.value) }));
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage <= 30) return 'text-red-600 bg-red-50 border-red-200';
        if (percentage <= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    const getSliderTrackColor = (percentage: number) => {
        if (percentage <= 30) return 'bg-gradient-to-r from-red-500 to-red-400';
        if (percentage <= 60) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
        return 'bg-gradient-to-r from-green-500 to-emerald-400';
    };

    const validateForm = () => {
        if (!form.name.trim()) {
            showToast('Name is required', 'error');
            return false;
        }
        if (!form.district) {
            showToast('District is required', 'error');
            return false;
        }
        if (!form.phone_number.trim()) {
            showToast('Phone number is required', 'error');
            return false;
        }
        if (!/^\d{10}$/.test(form.phone_number.trim())) {
            showToast('Phone number must be exactly 10 digits', 'error');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setLoading(true);
            if (editData?.id) {
                await unconfirmedLeadsAPI.update(editData.id, form, token!);
                showToast('Lead updated successfully', 'success');
            } else {
                await unconfirmedLeadsAPI.create(form, token!);
                showToast('Lead created successfully', 'success');
            }
            onSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save lead';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800">
                        {editData ? 'Edit Unconfirmed Lead' : 'Add Unconfirmed Lead'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                        type="button"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                            placeholder="Enter customer name"
                            required
                        />
                    </div>

                    {/* District */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            District <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="district"
                            value={form.district}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                            required
                        >
                            <option value="">Select District</option>
                            {UP_DISTRICTS.map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                            ))}
                        </select>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            name="phone_number"
                            value={form.phone_number}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                            placeholder="10-digit mobile number"
                            pattern="\d{10}"
                            maxLength={10}
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Enter 10-digit mobile number</p>
                    </div>

                    {/* Confirmation Percentage */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirmation Percentage
                        </label>
                        <div className="space-y-4">
                            {/* Slider Container with Custom Styling */}
                            <div className="relative pt-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-600 font-medium">0%</span>
                                    <span className={`text-3xl font-bold px-6 py-2 rounded-xl border-2 shadow-sm ${getPercentageColor(form.confirmation_percentage)}`}>
                                        {form.confirmation_percentage}%
                                    </span>
                                    <span className="text-xs text-slate-600 font-medium">100%</span>
                                </div>

                                {/* Custom Styled Slider */}
                                <div className="relative">
                                    {/* Background Track */}
                                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                        {/* Filled Track */}
                                        <div
                                            className={`h-full transition-all duration-300 ${getSliderTrackColor(form.confirmation_percentage)}`}
                                            style={{ width: `${form.confirmation_percentage}%` }}
                                        />
                                    </div>

                                    {/* Actual Slider (invisible but functional) */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={form.confirmation_percentage}
                                        onChange={handleSliderChange}
                                        className="absolute top-0 left-0 w-full h-3 opacity-0 cursor-pointer"
                                    />

                                    {/* Custom Thumb */}
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-3 border-slate-400 rounded-full shadow-lg pointer-events-none transition-all duration-300"
                                        style={{ left: `calc(${form.confirmation_percentage}% - 12px)` }}
                                    >
                                        <div className={`w-full h-full rounded-full ${getSliderTrackColor(form.confirmation_percentage)} opacity-50`} />
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-slate-600 font-medium">Low (0-30%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <span className="text-slate-600 font-medium">Medium (31-60%)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-slate-600 font-medium">High (61-100%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={4}
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                            placeholder="Additional notes about this lead..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : editData ? 'Update Lead' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
