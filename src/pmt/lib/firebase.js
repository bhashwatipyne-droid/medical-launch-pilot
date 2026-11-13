// Pilot build: browser push (Firebase) is switched off. These keep the same
// names the notification components import, and do nothing. In-app
// notifications still work through /api/notifications.

export const isFirebaseConfigured = () => false;
export const isPushSupported = async () => false;
export const getPushToken = async () => null;
export const listenForPush = () => () => {};
export const NOTIFICATION_ICON = "/pmt-notification-icon.png";
export const showSystemNotification = async () => {};
