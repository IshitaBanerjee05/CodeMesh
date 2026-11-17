export const EVENT_VERSION = 1;

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value) => typeof value === 'string';
const validators = {
  session_updated: (p) => object(p) && object(p.session) && string(p.session.id) && string(p.session.status),
  join_request: (p) => object(p) && object(p.request) && string(p.request.id) && string(p.request.name) && string(p.request.roll),
  admission_updated: (p) => object(p) && object(p.request) && string(p.request.id) && string(p.request.status),
  workspace_updated: (p) => object(p) && string(p.studentId) && string(p.updatedAt),
  submission_received: (p) => object(p) && string(p.id) && string(p.studentId),
  exercise_published: (p) => object(p) && object(p.exercise) && string(p.exercise.id) && string(p.exercise.title),
  lock_changed: (p) => object(p) && typeof p.locked === 'boolean',
  session_ended: (p) => object(p),
  participant_disconnected: (p) => object(p) && string(p.participantId),
  participant_presence_changed: (p) => object(p) && string(p.participantId) && string(p.name) && typeof p.connected === 'boolean'
};

export function createEventEnvelope(type, payload, id, occurredAt = new Date().toISOString()) {
  const envelope = { version: EVENT_VERSION, id, type, occurredAt, payload };
  if (!isEventEnvelope(envelope)) throw new TypeError(`Invalid classroom event: ${type}`);
  return envelope;
}

export function isEventEnvelope(value) {
  return object(value)
    && value.version === EVENT_VERSION
    && string(value.id) && value.id.length > 0 && value.id.length <= 100
    && string(value.type) && Object.hasOwn(validators, value.type)
    && string(value.occurredAt) && Number.isFinite(Date.parse(value.occurredAt))
    && validators[value.type](value.payload);
}
