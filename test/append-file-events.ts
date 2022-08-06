const log = './build/events.log';

const contexts = ['ledger', 'network', 'ui', 'crm', 'service'];
const entities = ['customers', 'services', 'invoices', 'payments'];
const ids = ['5432', '2345', '8765', '6543'];
const events = ['CustomerCreated', 'NodeDisabled', 'InvoiceIssued'];
const origins = ['ui', 'sis', 'firewall', 'insert'];
const publishers = ['sis', 'anonymous', 'root', 'admin'];
const correlationIds = ['cmd', 'crl'];

const random = (max: number): number => Math.floor(Math.random() * max);
const randomOf = (items: string[]): string => items[random(items.length)];
const stream = () => `/${randomOf(contexts)}/${randomOf(entities)}/${randomOf(ids)}`;
const correlationId = () =>
  random(2) ? `${randomOf(correlationIds)}${random(99) + 1}` : undefined;

const interval = setInterval(() => {
  Deno.writeTextFile(
    log,
    JSON.stringify({
      occurredAt: new Date().toISOString(),
      event: randomOf(events),
      stream: stream(),
      origin: randomOf(origins),
      publisher: randomOf(publishers),
      correlationId: correlationId(),
    }) + '\n',
    { append: true }
  );
}, 1000);

setTimeout(() => {
  clearInterval(interval);
}, 10000);
