import { isEventEnvelope } from '../shared/realtime-protocol.mjs';

export function reconnectDelay(attempt, random = Math.random) {
  const base = Math.min(30_000, 1_000 * (2 ** Math.max(0, Math.min(attempt, 10))));
  return Math.round(Math.min(30_000, base * (0.8 + random() * 0.4)));
}

export class RealtimeClient {
  constructor(url, { token = null, onEvent, onState, recover, onUnauthorized, retryDelay = reconnectDelay } = {}) {
    this.url = url;
    this.token = token;
    this.onEvent = onEvent || (() => {});
    this.onState = onState || (() => {});
    this.recover = recover || (() => {});
    this.onUnauthorized = onUnauthorized || (() => {});
    this.retryDelay = retryDelay;
    this.controller = null;
    this.retryTimer = null;
    this.retryResolve = null;
    this.lastInstance = null;
    this.lastSequence = 0;
    this.lastEventId = null;
    this.seen = new Set();
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.done = this.run();
    }
    return this;
  }

  close() {
    this.running = false;
    this.controller?.abort();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryResolve?.();
    this.setState('disconnected');
  }

  setState(state) {
    try { this.onState(state); } catch (error) { console.error('Realtime state callback failed', error); }
  }

  async run() {
    let attempt = 0;
    while (this.running) {
      this.controller = new AbortController();
      const controller = this.controller;
      let response;
      const connectTimeout = setTimeout(() => controller.abort(), 10_000);
      try {
        this.setState(attempt === 0 ? 'connecting' : 'reconnecting');
        if (!this.running) break;
        const headers = new Headers({ accept: 'text/event-stream' });
        if (this.token) headers.set('authorization', `Bearer ${this.token}`);
        if (this.lastEventId) headers.set('last-event-id', this.lastEventId);
        response = await fetch(this.url, { headers, cache: 'no-store', signal: controller.signal });
      } catch (error) {
        clearTimeout(connectTimeout);
        if (!this.running) break;
        if (this.controller === controller) this.controller = null;
        attempt += 1;
        this.setState(attempt >= 3 ? 'offline' : 'reconnecting');
        if (!this.running) break;
        await this.wait(this.retryDelay(attempt - 1));
        continue;
      }
      clearTimeout(connectTimeout);
      if (!this.running) break;
      if (response.status === 401 || response.status === 403) {
        this.setState('unauthorized');
        this.onUnauthorized();
        this.running = false;
        break;
      }
      if (!response.ok || !response.body) {
        if (this.controller === controller) this.controller = null;
        try { await response.body?.cancel(); } catch {}
        attempt += 1;
        this.setState(attempt >= 3 ? 'offline' : 'reconnecting');
        if (!this.running) break;
        await this.wait(this.retryDelay(attempt - 1));
        continue;
      }

      let lastContact = Date.now();
      let stableTimer = null;
      const watchdog = setInterval(() => {
        if (Date.now() - lastContact > 45_000) controller.abort();
      }, 5_000);
      try {
        await this.recover();
        if (!this.running) break;
        this.setState('connected');
        stableTimer = setTimeout(() => { attempt = 0; }, 30_000);
        await this.readStream(response.body, controller, () => { lastContact = Date.now(); });
      } catch (error) {
        if (this.running && !controller.signal.aborted) console.warn('Classroom stream interrupted', error);
      } finally {
        clearInterval(watchdog);
        if (stableTimer) clearTimeout(stableTimer);
        try { await response.body.cancel(); } catch {}
      }
      if (!this.running) break;
      attempt += 1;
      this.setState(attempt >= 3 ? 'offline' : 'reconnecting');
      if (!this.running) break;
      await this.wait(this.retryDelay(attempt - 1));
    }
  }

  wait(ms) {
    return new Promise((resolve) => {
      const signal = this.controller?.signal;
      const finish = () => {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        this.retryResolve = null;
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      const onAbort = () => finish();
      if (signal?.aborted) return finish();
      this.retryResolve = finish;
      this.retryTimer = setTimeout(finish, ms);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  async readStream(stream, controller, touch) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (this.running) {
        const { value, done } = await reader.read();
        if (done) return;
        touch();
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
          const block = buffer.slice(0, boundary);
          const delimiter = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];
          buffer = buffer.slice(boundary + delimiter.length);
          await this.consumeBlock(block);
        }
      }
    } finally {
      try { await reader.cancel(); } catch {}
      if (this.controller === controller) this.controller = null;
    }
  }

  async consumeBlock(block) {
    let id = '';
    const data = [];
    for (const line of block.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      const separator = line.indexOf(':');
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
      if (field === 'id') id = value;
      if (field === 'data') data.push(value);
    }
    if (!data.length) return;
    let event;
    try { event = JSON.parse(data.join('\n')); } catch { return; }
    if (!isEventEnvelope(event) || event.id !== id || this.seen.has(event.id)) return;

    const split = event.id.lastIndexOf(':');
    const instance = split < 0 ? event.id : event.id.slice(0, split);
    const sequence = split < 0 ? 0 : Number(event.id.slice(split + 1));
    let snapshotRecovered = false;
    if (this.lastInstance !== null && (instance !== this.lastInstance || (sequence && this.lastSequence && sequence > this.lastSequence + 1))) {
      await this.recover();
      snapshotRecovered = true;
    }
    if (instance === this.lastInstance && sequence && sequence <= this.lastSequence) return;
    this.lastInstance = instance;
    this.lastSequence = sequence;
    this.lastEventId = event.id;
    this.seen.add(event.id);
    if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value);
    if (!snapshotRecovered) this.onEvent(event);
  }
}
