import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../backend/src/app.js';

const app = createApp();
const AUTH = 'Bearer test-token';

describe('API integration', () => {
  it('GET /api/health returns version and h4ckRoot', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1.0.0');
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
});
