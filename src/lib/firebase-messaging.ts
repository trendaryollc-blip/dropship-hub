import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./firebase";

let messaging: ReturnType<typeof getMessaging> | null = null;

function getMessagingInstance() {
  if (typeof window === "undefined") return null;
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch {
      return null;
    }
  }
  return messaging;
}

export async function requestNotificationPermission(): Promise<string | null> {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined,
    });

    if (token) {
      localStorage.setItem("fcmToken", token);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: { notification?: { title?: string; body?: string } }) => void) {
  const messagingInstance = getMessagingInstance();
  if (!messagingInstance) return () => {};

  return onMessage(messagingInstance, callback);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fcmToken");
}
