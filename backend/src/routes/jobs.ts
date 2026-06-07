import { Router } from 'express';
import { ALLOWED_SCRIPTS } from '../registry.js';
import { jobQueue } from '../services/jobQueue.js';

export const jobsRouter = Router();

jobsRouter.get('/', (_req, res) => {
  res.json(jobQueue.listJobs());
});

jobsRouter.get('/:id', (req, res) => {
  const job = jobQueue.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

jobsRouter.post('/', async (req, res) => {
  const { moduleId } = req.body as { moduleId?: string };

  if (!moduleId || !ALLOWED_SCRIPTS[moduleId]) {
    res.status(400).json({ error: 'Invalid moduleId' });
    return;
  }

  const active = jobQueue.getActiveJob();
  const queued = jobQueue.listJobs(50).some((j) => j.status === 'queued');
  if (active || queued) {
    res.status(409).json({
      error: 'A job is already running or queued',
      activeJobId: active?.id,
    });
    return;
  }

  try {
    const job = await jobQueue.enqueue(moduleId);
    res.status(201).json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue job';
    res.status(400).json({ error: message });
  }
});

jobsRouter.post('/:id/cancel', async (req, res) => {
  const job = await jobQueue.cancel(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

jobsRouter.get('/:id/stream', (req, res) => {
  const job = jobQueue.getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = jobQueue.subscribe(req.params.id, send);

  req.on('close', () => {
    unsubscribe();
  });
});
