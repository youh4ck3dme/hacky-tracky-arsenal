/**
 * Schrödinger P2 — Watch Engine
 *
 * Periodic background scanning for allowlisted targets (Local cron adapter or Pub/Sub worker).
 * Feature flag: `schrodinger.watch` (default OFF).
 */

import { getAuditLog } from '../auditLog.js';
import { isEnabled } from '../featureFlags.js';
import type { SchrodingerScan } from '../types/schrodinger.js';
import { sendWatchNotification, type WatchSubscription } from '../pushNotifier.js';

export class WatchEngine {
  private subscriptions = new Map<string, WatchSubscription>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly scanRunner?: (target: string) => Promise<SchrodingerScan>) {}

  /** Subscribe a target to background watch. */
  subscribe(sub: WatchSubscription): void {
    if (!isEnabled('schrodinger.watch')) {
      throw new Error('Watch engine is disabled. Enable FEATURE_schrodinger_watch=true.');
    }
    this.subscriptions.set(sub.target, sub);
    getAuditLog().append('watch.subscribed', 'api', { target: sub.target }, { target: sub.target });
  }

  /** Unsubscribe a target. */
  unsubscribe(target: string): boolean {
    const deleted = this.subscriptions.delete(target);
    if (deleted) {
      getAuditLog().append('watch.unsubscribed', 'api', { target }, { target });
    }
    return deleted;
  }

  /** List active watch subscriptions. */
  listSubscriptions(): WatchSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /** Start local interval runner (runs check every intervalMs). */
  startLocalRunner(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runScheduledChecks();
    }, intervalMs);
  }

  /** Stop local runner. */
  stopLocalRunner(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Run checks for all active subscriptions. */
  async runScheduledChecks(): Promise<void> {
    if (!isEnabled('schrodinger.watch')) return;

    for (const [target, sub] of this.subscriptions.entries()) {
      if (!sub.enabled) continue;

      try {
        if (this.scanRunner) {
          const scan = await this.scanRunner(target);
          sub.lastRunAt = new Date().toISOString();
          
          await sendWatchNotification(sub, {
            title: `Schrödinger Watch Alert: ${target}`,
            body: `Watch scan completed with status ${scan.status}. Risk score: ${scan.risk_score ?? 'N/A'}`,
          });
        }
      } catch (err) {
        console.error(`[WatchEngine] Error running check for ${target}:`, err);
      }
    }
  }
}
