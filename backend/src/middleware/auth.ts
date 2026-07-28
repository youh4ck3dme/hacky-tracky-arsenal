import type { Request, Response, NextFunction } from 'express';
import { isValidCredential } from '../config.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const secret = header.slice(7);
  if (!isValidCredential(secret)) {
    res.status(403).json({ error: 'Nesprávne heslo alebo token' });
    return;
  }

  next();
}
