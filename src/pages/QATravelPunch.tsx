import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { qaTravelAPI } from '../services/api';
import { useCameraCapture } from '../hooks/useCameraCapture';
import {
    Gauge, MapPin, Clock, CheckCircle, AlertCircle,
    Camera, RotateCcw, Plus, Trash2, ChevronRight, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type CustomerVisit = {
    id: string;           // local uuid for list key
    customer_id: number | null;
    customer_name: string;
    status: 'Completed' | 'Pending' | '';
    pending_reason: 'Wiring not Completed' | 'Inverter Other Brand' | '';
    // search state
    query: string;
    suggestions: { id: number; applicant_name: string; district: string }[];
    showSuggestions: boolean;
};

type TravelLog = {
    exists: boolean;
    id?: number;
    start_reading?: number;
    start_image_url?: string;
    start_latitude?: number;
    start_longitude?: number;
    start_time?: string;
    end_reading?: number;
    end_image_url?: string;
    end_latitude?: number;
    end_longitude?: number;
    end_time?: string;
    total_distance?: number;
    customers?: {
        id: number;
        customer_name: string;
        status: string;
        pending_reason: string | null;
    }[];
};

type PunchStep = 'idle' | 'camera' | 'reading' | 'customers';

const PENDING_REASONS = ['Wiring not Completed', 'Inverter Other Brand'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTimeIST(time?: string | null) {
    if (!time) return '—';
    let iso = time;
    if (time.includes(' ') && !time.includes('T')) iso = time.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
    });
}

