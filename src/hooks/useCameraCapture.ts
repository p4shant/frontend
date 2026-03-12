import { useState, useRef, useCallback } from 'react';

export type Location = {
    latitude: number;
    longitude: number;
    accuracy?: number;
};

export interface UseCameraCaptureReturn {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    capturedImage: string | null;
    location: Location | null;
    cameraError: string;
    isCapturing: boolean;
    startSession: (facingMode?: 'user' | 'environment') => Promise<void>;
    capture: () => void;
    retake: (facingMode?: 'user' | 'environment') => void;
    cancelSession: () => void;
    dataURLtoFile: (dataurl: string, filename: string) => File;
}

/**
 * Reusable camera + GPS capture hook.
 *
 * Default facingMode is 'environment' (rear camera) — ideal for speedometer photos.
 * Pass 'user' for selfie / attendance (as in MarkAttendance).
 */
export function useCameraCapture(): UseCameraCaptureReturn {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [cameraError, setCameraError] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);

    // ── GPS ──────────────────────────────────────────────────────────────

    const getLocation = useCallback((): Promise<Location> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                }),
                (err) => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }, []);

    // ── Camera stream ────────────────────────────────────────────────────

    const startStream = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // play() can throw AbortError on Chrome when interrupted during setup —
                // this is harmless; the stream is already attached and will play.
                videoRef.current.play().catch(() => { /* ignore benign AbortError */ });
            }
        } catch {
            setCameraError('Camera access is required. Please allow camera permissions and try again.');
        }
    }, []);

    const stopStream = useCallback(() => {
        const stream = videoRef.current?.srcObject as MediaStream | null;
        stream?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);

    // ── Public API ───────────────────────────────────────────────────────

    const startSession = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
        setCameraError('');
        setCapturedImage(null);
        setIsCapturing(true);

        // Start GPS in background — camera opens immediately without waiting for GPS.
        getLocation()
            .then((loc) => setLocation(loc))
            .catch(() => {
                // GPS failed — show a soft warning but do NOT block the camera.
                setCameraError('GPS unavailable. Location may not be captured accurately.');
            });

        // Start camera right away (parallel to GPS).
        await startStream(facingMode);
    }, [getLocation, startStream]);

    const capture = useCallback(() => {
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
        stopStream();
    }, [stopStream]);

    const retake = useCallback((facingMode: 'user' | 'environment' = 'environment') => {
        setCapturedImage(null);
        startStream(facingMode);
    }, [startStream]);

    const cancelSession = useCallback(() => {
        stopStream();
        setCapturedImage(null);
        setLocation(null);
        setCameraError('');
        setIsCapturing(false);
    }, [stopStream]);

    const dataURLtoFile = useCallback((dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        const match = arr[0].match(/:(.*?);/);
        const mime = match ? match[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
    }, []);

    return {
        videoRef,
        canvasRef,
        capturedImage,
        location,
        cameraError,
        isCapturing,
        startSession,
        capture,
        retake,
        cancelSession,
        dataURLtoFile,
    };
}
