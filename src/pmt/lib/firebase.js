// Browser push (Firebase Cloud Messaging).
//
// Switched on by the NEXT_PUBLIC_FIREBASE_* variables (see .env.example). With
// them missing, everything here does nothing and in-app notifications still
// work through /api/notifications.
//
// The page asks Firebase for this browser's token (getToken) and the server
// sends pushes to it. Delivery goes through public/firebase-messaging-sw.js,
// which shows the popup when PMT is not in front and hands the push to the page
// when it is.

// Next only inlines NEXT_PUBLIC_* variables written out in full like this.
const CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const SW_URL = "/firebase-messaging-sw.js";
export const NOTIFICATION_ICON = "/pmt-notification-icon.png";

export const isFirebaseConfigured = () =>
  Boolean(CONFIG.apiKey && CONFIG.projectId && CONFIG.messagingSenderId && CONFIG.appId && VAPID_KEY);

let messagingPromise = null;

// The Firebase code is loaded only when push is actually used, so people who
// never turn it on do not download it.
const getMessagingInstance = () => {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const [{ initializeApp, getApps }, { getMessaging, isSupported }] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!(await isSupported())) return null;
      const app = getApps()[0] || initializeApp(CONFIG);
      return getMessaging(app);
    })().catch(() => null);
  }
  return messagingPromise;
};

export const isPushSupported = async () => {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  return Boolean(await getMessagingInstance());
};

const registerWorker = () => navigator.serviceWorker.register(SW_URL, { scope: "/" });

// This browser's FCM token, or null when push is off or permission was not given.
export const getPushToken = async () => {
  if (!(await isPushSupported()) || Notification.permission !== "granted") return null;
  const messaging = await getMessagingInstance();
  const { getToken } = await import("firebase/messaging");
  const registration = await registerWorker();
  await navigator.serviceWorker.ready;
  return (await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })) || null;
};

// Calls `handler(push)` for every push the worker hands to this page, where
// push is { notification_id, title?, body, url }. Returns the stop function.
export const listenForPush = (handler) => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !isFirebaseConfigured()) {
    return () => {};
  }
  const onMessage = (event) => {
    if (event.data?.type === "pmt-push") handler(event.data.push || {});
  };
  navigator.serviceWorker.addEventListener("message", onMessage);
  return () => navigator.serviceWorker.removeEventListener("message", onMessage);
};

// The system popup for a push that arrived while PMT is open in front.
export const showSystemNotification = async ({ title, body, url, notification_id: id }) => {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return;
  await registration.showNotification(title || "PMT", {
    body: body || "",
    icon: NOTIFICATION_ICON,
    badge: NOTIFICATION_ICON,
    tag: id || undefined,
    data: { url: url || "/" },
  });
};
