import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

const registration = {
  email: 'auth@example.com',
  password: 'a-strong-password-for-tests',
  firstName: 'Auth',
  lastName: 'User',
};

describe('authentication', () => {
  it('registers an account and authenticates protected requests', async () => {
    const app = createApp();
    const registered = await request(app).post('/api/v1/auth/register').send(registration).expect(201);

    expect(registered.body.data.user.passwordHash).toBeUndefined();
    expect(registered.body.data.user.roles).toEqual(['USER']);
    expect(registered.body.data.accessToken).toBeTypeOf('string');

    const profile = await request(app)
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${registered.body.data.accessToken}`)
      .expect(200);
    expect(profile.body.data.email).toBe(registration.email);
  });

  it('uses generic errors for invalid credentials', async () => {
    const app = createApp();
    await request(app).post('/api/v1/auth/register').send(registration).expect(201);
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: registration.email, password: 'wrong-password-value' })
      .expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('rotates refresh tokens and rejects replay', async () => {
    const app = createApp();
    const registered = await request(app).post('/api/v1/auth/register').send(registration).expect(201);
    const original = registered.body.data.refreshToken as string;

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original })
      .expect(200);
    expect(refreshed.body.data.refreshToken).not.toBe(original);

    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original }).expect(401);
  });

  it('rejects access to protected routes without a bearer token', async () => {
    await request(createApp()).get('/api/v1/auth/me').expect(401);
  });
});
