import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const app = createApp();

describe('backend starter', () => {
  it('reports liveness using the standard response envelope', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('alive');
    expect(response.body.meta.requestId).toBeTypeOf('string');
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('validates DTOs before the controller executes', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'a-long-valid-password', firstName: '', lastName: 'User' })
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('uses a repository-backed service for the example module', async () => {
    const created = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'Test@Example.com', password: 'a-secure-test-password', firstName: 'Test', lastName: 'User' })
      .expect(201);

    const fetched = await request(app)
      .get(`/api/v1/users/${created.body.data.user.id}`)
      .set('authorization', `Bearer ${created.body.data.accessToken}`)
      .expect(200);

    expect(fetched.body.data.email).toBe('test@example.com');
  });

  it('returns a stable error code for unknown routes', async () => {
    const response = await request(app).get('/missing').expect(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
