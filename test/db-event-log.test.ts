import {
  SINCE_BEGINNING,
  StreamQuery,
  eventDefOf,
  EventBody,
  SMALL_BATCH,
  ANY_STREAM,
  ANY_EVENT,
  EventName,
  RejectedEventBody,
} from '../app/domain.ts';
import { DbEventLog as EventLog } from '../app/db-event-log.ts';
import { DB } from 'https://deno.land/x/sqlite@v3.4.0/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.149.0/testing/asserts.ts';

const file = 'build/events.db';

Deno.test('event log', async (t) => {
  const events = new EventLog(file);

  const db = new DB(file);
  db.execute('delete from events;');
  db.execute(await Deno.readTextFile('test/resources/insert-sample-events.sql'));
  db.close();

  await t.step('publish minimal', () => {
    events.publish(reconnected);
  });

  await t.step('publish full', () => {
    events.publish(disconnected);
  });

  await t.step('reject', () => {
    const rejected = events.reject({
      reason: 'unsupported',
      body: '*' as RejectedEventBody,
    });
    console.log('rejected', rejected);
  });

  await t.step('query', () => {
    assert(events.query('/' as StreamQuery, SINCE_BEGINNING, SMALL_BATCH).length === 2);
  });

  await t.step('subscribe', () => {
    let hits = 0;
    const subscription = events.subscribe(ANY_STREAM, ANY_EVENT, (event) => {
      console.log('hit', event.eventId);
      hits++;
      return Promise.resolve();
    });
    events.publish({ ...disconnected, event: 'ItHappened' as EventName });
    subscription.unsubscribe();
    events.publish({ ...disconnected, event: 'ItAlsoHappened' as EventName });
    assertEquals(hits, 1);
  });

  events.shutdown();
});

const reconnected = eventDefOf({
  occurredAt: new Date().toISOString(),
  event: 'NodeReconnected',
  stream: '/network/node/node-ap3',
  origin: 'network',
  publisher: 'firewall',
} as EventBody);

const disconnected = eventDefOf({
  occurredAt: new Date().toISOString(),
  event: 'NodeDisconnected',
  stream: '/network/node/node-ap4',
  payload: { rule: 'console' },
  origin: 'network',
  publisher: 'shaper',
  correlationId: 'cmd87',
} as EventBody);
