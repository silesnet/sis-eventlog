export const createDb = `
drop table if exists events;

create table events (
  event_id integer primary key autoincrement
  -- UTC timestamp of the event occurrence
  , occurred_at text not null check (
    length(occurred_at) = 24
    and upper(replace(occurred_at, ' ', '')) = occurred_at
  ) default (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
  -- the event name
  , event text not null check (
    length(event) between 1 and 100
    and replace(event, ' ', '') = event
  )
  -- a stream the event is published into: /context/entity/id
  , stream text not null check (
    length(stream) between 1 and 200
    and lower(replace(stream, ' ', '')) = stream
    and substr(stream, 1, 1) = '/'
  ) default '/'
  -- event payload
  , payload jsonb check (
    payload is null
    or (length(payload) <= 2000 and json_valid(payload) = 1)
  )
  -- name of the system publishing the event
  , origin text not null check (
    length(origin) between 1 and 100
    and lower(replace(origin, ' ', '')) = origin
  ) default 'sis'
  -- login of the event publisher
  , publisher text not null check (
    length(publisher) between 1 and 100
    and lower(replace(publisher, ' ', '')) = publisher
  ) default 'sis'
  -- used for grouping correlated events
  , correlation_id text not null check (
    length(correlation_id) between 4 and 100
    and lower(replace(correlation_id, ' ', '')) = correlation_id
    and (substr(correlation_id, 1, 3) = 'def' or substr(correlation_id, 1, 3) = 'evt' or substr(correlation_id, 1, 3) = 'cmd' or substr(correlation_id, 1, 3) = 'crl')
    and cast(substr(correlation_id, 4) as integer) > 0
  ) default 'def1'
  -- UTC timestamp the event was inserted into the table
  , published_at text not null check (
    length(published_at) = 24
    and upper(replace(published_at, ' ', '')) = published_at
  ) default (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
);

create trigger default_correlation_id after insert on events
for each row
  when new.correlation_id = 'def1'
  begin
    update events set correlation_id = 'evt' || new.event_id where event_id = new.event_id;
  end;
 
create index idx_events_occurred_at on events (occurred_at);
create index idx_events_event on events (event);
create index idx_events_stream on events (stream);
create index idx_events_origin on events (origin);
create index idx_events_publisher on events (publisher);
create index idx_events_correlation_id on events (correlation_id);
create index idx_events_payload on events (payload);

create unique index idx_events_idempotent_events on events (occurred_at, event, stream); 

drop table if exists rejected_events;

create table rejected_events (
  id integer primary key autoincrement
  , rejected_at text not null check (
    length(rejected_at) = 24
    and upper(replace(rejected_at, ' ', '')) = rejected_at
  ) default (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  )
  , reason text not null check (
    reason = 'unsupported' or reason = 'malformed' or reason = 'invalid' or reason = 'unknown'
  )
  , message text check (
    message is null or (length(message) between 1 and 2000 and trim(message) != '')
  )
  , body text not null check (
    length(body) <= 5000
  )
);

create index idx_rejected_events_rejected_at on rejected_events (rejected_at);

create unique index idx_rejected_events_idempotent_rejected_events on rejected_events (reason, message, body); 
`;
