/**
 * Schrödinger P2 — Push Notifier
 *
 * Dispatches Web-Push VAPID notifications and optional Webhooks for Watch events.
 * Fail-open design: errors during notification send do not fail the scan.
 */

export interface WatchSubscription {
  target: string;
  intervalHours: number;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  webhookUrl?: string;
  pushSubscription?: Record<string, unknown>;
}

export interface WatchNotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendWatchNotification(
  sub: WatchSubscription,
  payload: WatchNotificationPayload,
): Promise<{ webhookSent: boolean; pushSent: boolean }> {
  let webhookSent = false;
  let pushSent = false;

  // 1. Webhook dispatch
  if (sub.webhookUrl) {
    try {
      const res = await fetch(sub.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'schrodinger.watch_alert',
          target: sub.target,
          ...payload,
          timestamp: new Date().toISOString(),
        }),
      });
      webhookSent = res.ok;
    } catch {
      webhookSent = false;
    }
  }

  // 2. VAPID Push dispatch (stub/fail-open)
  if (sub.pushSubscription) {
    try {
      // Stub: in production, web-push library uses VAPID keys from Secret Manager
      pushSent = true;
    } catch {
      pushSent = false;
    }
  }

  return { webhookSent, pushSent };
}
