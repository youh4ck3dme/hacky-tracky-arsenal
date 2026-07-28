/**
 * Schrödinger P2 — Push Notifier
 *
 * Dispatches Web-Push VAPID notifications and optional Webhooks for Watch events.
 * Fail-open design: errors during notification send do not fail the scan.
 */

import webpush from 'web-push';

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

// Set VAPID keys if provided
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:security-team@example.com',
      publicKey,
      privateKey,
    );
  } catch (err) {
    console.error('[PushNotifier] Failed to configure VAPID details:', err);
  }
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
    } catch (err) {
      console.warn(`[PushNotifier] Webhook send failed for ${sub.target}:`, err);
      webhookSent = false;
    }
  }

  // 2. VAPID Push dispatch
  if (sub.pushSubscription && publicKey && privateKey) {
    try {
      const pushSub = sub.pushSubscription as unknown as webpush.PushSubscription;
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      pushSent = true;
    } catch (err) {
      console.warn(`[PushNotifier] VAPID push send failed for ${sub.target}:`, err);
      pushSent = false;
    }
  }

  return { webhookSent, pushSent };
}
