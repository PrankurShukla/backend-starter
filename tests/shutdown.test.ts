import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { ShutdownRegistry } from '../src/shutdown/ShutdownRegistry';

describe('shutdown registry', () => {
  it('closes registered resources once in priority order', async () => {
    const order: string[] = [];
    const registry = new ShutdownRegistry(pino({ enabled: false }));
    registry.register({ name: 'database', priority: 10, close: () => { order.push('database'); } });
    registry.register({ name: 'telemetry', priority: 20, close: () => { order.push('telemetry'); } });

    await registry.closeAll();
    await registry.closeAll();
    expect(order).toEqual(['telemetry', 'database']);
  });

  it('continues closing resources and reports aggregate failures', async () => {
    const order: string[] = [];
    const registry = new ShutdownRegistry(pino({ enabled: false }));
    registry.register({ name: 'broken', close: () => { order.push('broken'); throw new Error('close failed'); } });
    registry.register({ name: 'healthy', close: () => { order.push('healthy'); } });

    await expect(registry.closeAll()).rejects.toBeInstanceOf(AggregateError);
    expect(order).toEqual(['broken', 'healthy']);
  });
});
