import { MAX_COMMANDS, inspectRecord } from './record.ts';
import type { BridgeDictionary, Command, Producer, TraceRecord } from './record.ts';

/**
 * The local VDfirst bridge (`workbench_server.py`, 127.0.0.1:8765), reached through Vite's dev proxy.
 * Every path is relative, so nothing leaves this computer. The bridge is stateless: each call sends
 * the whole record and gets back a new one, or an error and no record.
 */
export const BRIDGE_ROOT = '/api/workbench';

export class BridgeError extends Error {
  /** True when the bridge could not be reached at all, as opposed to refusing a command. */
  readonly offline: boolean;
  constructor(message: string, offline = false) { super(message); this.name = 'BridgeError'; this.offline = offline; }
}

type Fetch = typeof fetch;

async function call(path: string, init: RequestInit, fetcher: Fetch): Promise<unknown> {
  let response: Response;
  try { response = await fetcher(`${BRIDGE_ROOT}/${path}`, init); }
  catch { throw new BridgeError('The local engine did not answer. Is the bridge running?', true); }
  let body: unknown = null;
  try { body = await response.json(); } catch { /* the error below says what happened */ }
  if (!response.ok) {
    const message = body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : '';
    // The Vite proxy answers 502 or 504 when nothing is listening on the bridge port.
    if (!message && [502, 503, 504].includes(response.status)) throw new BridgeError('The local engine did not answer. Is the bridge running?', true);
    if (/origin is not an allowed local workbench/.test(message)) {
      const origin = globalThis.location?.origin ?? 'this page';
      throw new BridgeError(`The engine refused this page's address (${origin}). Restart the bridge with --allow-origin ${origin}, or run the site on port 5173.`);
    }
    throw new BridgeError(message || `The local engine answered ${response.status}.`);
  }
  return body;
}

const post = (path: string, payload: unknown, fetcher: Fetch) =>
  call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, fetcher);

function recordFrom(body: unknown): TraceRecord {
  const record = body && typeof body === 'object' ? (body as { record?: unknown }).record : undefined;
  try { return inspectRecord(record); }
  catch (error) { throw new BridgeError(`The engine sent a record this page cannot read: ${(error as Error).message}`); }
}

export async function health(fetcher: Fetch = fetch): Promise<Producer> {
  const body = await call('health', { method: 'GET' }, fetcher) as { producer?: Producer } | null;
  if (!body?.producer || typeof body.producer.engine_sha256 !== 'string') throw new BridgeError('Something answered on the bridge port, but not the VDfirst bridge.');
  return body.producer;
}

export async function start(dictionary: BridgeDictionary, demand: string, context: string, fetcher: Fetch = fetch): Promise<TraceRecord> {
  return recordFrom(await post('start', { dictionary, demand, context }, fetcher));
}

export async function command(record: TraceRecord, next: Command, fetcher: Fetch = fetch): Promise<TraceRecord> {
  return recordFrom(await post('command', { record, command: next }, fetcher));
}

/**
 * Several commands as one action, all or nothing. The first is sent, the rest are read off the record
 * it produced, and each is sent in turn. The bridge keeps nothing, so a record exists only once the
 * page keeps it: if any step is refused, or the steps would not fit in a record, this throws and the
 * caller keeps the record it had. That matches the engine's own replacement at expansion, which refuses
 * before it records anything.
 */
export async function commandSteps(record: TraceRecord, first: Command, then: (record: TraceRecord) => Command[], fetcher: Fetch = fetch): Promise<TraceRecord> {
  if (record.commands.length + 1 > MAX_COMMANDS) throw new BridgeError(`A record holds at most ${MAX_COMMANDS} steps.`);
  let next = await command(record, first, fetcher);
  const rest = then(next);
  const total = 1 + rest.length;
  if (record.commands.length + total > MAX_COMMANDS) {
    const room = MAX_COMMANDS - record.commands.length;
    throw new BridgeError(`This takes ${total} steps, and the record has room for ${room === 1 ? 'one more' : `${room} more`}. Nothing was recorded.`);
  }
  for (const item of rest) next = await command(next, item, fetcher);
  return next;
}

/** Ask the engine to replay a record exactly. Needed before continuing a record opened from a file. */
export async function validate(record: TraceRecord, fetcher: Fetch = fetch): Promise<TraceRecord> {
  return recordFrom(await post('validate', { record }, fetcher));
}

/**
 * A new record that repeats the first `count` commands of another: how to go back to an earlier
 * step without changing the record that went past it. Calls the engine once per command.
 */
export async function restartFrom(record: TraceRecord, count: number, dictionary: BridgeDictionary, fetcher: Fetch = fetch): Promise<TraceRecord> {
  let next = await start(dictionary, record.question.demand, record.question.context, fetcher);
  for (const item of record.commands.slice(0, count)) next = await command(next, item, fetcher);
  return next;
}

/** The bridge's dictionary, rebuilt from a record: the same entries in the same order. */
export const recordDictionary = (record: TraceRecord): BridgeDictionary => ({
  name: record.dictionary.name,
  entries: record.dictionary.entries.map(entry => [entry.headword, entry.definition]),
});
