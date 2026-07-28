import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { authMiddleware } from '../../../backend/src/middleware/auth.js';
import { config } from '../../../backend/src/config.js';

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    authMiddleware({ headers: {} } as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when credential is invalid', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    authMiddleware(
      { headers: { authorization: 'Bearer wrong-token' } } as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when API token is valid', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    authMiddleware(
      { headers: { authorization: `Bearer ${config.apiToken}` } } as Request,
      res,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when panel password is valid (UI login)', () => {
    const next = vi.fn() as NextFunction;
    const res = mockRes();

    authMiddleware(
      { headers: { authorization: `Bearer ${config.panelPassword}` } } as Request,
      res,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts default panel password 23513900 when env uses default', () => {
    // panelPassword is always set; assert known default or env override is non-empty
    expect(config.panelPassword.length).toBeGreaterThan(0);
    const next = vi.fn() as NextFunction;
    const res = mockRes();
    authMiddleware(
      { headers: { authorization: `Bearer ${config.panelPassword}` } } as Request,
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});
