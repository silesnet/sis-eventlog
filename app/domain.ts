import type { Opaque } from './core.ts';

export interface EventLog {
  publish(event: EventDef): Event;
  reject(event: RejectedEventDef): RejectedEvent;
  query(query?: StreamQuery, since?: EventId, limit?: BatchLimit): Event[];
  fetch(eventId: EventId): Event;
  subscribe(query: StreamQuery, event: EventName, onEventFn: EventHandler): Subscription;
  shutdown(): void;
}

export interface EventDef {
  readonly occurredAt: UtcTimestamp;
  readonly event: EventName;
  readonly stream: Stream;
  readonly payload?: Payload;
  readonly origin: Origin;
  readonly publisher: Publisher;
  readonly correlationId?: CorrelationId;
}

export interface Event {
  readonly eventId: EventId;
  readonly occurredAt: UtcTimestamp;
  readonly event: EventName;
  readonly stream: Stream;
  readonly payload?: Payload;
  readonly origin: Origin;
  readonly publisher: Publisher;
  readonly correlationId: CorrelationId;
  readonly publishedAt: UtcTimestamp;
}

export interface RejectedEvent {
  readonly id: RejectedEventId;
  readonly rejectedAt: UtcTimestamp;
  readonly reason: RejectReason;
  readonly message?: ErrorMessage;
  readonly body: RejectedEventBody;
}

export interface RejectedEventDef {
  readonly reason: RejectReason;
  readonly message?: ErrorMessage;
  readonly body: RejectedEventBody;
}

export interface EventBody {
  readonly occurredAt: string;
  readonly event: string;
  readonly stream: string;
  readonly payload?: Record<string, unknown>;
  readonly origin: string;
  readonly publisher: string;
  readonly correlationId?: string;
}

export function eventDefOf(body: EventBody): EventDef {
  return {
    occurredAt: utcTimestampOf(body.occurredAt),
    event: eventNameOf(body.event),
    stream: streamOf(body.stream),
    payload: body.payload !== undefined ? payloadOf(body.payload) : undefined,
    origin: originOf(body.origin),
    publisher: publisherOf(body.publisher),
    correlationId:
      body.correlationId !== undefined ? correlationIdOf(body.correlationId) : undefined,
  };
}

export type StreamQuery = Opaque<string, 'StreamQuery'>;
export const ANY_STREAM = '/*' as StreamQuery;

export type BatchLimit = Opaque<number, 'BatchLimit'>;
export const SMALL_BATCH = 10 as BatchLimit;

export type EventHandler = (event: Event) => Promise<void>;
export interface Subscription {
  unsubscribe(): void;
}

export type EventId = Opaque<number, 'EventId'>;
export function eventIdOf(eventId: unknown): EventId {
  return checkId(eventId, 'EventId') as EventId;
}
export const SINCE_BEGINNING = 0 as EventId;

export type RejectedEventId = Opaque<number, 'RejectedEventId'>;
export function rejectedEventIdOf(rejectedEventId: unknown): RejectedEventId {
  return checkId(rejectedEventId, 'RejectedEventId') as RejectedEventId;
}

export type UtcTimestamp = Opaque<string, 'UtcTimestamp'>;
const UTC_PATTERN = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
export function utcTimestampOf(utc: unknown): UtcTimestamp {
  if (typeof utc !== 'string' || !utc.match(UTC_PATTERN) || isNaN(Date.parse(utc))) {
    throw new Error(
      `UtcTimestamp should be of "YYYY-mm-ddTHH:MM:S.SSSZ", but was: '${utc}'`
    );
  }
  return utc as UtcTimestamp;
}

export type EventName = Opaque<string, 'EventName'>;
const EVENT_NAME_PATTERN = /^[A-Z][a-zA-Z0-9]*$/;
export function eventNameOf(eventName: unknown): EventName {
  if (typeof eventName !== 'string' || !eventName.match(EVENT_NAME_PATTERN)) {
    throw new Error(`EventName should be in camel case, but was: '${eventName}'`);
  }
  if (eventName.length >= 100) {
    throw new Error(
      `event name is too long, it should be [1, 99], but was: '${eventName.length}'`
    );
  }
  return eventName as EventName;
}
export const ANY_EVENT = '*' as EventName;

export type Stream = Opaque<string, 'Stream'>;
const STREAM_PATTERN = /^\/([a-z]+\/?([a-z]+\/?([a-z0-9-]+)?)?)?$/;
export function streamOf(stream: unknown): Stream {
  if (typeof stream !== 'string' || !stream.match(STREAM_PATTERN)) {
    throw new Error(`Stream should be of "/context?/entity?/id?", but was: '${stream}'`);
  }
  if (stream.length >= 200) {
    throw new Error(
      `stream is too long, it should be [1, 199], but was: '${stream.length}'`
    );
  }
  return stream as Stream;
}

export type Payload = Opaque<Record<string, unknown>, 'Payload'>;
export function payloadOf(payload: unknown): Payload {
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    throw new Error(`payload should be non empty object, but was '${payload}'`);
  }
  const length = JSON.stringify(payload).length;
  if (length >= 2000) {
    throw new Error(
      `payload is too long, it should be serialized under 2000 bytes, but was: '${length}'`
    );
  }
  return payload as Payload;
}

export type Origin = Opaque<string, 'Origin'>;
export function originOf(origin: unknown): Origin {
  return checkIdentifier(origin, 'Origin') as Origin;
}

export type Publisher = Opaque<string, 'Publisher'>;
export function publisherOf(publisher: unknown): Publisher {
  return checkIdentifier(publisher, 'Publisher') as Publisher;
}

export type CorrelationId = Opaque<string, 'CorrelationId'>;
const CORRELATION_ID_PATTERN = /^(def|evt|cmd|crl)[1-9][0-9]*$/;
export function correlationIdOf(correlationId: unknown): CorrelationId {
  if (typeof correlationId !== 'string' || !CORRELATION_ID_PATTERN.test(correlationId)) {
    throw new Error(
      `correlation id should be '${CORRELATION_ID_PATTERN}', but was: '${correlationId}'`
    );
  }
  if (correlationId.length >= 100) {
    throw new Error(
      `correlation id is too long, it should be [1, 99], but was: '${correlationId.length}'`
    );
  }
  return correlationId as CorrelationId;
}

// TODO fix the types
export type RejectReason = 'unsupported' | 'malformed' | 'invalid' | 'unknown';
export type ErrorMessage = Opaque<string, 'ErrorMessage'>;
export type RejectedEventBody = Opaque<string, 'RejectedEventBody'>;

const checkId = (value: unknown, type: string): number => {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`${type} should be > 0, but was: '${value}'`);
  }
  return value as number;
};

const IDENTIFIER_PATTERN = /^[a-z][a-z0-9]*$/;
const checkIdentifier = (identifier: unknown, type: string): string => {
  if (typeof identifier !== 'string' || !identifier.match(IDENTIFIER_PATTERN)) {
    throw new Error(`${type} should be lower case identifier, but was: '${identifier}'`);
  }
  if (identifier.length >= 100) {
    throw new Error(
      `identifier is too long, it should be [1, 99], but was: '${identifier.length}'`
    );
  }
  return identifier as string;
};