function getTodayDateIST() {
    return new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

function newVisit(): CustomerVisit {
    return {
        id: Math.random().toString(36).slice(2),
        customer_id: null, customer_name: '',
        status: '', pending_reason: '',
        query: '', suggestions: [], showSuggestions: false,
    };
}

// ─── CameraModal ──────────────────────────────────────────────────────────

function CameraModal({
    title,
    onCancel,
    onDone,
}: {
    title: string;
    onCancel: () => void;
    onDone: (dataUrl: string, reading: number, location: { latitude: number; longitude: number; accuracy?: number }) => void;
}) {
    const { videoRef, canvasRef, capturedImage, location, cameraError, startSession, capture, retake, cancelSession } = useCameraCapture();
    const [reading, setReading] = useState('');
    const [readingErr, setReadingErr] = useState('');
    const [started, setStarted] = useState(false);

    useEffect(() => {
        startSession('environment').then(() => setStarted(true));
        return () => { cancelSession(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = () => {
        const val = parseFloat(reading);
        if (isNaN(val) || val < 0) {
            setReadingErr('Enter a valid speedometer reading (≥ 0)');
            return;
        }
        if (!location) {
            setReadingErr('GPS location not captured. Please retry.');
            return;
        }
        if (!capturedImage) {
            setReadingErr('Please capture the speedometer photo first.');
            return;
        }
        onDone(capturedImage, val, location);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60">
                <span className="text-white font-semibold text-base">{title}</span>
                <button onClick={() => { cancelSession(); onCancel(); }} className="text-white/80 hover:text-white">
                    <X size={22} />
                </button>
            </div>

            {cameraError && (
                <div className={`mx-4 mt-2 text-sm rounded-lg px-3 py-2 ${cameraError.includes('GPS') ? 'bg-yellow-600 text-white' : 'bg-red-800 text-white'}`}>
                    {cameraError}
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 overflow-y-auto py-3">
                {!capturedImage ? (
                    <>
                        {/* Viewfinder */}
                        <div className="relative w-full max-w-sm rounded-xl overflow-hidden bg-black border border-white/20">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full object-cover"
                                style={{ maxHeight: '50vh' }}
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none" />
                            {location && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] rounded px-1.5 py-0.5">
                                    <MapPin size={10} />
                                    {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                                </div>
                            )}
                        </div>
                        <p className="text-white/70 text-xs text-center">Point camera at your vehicle speedometer</p>
                        <button
                            onClick={capture}
                            disabled={!started || (!!cameraError && !cameraError.includes('GPS'))}
                            className="flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-3 rounded-full disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            <Camera size={18} /> {started ? 'Capture Photo' : 'Starting camera…'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Preview + reading input */}
                        <div className="w-full max-w-sm">
                            <img src={capturedImage} alt="Speedometer" className="w-full rounded-xl border border-white/20 object-cover" style={{ maxHeight: '40vh' }} />
                        </div>

                        <div className="w-full max-w-sm bg-white rounded-xl p-4 space-y-3">
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Speedometer Reading (km)</span>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0"
                                    value={reading}
                                    onChange={e => { setReading(e.target.value); setReadingErr(''); }}
                                    placeholder="e.g. 45678.5"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                {readingErr && <p className="text-red-500 text-xs mt-1">{readingErr}</p>}
                            </label>

                            {location && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <MapPin size={10} className="text-green-600" />
                                    GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => retake('environment')}
                                    className="flex-1 flex items-center justify-center gap-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm"
                                >
                                    <RotateCcw size={14} /> Retake
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="flex-2 flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white font-bold py-2.5 rounded-lg text-sm"
                                >
                                    Continue <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── CustomerRow ──────────────────────────────────────────────────────────

function CustomerRow({
    visit,
    token,
    onChange,
    onRemove,
}: {
    visit: CustomerVisit;
    token: string;
    onChange: (updated: CustomerVisit) => void;
    onRemove: () => void;
}) {
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleNameChange = (val: string) => {
        const updated = { ...visit, query: val, customer_name: val, customer_id: null, showSuggestions: true };
        onChange(updated);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (val.length >= 1) {
            debounceRef.current = setTimeout(async () => {
                try {
                    const results = await qaTravelAPI.searchCustomers(token, val);
                    onChange({ ...updated, suggestions: results });
                } catch { /* ignore */ }
            }, 300);
        } else {
            onChange({ ...updated, suggestions: [] });
        }
    };

    const selectSuggestion = (s: { id: number; applicant_name: string; district: string }) => {
        onChange({ ...visit, customer_id: s.id, customer_name: s.applicant_name, query: s.applicant_name, showSuggestions: false, suggestions: [] });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5">
            {/* Customer name with search */}
            <div className="relative">
                <label className="text-xs font-medium text-gray-600 block mb-1">Customer Name *</label>
                <input
                    type="text"
                    value={visit.query}
                    onChange={e => handleNameChange(e.target.value)}
                    onBlur={() => setTimeout(() => onChange({ ...visit, showSuggestions: false }), 200)}
                    placeholder="Search or type customer name…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {visit.showSuggestions && visit.suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                        {visit.suggestions.map(s => (
                            <button
                                key={s.id}
                                onMouseDown={() => selectSuggestion(s)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                            >
                                <span className="font-medium">{s.applicant_name}</span>
                                <span className="text-xs text-gray-400 ml-2">{s.district}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Status toggle */}
            <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">QA Status *</label>
                <div className="flex gap-2">
                    {(['Completed', 'Pending'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => onChange({ ...visit, status: s, pending_reason: '' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${visit.status === s
                                ? s === 'Completed'
                                    ? 'bg-green-600 text-white border-green-600'
                                    : 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-gray-600 border-gray-300'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pending reason */}
            {visit.status === 'Pending' && (
                <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Reason *</label>
                    <select
                        value={visit.pending_reason}
                        onChange={e => onChange({ ...visit, pending_reason: e.target.value as typeof visit.pending_reason })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                        <option value="">Select reason…</option>
                        {PENDING_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            )}

            {/* Remove */}
            <button
                onClick={onRemove}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1"
            >
                <Trash2 size={12} /> Remove
            </button>
        </div>
    );
}

// ─── ImageThumb ───────────────────────────────────────────────────────────

function ImageThumb({ url, label, onPreview }: { url?: string | null; label: string; onPreview: (url: string, title: string) => void }) {
    const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || (import.meta.env.VITE_API_BASE?.replace('/api', '') ?? '');
    if (!url) return <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><Camera size={18} /></div>;
    const fullUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
    return (
        <button onClick={() => onPreview(fullUrl, label)} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity flex-shrink-0">
            <img src={fullUrl} alt={label} className="w-full h-full object-cover" />
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function QATravelPunch() {
    const { token } = useAuth();
    const [log, setLog] = useState<TravelLog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [processing, setProcessing] = useState(false);

    // Modal state
    const [punchStep, setPunchStep] = useState<PunchStep>('idle');
    const [activeAction, setActiveAction] = useState<'start' | 'end'>('start');

    // End-of-day step 1 result (before customers)
    const [endCapture, setEndCapture] = useState<{ dataUrl: string; reading: number; location: { latitude: number; longitude: number; accuracy?: number } } | null>(null);

    // Customers list
    const [customers, setCustomers] = useState<CustomerVisit[]>([newVisit()]);

    // Image preview modal
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');

    const { dataURLtoFile } = useCameraCapture();

    const fetchStatus = useCallback(async () => {
        if (!token) return;
        try {
            const data = await qaTravelAPI.getTodayStatus(token);
            setLog(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    // ── Punch-In submit ──────────────────────────────────────────────────

    const handleStartDone = async (dataUrl: string, reading: number, location: { latitude: number; longitude: number; accuracy?: number }) => {
        setPunchStep('idle');
        setProcessing(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('photo', dataURLtoFile(dataUrl, `speedometer_start_${Date.now()}.jpg`));
            formData.append('reading', String(reading));
            formData.append('location', JSON.stringify(location));
            const result = await qaTravelAPI.punchIn(formData, token!);
            setLog(result);
            setSuccess('Day started! Attendance & travel recorded.');
        } catch (e: any) {
            setError(e?.message || 'Failed to record punch-in');
        } finally {
            setProcessing(false);
        }
    };

    // ── Punch-Out: step 1 done (photo captured) ─────────────────────────

    const handleEndCaptureDone = (dataUrl: string, reading: number, location: { latitude: number; longitude: number; accuracy?: number }) => {
        setEndCapture({ dataUrl, reading, location });
        setPunchStep('customers');
    };

    // ── Punch-Out: submit with customers ────────────────────────────────

    const validateCustomers = (): string | null => {
        for (let i = 0; i < customers.length; i++) {
            const c = customers[i];
            if (!c.customer_name.trim()) return `Customer #${i + 1}: name is required`;
            if (!c.status) return `Customer #${i + 1}: status (Completed/Pending) is required`;
            if (c.status === 'Pending' && !c.pending_reason) return `Customer #${i + 1}: pending reason is required`;
        }
        return null;
    };

    const handleEndSubmit = async () => {
        if (!endCapture) return;
        const validErr = validateCustomers();
        if (validErr) { setError(validErr); return; }

        setProcessing(true);
        setError('');
        setPunchStep('idle');
        try {
            const formData = new FormData();
            formData.append('photo', dataURLtoFile(endCapture.dataUrl, `speedometer_end_${Date.now()}.jpg`));
            formData.append('reading', String(endCapture.reading));
            formData.append('location', JSON.stringify(endCapture.location));
            const payload = customers.map(c => ({
                customer_id: c.customer_id,
                customer_name: c.customer_name.trim(),
                status: c.status,
                pending_reason: c.status === 'Pending' ? c.pending_reason : undefined,
            }));
            formData.append('customers', JSON.stringify(payload));
            const result = await qaTravelAPI.punchOut(formData, token!);
            setLog(result);
            setEndCapture(null);
            setCustomers([newVisit()]);
            setSuccess('Day ended! Total distance recorded.');
        } catch (e: any) {
            setError(e?.message || 'Failed to record punch-out');
        } finally {
            setProcessing(false);
        }
    };

    const updateCustomer = (idx: number, updated: CustomerVisit) => {
        setCustomers(prev => prev.map((c, i) => i === idx ? updated : c));
    };

    const removeCustomer = (idx: number) => {
        setCustomers(prev => prev.filter((_, i) => i !== idx));
    };

    // ─── Loading ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    const dayStarted = log?.exists && !!log.start_time;
    const dayEnded = dayStarted && !!log?.end_time;

    return (
        <div className="max-w-lg mx-auto px-3 py-4 space-y-4">
            {/* Camera modals */}
            {punchStep === 'camera' && activeAction === 'start' && (
                <CameraModal
                    title="📷 Capture Speedometer — Start of Day"
                    onCancel={() => setPunchStep('idle')}
                    onDone={handleStartDone}
                />
            )}
            {punchStep === 'camera' && activeAction === 'end' && (
                <CameraModal
                    title="📷 Capture Speedometer — End of Day"
                    onCancel={() => { setPunchStep('idle'); setEndCapture(null); }}
                    onDone={handleEndCaptureDone}
                />
            )}

            {/* Image preview */}
            {previewUrl && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <p className="text-white text-sm font-semibold mb-3">{previewTitle}</p>
                    <img src={previewUrl} alt={previewTitle} className="max-w-full max-h-[80vh] rounded-xl object-contain" />
                    <button className="mt-4 bg-white/20 text-white px-4 py-2 rounded-full text-sm">Close</button>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                    <Gauge className="text-teal-600" size={22} />
                    <h1 className="text-lg font-bold text-gray-900">Travel Log</h1>
                </div>
                <p className="text-xs text-gray-500">{getTodayDateIST()}</p>
                <div className="mt-2">
                    {!dayStarted && (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                            ⏸ Not Started
                        </span>
                    )}
                    {dayStarted && !dayEnded && (
                        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            🚗 Day Started
                        </span>
                    )}
                    {dayEnded && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <CheckCircle size={12} /> Day Complete
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2.5 text-sm">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
            )}
            {success && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2.5 text-sm">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{success}</span>
                    <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600"><X size={14} /></button>
                </div>
            )}

            {/* ── State A: Not started ── */}
            {!dayStarted && (
                <button
                    onClick={() => { setActiveAction('start'); setPunchStep('camera'); }}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-base py-4 rounded-2xl shadow-md transition-all disabled:opacity-60 min-h-[56px]"
                >
                    {processing
                        ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        : <><Gauge size={20} /> 🚗 Start Day</>
                    }
                </button>
            )}

            {/* ── Start summary card (when started) ── */}
            {dayStarted && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Start of Day</span>
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Clock size={10} /> {formatTimeIST(log?.start_time)}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ImageThumb url={log?.start_image_url} label="Start Speedometer" onPreview={(url, t) => { setPreviewUrl(url); setPreviewTitle(t); }} />
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{log?.start_reading?.toLocaleString()} km</p>
                            {log?.start_latitude && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                    <MapPin size={10} /> {Number(log.start_latitude).toFixed(4)}, {Number(log.start_longitude).toFixed(4)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── State B: Started, customers step ── */}
            {dayStarted && !dayEnded && punchStep === 'customers' && endCapture && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">End of Day — Step 2</h2>
                        <button onClick={() => { setPunchStep('idle'); setEndCapture(null); }} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <img src={endCapture.dataUrl} alt="End Speedometer" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        <div>
                            <p className="text-lg font-bold text-gray-900">{endCapture.reading.toLocaleString()} km</p>
                            <p className="text-xs text-green-600 font-medium">
                                +{Math.max(0, endCapture.reading - (log?.start_reading || 0)).toFixed(1)} km from start
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Customers Visited Today</h3>
                            <button
                                onClick={() => setCustomers(prev => [...prev, newVisit()])}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {customers.length === 0 && (
                            <p className="text-xs text-red-500 text-center py-2">At least 1 customer visit is required.</p>
                        )}

                        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                            {customers.map((c, i) => (
                                <CustomerRow
                                    key={c.id}
                                    visit={c}
                                    token={token!}
                                    onChange={updated => updateCustomer(i, updated)}
                                    onRemove={() => removeCustomer(i)}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleEndSubmit}
                        disabled={processing || customers.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-base py-3.5 rounded-2xl disabled:opacity-60 transition-all min-h-[52px]"
                    >
                        {processing
                            ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            : '✅ Submit End of Day'
                        }
                    </button>
                </div>
            )}

            {/* ── State B: End Day button ── */}
            {dayStarted && !dayEnded && punchStep === 'idle' && (
                <button
                    onClick={() => { setActiveAction('end'); setPunchStep('camera'); setError(''); }}
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-base py-4 rounded-2xl shadow-md transition-all disabled:opacity-60 min-h-[56px]"
                >
                    {processing
                        ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        : <>🏁 End Day</>
                    }
                </button>
            )}

            {/* ── State C: Day complete summary ── */}
            {dayEnded && (
                <>
                    {/* Total distance highlight */}
                    <div className="bg-teal-600 rounded-2xl p-4 text-white text-center shadow-md">
                        <p className="text-xs font-medium opacity-80 mb-1">Total Distance Today</p>
                        <p className="text-4xl font-black">{Number(log?.total_distance || 0).toFixed(1)} <span className="text-2xl font-bold">km</span></p>
                        <p className="text-xs opacity-70 mt-1">
                            {Number(log?.start_reading).toLocaleString()} → {Number(log?.end_reading).toLocaleString()}
                        </p>
                    </div>

                    {/* End summary card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">End of Day</span>
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Clock size={10} /> {formatTimeIST(log?.end_time)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ImageThumb url={log?.end_image_url} label="End Speedometer" onPreview={(url, t) => { setPreviewUrl(url); setPreviewTitle(t); }} />
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{Number(log?.end_reading).toLocaleString()} km</p>
                                {log?.end_latitude && (
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <MapPin size={10} /> {Number(log.end_latitude).toFixed(4)}, {Number(log.end_longitude).toFixed(4)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer visits */}
                    {log?.customers && log.customers.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Customers Visited ({log.customers.length})</h3>
                            <div className="space-y-2">
                                {log.customers.map((c) => (
                                    <div key={c.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-800 font-medium">{c.customer_name}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                {c.status}
                                            </span>
                                            {c.pending_reason && (
                                                <span className="text-[10px] text-orange-600">{c.pending_reason}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
