import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';

type TodayStatus = {
    punch_in_time?: string | null;
    punch_out_time?: string | null;
    total_hours?: number | string | null;
    punch_in_image_url?: string | null;
    punch_out_image_url?: string | null;
    punch_in_latitude?: number | string | null;
    punch_in_longitude?: number | string | null;
    punch_out_latitude?: number | string | null;
    punch_out_longitude?: number | string | null;
    attendance_id?: number;
};

type Location = {
    latitude: number;
    longitude: number;
    accuracy?: number;
};

const MarkAttendance = () => {
    const { token } = useAuth();
    const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [action, setAction] = useState<'punchIn' | 'punchOut' | ''>('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const fetchTodayStatus = useCallback(async () => {
        if (!token) return;
        try {
            const response = await attendanceAPI.getTodayStatus(token);
            setTodayStatus(response);
        } catch (err) {
            console.error('Error fetching today status:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchTodayStatus();
    }, [fetchTodayStatus]);

    const getLocation = () => {
        return new Promise<Location>((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location: Location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(location);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        } catch (e) {
            setError('Camera access is required to mark attendance.');
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const handleOpenCamera = async (actionType: 'punchIn' | 'punchOut') => {
        setError('');
        setSuccess('');
        setAction(actionType);

        try {
            // Get location first
            const loc = await getLocation();
            setLocation(loc);
            setShowCamera(true);
            await startCamera();
        } catch (err) {
            setError('Location access is required to mark attendance. Please enable location services.');
        }
    };

    const handleCapture = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
    }, []);

    const handleRetake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const handleCancel = () => {
        setShowCamera(false);
        setCapturedImage(null);
        setLocation(null);
        setAction('');
        stopCamera();
    };

    const dataURLtoFile = (dataurl: string, filename: string) => {
        const arr = dataurl.split(',');
        const match = arr[0].match(/:(.*?);/);
        const mime = match ? match[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleSubmit = async () => {
        if (!capturedImage || !location) {
            setError('Please capture a photo and allow location access');
            return;
        }

        setProcessing(true);
        setError('');

        try {
            const formData = new FormData();
            const photoFile = dataURLtoFile(capturedImage, `${action}_${Date.now()}.jpg`);
            formData.append('photo', photoFile);
            formData.append('location', JSON.stringify(location));
            formData.append('deviceInfo', JSON.stringify({
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                timestamp: new Date().toISOString()
            }));

            if (action === 'punchIn') {
                await attendanceAPI.punchIn(formData, token!);
                setSuccess('Punch-in recorded successfully!');
            } else {
                await attendanceAPI.punchOut(formData, token!);
                setSuccess('Punch-out recorded successfully!');
            }

            handleCancel();
            fetchTodayStatus();
        } catch (err) {
            const msg = (err as any)?.message || 'Failed to record attendance';
            setError(msg);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
            {error && (
                <div className="mb-3 rounded border border-red/20 bg-red/10 text-red px-3 py-2">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-3 rounded border border-green/20 bg-green/10 text-green px-3 py-2">
                    {success}
                </div>
            )}

            <div className="bg-panel border border-blue/12 shadow-lg">
                <div className="p-4">
                    <h2 className="text-lg font-semibold mb-1">Today's Attendance</h2>
                    <p className="text-sm text-text-dim">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>

                    <div className="mt-4 mb-4">
                        {todayStatus ? (
                            <div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${todayStatus.punch_in_time ? 'bg-green/10 text-green border border-green/20' : 'bg-panel-strong text-text border border-blue/12'}`}>
                                        {todayStatus.punch_in_time ? 'Punched In' : 'Not Punched In'}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${todayStatus.punch_out_time ? 'bg-green/10 text-green border border-green/20' : 'bg-panel-strong text-text border border-blue/12'}`}>
                                        {todayStatus.punch_out_time ? 'Punched Out' : 'Not Punched Out'}
                                    </span>
                                </div>

                                {todayStatus.punch_in_time && (
                                    <div className="mb-3 p-3 bg-blue/5 border border-blue/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            {todayStatus.punch_in_image_url && (
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={`${import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'}${todayStatus.punch_in_image_url}`}
                                                        alt="Punch In"
                                                        className="w-20 h-20 object-cover rounded-lg border-2 border-blue/30 cursor-pointer hover:opacity-80 transition"
                                                        onClick={() => {
                                                            const API_BASE = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'
                                                            setPreviewImage(`${API_BASE}${todayStatus.punch_in_image_url}`)
                                                            setPreviewTitle('Punch In Photo')
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <p className="font-semibold text-blue mb-1">
                                                    ✓ Punch In
                                                </p>
                                                <p className="text-sm mb-1">
                                                    <strong>Time:</strong> {new Date(todayStatus.punch_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                                                </p>
                                                {(todayStatus.punch_in_latitude && todayStatus.punch_in_longitude) && (
                                                    <p className="text-xs text-text-dim">
                                                        <strong>Location:</strong> {Number(todayStatus.punch_in_latitude).toFixed(6)}, {Number(todayStatus.punch_in_longitude).toFixed(6)}
                                                    </p>
                                                )}
                                                {todayStatus.punch_in_image_url && (
                                                    <button
                                                        onClick={() => {
                                                            const API_BASE = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'
                                                            setPreviewImage(`${API_BASE}${todayStatus.punch_in_image_url}`)
                                                            setPreviewTitle('Punch In Photo')
                                                        }}
                                                        className="mt-2 px-3 py-1 text-xs bg-blue text-white rounded hover:bg-blue/90 transition-colors font-semibold"
                                                    >
                                                        View Full Image
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {todayStatus.punch_out_time && (
                                    <div className="mb-3 p-3 bg-purple/5 border border-purple/20 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            {todayStatus.punch_out_image_url && (
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={`${import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'}${todayStatus.punch_out_image_url}`}
                                                        alt="Punch Out"
                                                        className="w-20 h-20 object-cover rounded-lg border-2 border-purple/30 cursor-pointer hover:opacity-80 transition"
                                                        onClick={() => {
                                                            const API_BASE = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'
                                                            setPreviewImage(`${API_BASE}${todayStatus.punch_out_image_url}`)
                                                            setPreviewTitle('Punch Out Photo')
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <p className="font-semibold text-purple mb-1">
                                                    ✓ Punch Out
                                                </p>
                                                <p className="text-sm mb-1">
                                                    <strong>Time:</strong> {new Date(todayStatus.punch_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                                                </p>
                                                {(todayStatus.punch_out_latitude && todayStatus.punch_out_longitude) && (
                                                    <p className="text-xs text-text-dim">
                                                        <strong>Location:</strong> {Number(todayStatus.punch_out_latitude).toFixed(6)}, {Number(todayStatus.punch_out_longitude).toFixed(6)}
                                                    </p>
                                                )}
                                                {todayStatus.punch_out_image_url && (
                                                    <button
                                                        onClick={() => {
                                                            const API_BASE = import.meta.env.VITE_API_BASE?.replace('/api', '') || 'http://localhost:3000'
                                                            setPreviewImage(`${API_BASE}${todayStatus.punch_out_image_url}`)
                                                            setPreviewTitle('Punch Out Photo')
                                                        }}
                                                        className="mt-2 px-3 py-1 text-xs bg-purple text-white rounded hover:bg-purple/90 transition-colors font-semibold"
                                                    >
                                                        View Full Image
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {todayStatus.total_hours && (
                                    <p className="mb-1">
                                        <strong>Total Hours:</strong> {parseFloat(String(todayStatus.total_hours)).toFixed(2)} hrs
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-text-dim">You haven't marked attendance today</p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            className="px-4 py-2 rounded bg-blue text-bg hover:bg-blue/90 transition disabled:opacity-50"
                            onClick={() => handleOpenCamera('punchIn')}
                            disabled={!!todayStatus?.punch_in_time}
                        >
                            Punch In
                        </button>

                        <button
                            className="px-4 py-2 rounded bg-purple text-bg hover:bg-purple/90 transition disabled:opacity-50"
                            onClick={() => handleOpenCamera('punchOut')}
                            disabled={!todayStatus?.punch_in_time || !!todayStatus?.punch_out_time}
                        >
                            Punch Out
                        </button>
                    </div>
                </div>
            </div>

            {showCamera && (
                <div className="fixed inset-0 z-[1200] bg-black/50 flex items-center justify-center p-4" onClick={handleCancel}>
                    <div className="bg-panel border border-blue/12 shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-blue/12">
                            <h3 className="font-semibold">{action === 'punchIn' ? 'Punch In' : 'Punch Out'} - Capture Photo</h3>
                        </div>
                        <div className="p-4 text-center">
                            {!capturedImage ? (
                                <div>
                                    <video ref={videoRef} className="w-full" playsInline muted />
                                    <canvas ref={canvasRef} className="hidden" />
                                    <p className="text-xs text-text-dim mt-2">Position your face in the camera</p>
                                </div>
                            ) : (
                                <div>
                                    <img src={capturedImage} alt="Captured" className="w-full" />
                                    <p className="text-xs text-text-dim mt-2">Photo captured successfully</p>
                                </div>
                            )}

                            {location && (
                                <div className="mt-3 rounded border border-blue/12 bg-panel-strong text-text px-3 py-2 text-sm">
                                    Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 border-t border-blue/12 flex gap-2 justify-end">
                            <button onClick={handleCancel} disabled={processing} className="px-3 py-1.5 rounded border border-blue/12 hover:bg-panel-strong">
                                Cancel
                            </button>
                            {!capturedImage ? (
                                <button onClick={handleCapture} className="px-3 py-1.5 rounded bg-blue text-bg hover:bg-blue/90">
                                    Capture
                                </button>
                            ) : (
                                <>
                                    <button onClick={handleRetake} className="px-3 py-1.5 rounded border border-blue/12 hover:bg-panel-strong">
                                        Retake
                                    </button>
                                    <button onClick={handleSubmit} disabled={processing} className="px-3 py-1.5 rounded bg-green text-bg hover:bg-green/90 disabled:opacity-50">
                                        {processing ? 'Submitting…' : 'Submit'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
                            <h3 className="text-white font-semibold text-sm">{previewTitle}</h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 max-h-[80vh] overflow-auto">
                            <img
                                src={previewImage}
                                alt={previewTitle}
                                className="max-w-full h-auto rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3EImage not found%3C/text%3E%3C/svg%3E'
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarkAttendance;

