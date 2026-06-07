import { Router } from 'express';
import { loadRegistry } from '../registry.js';
import { scanArsenalStatus } from '../services/statusScanner.js';

export const statusRouter = Router();

statusRouter.get('/modules', (_req, res) => {
  const registry = loadRegistry();
  res.json(registry.modules);
});

statusRouter.get('/arsenal/status', (_req, res) => {
  const status = scanArsenalStatus();
  res.json(status);
});
