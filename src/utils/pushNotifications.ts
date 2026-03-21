// ─── Web Push Notification Utility ───────────────────────────────────────
// Registers the service worker, requests permission, and subscribes the
// current user to web push notifications via the backend VAPID endpoint.

import { pushAPI } from '../services/api';

/** Convert a base64url string to a Uint8Array (needed for VAPID key) */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer;
}

/** Remove push subscription from backend */
export async function removePushSubscription(token: string): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await sub.unsubscribe();
    await pushAPI.unsubscribe(sub.endpoint, token).catch(console.warn);
}

/**
 * Main entry point.
 * Call after login. Registers SW, asks permission, subscribes.
 * Safe to call multiple times – checks if already subscribed.
 */
export async function initPushNotifications(token: string): Promise<void> {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.info('[Push] Not supported in this browser');
            return;
        }

        // 1. Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        // 2. Check current permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.info('[Push] Notification permission denied');
            return;
        }

        // 3. Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            // Re-sync with backend in case backend lost it
            await pushAPI.subscribe(existingSubscription.toJSON(), token);
            return;
        }

        // 4. Fetch VAPID public key
        const publicKey = await pushAPI.getVapidPublicKey();

        // 5. Subscribe
        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 6. Save to backend
        await pushAPI.subscribe(newSubscription.toJSON(), token);

        console.info('[Push] Successfully subscribed to push notifications');
    } catch (err) {
        // Never crash the app because of push failures
        console.warn('[Push] Setup failed (non-fatal):', err);
    }
}
