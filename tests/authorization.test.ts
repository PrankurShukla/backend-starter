import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createContainer } from '../src/bootstrap/container';
import { InMemoryUserRepository } from '../src/repositories/InMemoryUserRepository';

describe('authorization boundaries', () => {
  it('allows administrators to create users and rejects regular users', async () => {
    const repository = new InMemoryUserRepository();
    const admin = await repository.create({
      email: 'admin@example.com', firstName: 'Admin', lastName: 'User', roles: ['ADMIN'],
    });
    const member = await repository.create({
      email: 'member@example.com', firstName: 'Member', lastName: 'User', roles: ['USER'],
    });
    const container = createContainer({ userRepository: repository });
    const app = createApp({ container });
    const adminToken = await container.tokenProvider.createAccessToken({ subject: admin.id, roles: admin.roles });
    const memberToken = await container.tokenProvider.createAccessToken({ subject: member.id, roles: member.roles });

    await request(app)
      .post('/api/v1/users')
      .set('authorization', `Bearer ${memberToken}`)
      .send({ email: 'blocked@example.com', firstName: 'Blocked', lastName: 'User' })
      .expect(403);

    const response = await request(app)
      .post('/api/v1/users')
      .set('authorization', `Bearer ${adminToken}`)
      .send({ email: 'created@example.com', firstName: 'Created', lastName: 'User' })
      .expect(201);
    expect(response.body.data.email).toBe('created@example.com');
  });

  it('prevents a regular user from reading another user', async () => {
    const repository = new InMemoryUserRepository();
    const first = await repository.create({ email: 'first@example.com', firstName: 'First', lastName: 'User' });
    const second = await repository.create({ email: 'second@example.com', firstName: 'Second', lastName: 'User' });
    const container = createContainer({ userRepository: repository });
    const app = createApp({ container });
    const token = await container.tokenProvider.createAccessToken({ subject: first.id, roles: first.roles });

    await request(app)
      .get(`/api/v1/users/${second.id}`)
      .set('authorization', `Bearer ${token}`)
      .expect(403);
  });
});
