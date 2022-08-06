import { DB, PreparedQuery } from 'https://deno.land/x/sqlite@v3.4.0/mod.ts';
import {
  ANY_STREAM,
  SMALL_BATCH,
  SINCE_BEGINNING,
  eventIdOf,
  Event,
  EventLog,
  correlationIdOf,
  eventNameOf,
  originOf,
  payloadOf,
  publisherOf,
  streamOf,
  utcTimestampOf,
  StreamQuery,
  EventDef,
  EventId,
  EventName,
  BatchLimit,
  Subscription,
  EventHandler,
RejectedEventDef,
RejectedEvent,
} from './domain.ts';
import { createDb } from './create-db.sql.ts';

interface EventRecord {
  readonly event_id: number;
  readonly occurred_at: string;
  readonly event: string;
  readonly stream: string;
  readonly payload: string | null;
  readonly origin: string;
  readonly publisher: string;
  readonly correlation_id: string;
  readonly published_at: string;
}

interface RejectedEventRecord {
  readonly id: number;
  readonly rejected_at: string;
  readonly reason: string;
  readonly message: string | null;
  readonly body: string;
}
export function eventOf(record: EventRecord): Event {
  return {
    eventId: eventIdOf(record.event_id),
    occurredAt: utcTimestampOf(record.occurred_at),
    event: eventNameOf(record.event),
    stream: streamOf(record.stream),
    payload: record.payload ? payloadOf(JSON.parse(record.payload)) : undefined,
    origin: originOf(record.origin),
    publisher: publisherOf(record.publisher),
    correlationId: correlationIdOf(record.correlation_id),
    publishedAt: utcTimestampOf(record.published_at),
  };
}

export class DbEventLog implements EventLog {
  readonly #db: DB;
  readonly #query: PreparedQuery;
  readonly #append: PreparedQuery;
  readonly #reject: PreparedQuery;
  readonly #fetch: PreparedQuery;
  readonly #subscriptions = new Map<string, Map<symbol, EventHandler>>;

  constructor(file: string) {
    this.#db = new DB(file);
    const [created] = this.#db.query(
      `select 1 from sqlite_master
       where
         type='table'
         and name='events'`
    );
    if (!created) {
      this.#db.execute(createDb);
    }
    this.#query = this.#db.prepareQuery(
      `select * from events
       where
         stream glob :stream
         and event_id > :event_id
       order by event_id limit :limit`
    );
    this.#append = this.#db.prepareQuery(
      `insert into
         events(occurred_at, event, stream, payload, origin, publisher, correlation_id)
         values(:occurred_at, :event, :stream, :payload, :origin, :publisher, :correlation_id)
       on conflict do update set event = event
       returning event_id`
    );
    this.#reject = this.#db.prepareQuery(
      `insert into
         rejected_events(rejected_at, reason, message, body)
         values(:rejected_at, :reason, :message, :body)
       on conflict do update set reason = reason
       returning *`
    );
    this.#fetch = this.#db.prepareQuery(
      `select * from events
       where
         event_id = :event_id`
    );
  }

  publish(event: EventDef): Event {
    const eventId = eventIdOf(
      this.#append.one({
        occurred_at: event.occurredAt,
        event: event.event,
        stream: event.stream,
        payload: event.payload ? JSON.stringify(event.payload) : null,
        origin: event.origin,
        publisher: event.publisher,
        correlation_id: event.correlationId ?? 'def1',
      })[0]
    );
    const published = this.fetch(eventId);

    for (const [key, handlers] of this.#subscriptions) {
      const [streamQuery, eventSelector] = key.split('#');
      // FIXME it should not use startsWith when no '*' is used
      if (published.stream.startsWith(streamQuery.replace('*', '')) && published.event.startsWith(eventSelector.replace('*', ''))) {
        for (const handler of handlers.values()) {
          handler(published);
        }
      }
    }
    
    return published;
  }

  reject(event: RejectedEventDef): RejectedEvent {
    const rejected = this.#reject.oneEntry({
      rejected_at: new Date().toISOString(),
      reason: event.reason,
      message: event.message !== undefined ? event.message.substring(0, 2000) : undefined,
      body: event.body.substring(0, 5000)
    });
    return {
      id: rejected.id,
      rejectedAt: rejected.rejected_at,
      reason: rejected.reason,
      message: rejected.message ?? undefined,
      body: rejected.body
    } as RejectedEvent;
  }

  query(
    query: StreamQuery = ANY_STREAM,
    since: EventId = SINCE_BEGINNING,
    limit: BatchLimit = SMALL_BATCH
  ): Event[] {
    return this.#query
      .allEntries({ stream: query, event_id: since, limit: limit })
      .map((event: unknown) => eventOf(event as EventRecord));
  }

  fetch(eventId: EventId): Event {
    return eventOf(this.#fetch.oneEntry({ event_id: eventId }) as unknown as EventRecord);
  }

  subscribe(query: StreamQuery, event: EventName, onEventFn: EventHandler): Subscription {
    const subscriptions = this.#subscriptions;
    const key = `${query}#${event}`;
    if (!subscriptions.has(key)) {
      subscriptions.set(key, new Map<symbol, EventHandler>);
    }
    const subscription = Symbol();
    subscriptions.get(key)!.set(subscription, onEventFn);

    return {
      unsubscribe() {
        subscriptions.get(key)!.delete(subscription);
      },
    };
  }

  shutdown(): void {
    this.#query.finalize();
    this.#append.finalize();
    this.#reject.finalize();
    this.#fetch.finalize();
    this.#db.close();
  }
}
