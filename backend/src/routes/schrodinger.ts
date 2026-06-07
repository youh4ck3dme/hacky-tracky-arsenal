import { Router } from 'express';
import { schrodingerScanner } from '../services/schrodingerScanner.js';

export const schrodingerRouter = Router();

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
    res.status(400).json({ error: message });
  }
});

schrodingerRouter.get('/scans/:id', (req, res) => {
  const scan = schrodingerScanner.getScan(req.params.id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }
  res.json(scan);
});

schrodingerRouter.get('/scans/:id/stream', (req, res) => {
  const scan = schrodingerScanner.getScan(req.params.id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = schrodingerScanner.subscribe(req.params.id, send);

  req.on('close', () => {
    unsubscribe();
  });
});
