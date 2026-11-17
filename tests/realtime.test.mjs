import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventEnvelope, isEventEnvelope } from '../apps/desktop/src/shared/realtime-protocol.mjs';
import { RealtimeClient, reconnectDelay } from '../apps/desktop/src/renderer/realtime-client.js';

const envelope = (id) => createEventEnvelope('lock_changed', { locked: true }, id, '2026-11-17T00:00:00.000Z');

test('realtime event schema accepts supported versioned events and rejects malformed payloads', () => {
  assert.equal(isEventEnvelope(envelope('host:1')), true);
  assert.equal(isEventEnvelope({ ...envelope('host:2'), version: 2 }), false);
  assert.equal(isEventEnvelope({ ...envelope('host:3'), payload: { locked: 'yes' } }), false);
  assert.throws(() => createEventEnvelope('unknown_event', {}, 'host:4'), /Invalid classroom event/);
});

test('reconnect backoff is exponential, jittered, and capped', () => {
  assert.equal(reconnectDelay(0, () => 0), 800);
  assert.equal(reconnectDelay(0, () => 0.999), 1200);
  assert.equal(reconnectDelay(20, () => 0.999), 30_000);
});

test('realtime client deduplicates event IDs and resynchronizes gaps and server restarts', async () => {
  const delivered = [];
  let recoveries = 0;
  const client = new RealtimeClient('/events', {
    onEvent: (event) => delivered.push(event.id),
    recover: async () => { recoveries += 1; }
  });
  client.lastInstance = 'host';
  client.lastSequence = 1;
  const send = async (event) => client.consumeBlock(`id: ${event.id}\nevent: codemesh\ndata: ${JSON.stringify(event)}`);

  await send(envelope('host:3'));
  await send(envelope('host:3'));
  await send(envelope('host:4'));
  await send(envelope('restart:1'));
  await send(envelope('restart:2'));

  assert.deepEqual(delivered, ['host:4', 'restart:2']);
  assert.equal(recoveries, 2);
});

test('realtime client recovers authoritative state after a dropped stream', async () => {
  const originalFetch = globalThis.fetch;
  let connections = 0;
  let recoveries = 0;
  const delays = [];
  const states = [];
  let client;
  globalThis.fetch = async () => {
    connections += 1;
    return new Response(new ReadableStream({ start(controller) { controller.close(); } }), { status: 200 });
  };
  try {
    client = new RealtimeClient('/events', {
      recover: async () => { recoveries += 1; if (recoveries === 4) client.close(); },
      onState: (state) => states.push(state),
      retryDelay: (attempt) => { delays.push(attempt); return 0; }
    }).start();
    await client.done;
    assert.equal(connections, 4);
    assert.equal(recoveries, 4);
    assert.deepEqual(delays, [0, 1, 2]);
    assert.ok(states.includes('reconnecting'));
    assert.ok(states.includes('offline'));
  } finally {
    client?.close();
    globalThis.fetch = originalFetch;
  }
});

test('closing a disconnected realtime client cancels its pending retry timer', async () => {
  const originalFetch = globalThis.fetch;
  let client;
  globalThis.fetch = async () => new Response(new ReadableStream({ start(controller) { controller.close(); } }), { status: 200 });
  try {
    client = new RealtimeClient('/events', {
      recover: async () => {},
      onState: (state) => { if (state === 'reconnecting') setTimeout(() => client.close(), 0); },
      retryDelay: () => 30_000
    }).start();
    await client.done;
    assert.equal(client.running, false);
  } finally {
    client?.close();
    globalThis.fetch = originalFetch;
  }
});
