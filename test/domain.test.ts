import { eventOf } from '../app/db-event-log.ts';
import { correlationIdOf, eventDefOf } from '../app/domain.ts';

Deno.test('event of record', () => {
  eventOf({
    event_id: 7,
    occurred_at: '2022-07-12T17:54:21.485Z',
    event: 'CustomerDeactivated',
    stream: '/crm/customer/7',
    payload: null,
    origin: 'sis',
    publisher: 'sis',
    correlation_id: 'cmd99',
    published_at: '2022-07-12T17:54:21.485Z',
  });
  eventOf({
    event_id: 8,
    occurred_at: '2022-07-12T17:54:21.485Z',
    event: 'CustomerActivated',
    stream: '/crm/customer/8',
    payload: '{ "type": "business" }',
    origin: 'sis',
    publisher: 'sis',
    correlation_id: 'evt8',
    published_at: '2022-07-12T17:54:21.485Z',
  });
});

Deno.test('event definition of body', () => {
  eventDefOf({
    occurredAt: '2022-07-12T17:54:21.485Z',
    event: 'CustomerDeactivated',
    stream: '/crm/customer/7',
    origin: 'sis',
    publisher: 'sis',
  });
  eventDefOf({
    occurredAt: '2022-07-12T17:54:21.485Z',
    event: 'CustomerActivated',
    stream: '/crm/customer/8',
    payload: { commandId: 4, error: null },
    origin: 'sis',
    publisher: 'sis',
    correlationId: 'cmd99',
  });
});
