/** Thin wrapper around the Notification API for PWA Shadow Diff alerts. */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Show a Shadow Diff notification. Prefers the service-worker registration
 * (works when the PWA is installed / backgrounded on mobile), falling back to
 * a plain page Notification.
 */
export async function showShadowNotification(title: string, body: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        tag: 'shadow-diff',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
      return;
    }
  } catch {
    // fall through to page notification
  }

  try {
    new Notification(title, { body, tag: 'shadow-diff', icon: '/icon-192.png' });
  } catch {
    // notifications unavailable in this context — ignore
  }
}
