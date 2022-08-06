import { serve } from 'https://deno.land/std@0.147.0/http/server.ts';

import {
  eventDefOf,
  Event,
  RejectedEventBody,
  ErrorMessage,
  RejectedEvent,
  EventBody,
} from './domain.ts';
import { DbEventLog } from './db-event-log.ts';

const eventLog = new DbEventLog(Deno.args[0]);

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method !== 'POST' || !url.pathname.startsWith('/events') || !req.body) {
    return new Response(undefined, { status: 404 });
  }
  const body = await req.text();
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch (e: unknown) {
    const rejected = eventLog.reject({
      reason: 'unsupported',
      message: (e as { message: string })?.message as ErrorMessage,
      body: body as RejectedEventBody,
    });
    return new Response(JSON.stringify(rejected), {
      status: 415,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const items: { [key: string]: unknown }[] = Array.isArray(json) ? json : [json];
  const result: (Event | RejectedEvent)[] = items.map((item) => {
    const mandatory = ['occurredAt', 'event', 'stream', 'origin', 'publisher'];
    const optional = new Set(['payload', 'correlationId']);
    const props = Object.keys(item).reduce(
      (acc, key) => {
        if (!acc.missing.delete(key) && !optional.has(key)) {
          acc.extra.add(key);
        }
        return acc;
      },
      { missing: new Set(mandatory), extra: new Set() }
    );
    if (props.missing.size > 0 || props.extra.size > 0) {
      return eventLog.reject({
        reason: 'malformed',
        message: `missing properties [${[...props.missing].join(
          ', '
        )}], extra properties [${[...props.extra].join(', ')}]` as ErrorMessage,
        body: body as RejectedEventBody,
      });
    }
    let eventDef;
    try {
      eventDef = eventDefOf(item as unknown as EventBody);
    } catch (e) {
      return eventLog.reject({
        reason: 'invalid',
        message: (e as { message: string })?.message as ErrorMessage,
        body: body as RejectedEventBody,
      });
    }
    try {
      return eventLog.publish(eventDef);
    } catch (e) {
      return eventLog.reject({
        reason: 'unknown',
        message: (e as { message: string })?.message as ErrorMessage,
        body: body as RejectedEventBody,
      });
    }
  });
  return new Response(JSON.stringify(result.length ? result : result[0]), {
    status: 201,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

serve(handler, { port: 9999 });
