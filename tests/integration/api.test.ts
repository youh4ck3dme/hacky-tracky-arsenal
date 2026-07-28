import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';

const app = createApp();
const AUTH = 'Bearer test-token';

describe('API integration', () => {
  it('GET /api/health returns version and h4ckRoot', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(res.body.h4ckRoot).toBeTruthy();
    expect(res.body.queue).toBeDefined();
  });

  it('GET /api/modules without auth returns 401', async () => {
    const res = await request(app).get('/api/modules');
    expect(res.status).toBe(401);
  });

  it('GET /api/modules with valid token returns module list', async () => {
    const res = await request(app)
      .get('/api/modules')
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('POST /api/jobs with invalid moduleId returns 400', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', AUTH)
      .send({ moduleId: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid moduleId/i);
  });

  it('POST /api/schrodinger/scans without target returns 400', async () => {
    const res = await request(app)
      .post('/api/schrodinger/scans')
      .set('Authorization', AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/target/i);
  });

  it('POST /api/schrodinger/scans with invalid target returns 400', async () => {
    const res = await request(app)
      .post('/api/schrodinger/scans')
      .set('Authorization', AUTH)
      .send({ target: 'not-a-domain' });

    expect(res.status).toBe(400);
  });

  it('POST /api/schrodinger/scans with example.com returns 201', async () => {
    const res = await request(app)
      .post('/api/schrodinger/scans')
      .set('Authorization', AUTH)
      .send({ target: 'example.com' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe('running');
    expect(res.body.target).toBe('example.com');
  });

  // ── P0: Cancel scan ────────────────────────────────────────────────────

  it('DELETE /api/schrodinger/scans/:id cancels a running scan', async () => {
    // Create a scan first
    const createRes = await request(app)
      .post('/api/schrodinger/scans')
      .set('Authorization', AUTH)
      .send({ target: 'example.com' });

    expect(createRes.status).toBe(201);
    const scanId = createRes.body.id;

    // Cancel it
    const cancelRes = await request(app)
      .delete(`/api/schrodinger/scans/${scanId}`)
      .set('Authorization', AUTH);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('cancelled');
    expect(cancelRes.body.error).toContain('cancelled');
  });

  it('DELETE /api/schrodinger/scans/:id with unknown ID returns 404', async () => {
    const res = await request(app)
      .delete('/api/schrodinger/scans/nonexistent')
      .set('Authorization', AUTH);

    expect(res.status).toBe(404);
  });

  // ── P0: List scans ─────────────────────────────────────────────────────

  it('GET /api/schrodinger/scans lists recent scans', async () => {
    const res = await request(app)
      .get('/api/schrodinger/scans')
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── P0: Audit log ─────────────────────────────────────────────────────

  it('GET /api/schrodinger/scans/:id/audit returns audit events for a scan', async () => {
    // Create a scan to generate audit events
    const createRes = await request(app)
      .post('/api/schrodinger/scans')
      .set('Authorization', AUTH)
      .send({ target: 'example.com' });

    const scanId = createRes.body.id;

    const auditRes = await request(app)
      .get(`/api/schrodinger/scans/${scanId}/audit`)
      .set('Authorization', AUTH);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body)).toBe(true);
    // Should have at least scan.created event
    expect(auditRes.body.some((e: { action: string }) => e.action === 'scan.created')).toBe(true);
  });

  // ── P0: Feature flags ─────────────────────────────────────────────────

  it('GET /api/schrodinger/flags returns feature flags', async () => {
    const res = await request(app)
      .get('/api/schrodinger/flags')
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('schrodinger.guardrails');
    expect(res.body).toHaveProperty('schrodinger.persist.postgres');
    expect(res.body).toHaveProperty('schrodinger.v2_providers');
  });
});
