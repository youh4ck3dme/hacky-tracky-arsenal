import cors from 'cors';
import express from 'express';
import { config, validateH4ckRoot } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { jobsRouter } from './routes/jobs.js';
import { schrodingerRouter } from './routes/schrodinger.js';
import { statusRouter } from './routes/status.js';

export function createApp(): express.Application {
  validateH4ckRoot();

  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    import('./services/jobQueue.js').then(({ jobQueue }) => {
      const job = jobQueue.getActiveJob();
      res.json({
        version: config.version,
        h4ckRoot: config.h4ckRoot,
        queue: {
          activeJobId: job?.id ?? null,
          activeModuleId: job?.moduleId ?? null,
        },
      });
    });
  });

  app.use('/api', authMiddleware);
  app.use('/api', statusRouter);
  app.use('/api/jobs', jobsRouter);
  app.use('/api/schrodinger', schrodingerRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
