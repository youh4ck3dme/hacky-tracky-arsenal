import { Router } from 'express';
import { getAuditLog } from '../schrodinger/auditLog.js';
import { getAllFlags } from '../schrodinger/featureFlags.js';
import { schrodingerScanner } from '../services/schrodingerScanner.js';

export const schrodingerRouter = Router();

// ── POST /scans — create a new scan ────────────────────────────────────────

schrodingerRouter.post('/scans', async (req, res) => {
  const { target } = req.body as { target?: string };
  if (!target) {
    res.status(400).json({ error: 'target is required' });
    return;
  }

  try {
    const scan = await schrodingerScanner.createScan(target);
    res.status(201).json(scan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid target';
    const status = message.includes('concurrent') ? 429 : 400;
    res.status(status).json({ error: message });
  }
});

// ── GET /scans — list recent scans ─────────────────────────────────────────

schrodingerRouter.get('/scans', (_req, res) => {
  const scans = schrodingerScanner.listScans(50);
  res.json(scans);
});

// ── GET /scans/:id — get scan by ID ────────────────────────────────────────

schrodingerRouter.get('/scans/:id', (req, res) => {
  const scan = schrodingerScanner.getScan(req.params.id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(scan);
});

// ── DELETE /scans/:id — cancel a running scan ──────────────────────────────

schrodingerRouter.delete('/scans/:id', (req, res) => {
  const scan = schrodingerScanner.cancelScan(req.params.id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(scan);
});

// ── GET /scans/:id/stream — SSE with event IDs + Last-Event-ID ─────────────

schrodingerRouter.get('/scans/:id/stream', (req, res) => {
  const scanId = req.params.id;
  const scan = schrodingerScanner.getScan(scanId);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx proxy support
  res.flushHeaders();

  // Track event IDs for this connection
  let eventSeq = 0;

  // Last-Event-ID: if the client reconnected, skip already-sent events
  const lastEventId = Number(req.headers['last-event-id'] ?? '0');

  const send = (event: string, data: unknown) => {
    eventSeq++;
    const globalId = schrodingerScanner.nextEventId(scanId);

    // Skip events the client already received (reconnect support)
    if (globalId <= lastEventId) return;

    res.write(`id: ${globalId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = schrodingerScanner.subscribe(scanId, send);

  req.on('close', () => {
    unsubscribe();
  });
});

// ── GET /scans/:id/audit — audit trail for a scan ──────────────────────────

schrodingerRouter.get('/scans/:id/audit', (req, res) => {
  const scanId = req.params.id;
  const scan = schrodingerScanner.getScan(scanId);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  const events = getAuditLog().query({ scanId });
  res.json(events);
});

// ── GET /audit — full audit log ────────────────────────────────────────────

schrodingerRouter.get('/audit', (req, res) => {
  const limit = Number(req.query?.limit ?? 100);
  const events = getAuditLog().query({ limit: isNaN(limit) ? 100 : limit });
  res.json(events);
});

// ── GET /flags — current feature flags ─────────────────────────────────────

schrodingerRouter.get('/flags', (_req, res) => {
  res.json(getAllFlags());
});

// ── POST /watch — subscribe target to background watch ────────────────────

schrodingerRouter.post('/watch', (req, res) => {
  const { target, intervalHours, webhookUrl } = req.body as {
    target?: string;
    intervalHours?: number;
    webhookUrl?: string;
  };
  if (!target) {
    res.status(400).json({ error: 'target is required' });
    return;
  }

  res.json({
    subscribed: true,
    target,
    intervalHours: intervalHours ?? 24,
    webhookUrl,
    createdAt: new Date().toISOString(),
  });
});

// ── POST /triage — Vertex AI findings triage ───────────────────────────────

schrodingerRouter.post('/triage', async (req, res) => {
  const { target, findings, language } = req.body as {
    target?: string;
    findings?: any[];
    language?: 'sk' | 'en';
  };
  if (!target) {
    res.status(400).json({ error: 'target is required' });
    return;
  }

  const { triageFindingsWithVertexAI } = await import('../schrodinger/triage/vertexTriage.js');
  const triage = await triageFindingsWithVertexAI(target, findings ?? [], language ?? 'sk');
  res.json(triage);
});

