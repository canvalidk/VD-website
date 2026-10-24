import type { PredictionSnapshot } from './predictions.ts';
import type { PreparedTrace } from './data/traces.ts';

export const MAX_RECORD_BYTES = 8 * 1024 * 1024;
export type Operation = 'expand' | 'recall' | 'inject' | 'reduce' | 'reopen' | 'clean';
export interface WorkbenchCommand {
  operation: Operation; frame_id: string; position?: number; entry_index?: number;
  response?: string; latents?: string[]; note?: string;
}
export interface WorkbenchFrame {
  id: string; address: number[]; parent_id: string | null; via_position: number | null;
  render: string; resolved: boolean; reduced: string | null; source_index: number | null;
  headwords: string[]; latents: string[];
  holes: {
    position: number; headword: string; resolution: 'expand' | 'recall' | 'inject' | null;
    child_frame_id: string | null; source_index: number | null;
    candidates: { entry_index: number; headword: string; definition: string; instantiated_definition: string }[];
  }[];
}
export interface WorkbenchSnapshot {
  id: string; command_index: number; title: string; root_frame_id: 'F'; event_count: number;
  frames: WorkbenchFrame[]; prediction_set: PredictionSnapshot;
}
export interface TraceRecord {
  format: 'vd-trace-record'; version: 1; record_id: string; sha256: string;
  producer: { name: 'VDfirst'; protocol_version: 1; engine_sha256: string };
  dictionary: { name: string; entries: { index: number; headword: string; definition: string }[]; sha256: string };
  question: { demand: string; context: string }; commands: WorkbenchCommand[];
  events: { id: string; index: number; kind: string; detail: string; change: Record<string, unknown> | null }[];
  snapshots: WorkbenchSnapshot[];
}

type ObjectValue = Record<string, unknown>;
function fail(path: string, reason = 'has an invalid value'): never { throw new Error(`${path} ${reason}.`); }
function object(value: unknown, path: string): ObjectValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'must be an object');
  return value as ObjectValue;
}
function string(value: unknown, path: string, nonempty = false): asserts value is string {
  if (typeof value !== 'string' || (nonempty && !value.trim())) fail(path, 'must be text' + (nonempty ? ' with a value' : ''));
}
function integer(value: unknown, path: string, min = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < min) fail(path, 'must be a whole number');
}
function bool(value: unknown, path: string): asserts value is boolean { if (typeof value !== 'boolean') fail(path, 'must be true or false'); }
function array(value: unknown, path: string): unknown[] { if (!Array.isArray(value)) fail(path, 'must be a list'); return value; }
function strings(value: unknown, path: string): string[] { return array(value, path).map((item, i) => { string(item, `${path}[${i}]`); return item; }); }
function indexes(value: unknown, path: string): number[] { return array(value, path).map((item, i) => { integer(item, `${path}[${i}]`); return item; }); }
function unique(values: (string | number)[], path: string) { if (new Set(values).size !== values.length) fail(path, 'contains duplicates'); }
function source(value: unknown, path: string, entryCount: number) {
  if (value !== null) { integer(value, path); if (value >= entryCount) fail(path, 'refers to a missing dictionary entry'); }
}
function digest(value: unknown, path: string) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(path, 'must be a SHA-256 digest'); }
const operations: Operation[] = ['expand', 'recall', 'inject', 'reduce', 'reopen', 'clean'];

function inspectJsonBounds(value: unknown) {
  const pending: [unknown, number][] = [[value, 0]];
  const seen = new Set<object>(); let count = 0;
  while (pending.length) {
    const [item, depth] = pending.pop()!;
    if (++count > 1000000 || depth > 96) fail('Record', 'is too complex for this viewer');
    if (typeof item === 'number' && !Number.isFinite(item)) fail('Record', 'contains a non-finite number');
    if (item && typeof item === 'object') {
      if (seen.has(item)) fail('Record', 'must be a JSON tree without repeated references');
      seen.add(item);
      for (const child of Object.values(item)) pending.push([child, depth + 1]);
    }
  }
}

/** Structural display validation only. Replay and digest validation belong to VDfirst. */
export function inspectRecord(value: unknown): TraceRecord {
  inspectJsonBounds(value);
  const record = object(value, 'Record');
  if (record.format !== 'vd-trace-record' || record.version !== 1) fail('Record', 'uses an unsupported format or version');
  string(record.record_id, 'Record ID', true);
  digest(record.sha256, 'Record digest');
  const producer = object(record.producer, 'Producer');
  if (producer.name !== 'VDfirst' || producer.protocol_version !== 1) fail('Producer', 'uses an unsupported protocol');
  digest(producer.engine_sha256, 'Engine fingerprint');
  const dictionary = object(record.dictionary, 'Dictionary');
  string(dictionary.name, 'Dictionary name', true); digest(dictionary.sha256, 'Dictionary digest');
  const entries = array(dictionary.entries, 'Dictionary entries');
  if (entries.length > 1000) fail('Dictionary', 'contains too many entries for this viewer');
  entries.forEach((value, i) => {
    const entry = object(value, `Entry ${i}`);
    if (entry.index !== i) fail(`Entry ${i}`, 'has an inconsistent index');
    string(entry.headword, `Entry ${i} headword`, true); string(entry.definition, `Entry ${i} definition`);
  });
  const question = object(record.question, 'Question');
  string(question.demand, 'Demand', true); string(question.context, 'Context');
  const commands = array(record.commands, 'Commands');
  if (commands.length > 1000) fail('Record', 'contains too many commands for this viewer');
  commands.forEach((value, i) => {
    const command = object(value, `Command ${i}`);
    if (!operations.includes(command.operation as Operation)) fail(`Command ${i} operation`);
    string(command.frame_id, `Command ${i} frame`, true);
    if (command.note !== undefined) string(command.note, `Command ${i} note`);
    const fields = ['operation', 'frame_id', 'note'];
    if (['expand', 'recall', 'inject'].includes(command.operation as string)) {
      fields.push('position'); integer(command.position, `Command ${i} position`);
    }
    if (['expand', 'recall'].includes(command.operation as string)) {
      fields.push('entry_index'); integer(command.entry_index, `Command ${i} entry`); source(command.entry_index, `Command ${i} entry`, entries.length);
    }
    if (['inject', 'reduce'].includes(command.operation as string)) { fields.push('response'); string(command.response, `Command ${i} response`, true); }
    if (command.operation === 'clean') { fields.push('latents'); strings(command.latents, `Command ${i} literal prose`); }
    if (Object.keys(command).some(key => !fields.includes(key))) fail(`Command ${i}`, 'contains unrelated fields');
  });
  const events = array(record.events, 'Events');
  events.forEach((value, i) => {
    const event = object(value, `Event ${i}`);
    if (event.index !== i || event.id !== `event-${i}`) fail(`Event ${i}`, 'has an inconsistent identity');
    string(event.kind, `Event ${i} kind`, true); string(event.detail, `Event ${i} detail`);
    if (event.change !== null) object(event.change, `Event ${i} change`);
  });
  const snapshots = array(record.snapshots, 'Snapshots');
  if (snapshots.length !== commands.length + 1) fail('Snapshots', 'must include the initial state and one state per command');
  let previousCount = 0;
  snapshots.forEach((value, i) => {
    const path = `Snapshot ${i}`; const snapshot = object(value, path);
    if (snapshot.id !== `S${i}` || snapshot.command_index !== i - 1 || snapshot.root_frame_id !== 'F') fail(path, 'has an inconsistent identity');
    string(snapshot.title, `${path} title`); integer(snapshot.event_count, `${path} event count`);
    if (snapshot.event_count < previousCount || snapshot.event_count > events.length) fail(path, 'has an inconsistent event count');
    previousCount = snapshot.event_count;
    const frames = array(snapshot.frames, `${path} frames`);
    if (!frames.length || frames.length > 10000) fail(`${path} frames`, 'must contain a bounded nonempty frame tree');
    const ids = frames.map((value, n) => {
      const frame = object(value, `${path} frame ${n}`); string(frame.id, `${path} frame ID`, true); return frame.id;
    });
    unique(ids, `${path} frame IDs`);
    const frameMap = new Map(ids.map((id, n) => [id, object(frames[n], `${path} ${id}`)]));
    frames.forEach((value, n) => {
      const frame = object(value, `${path} frame ${n}`); const label = `${path} ${frame.id}`;
      const address = indexes(frame.address, `${label} address`);
      if (frame.id !== `F${address.map(item => `/${item}`).join('')}`) fail(label, 'has an inconsistent address');
      string(frame.render, `${label} render`); bool(frame.resolved, `${label} settled state`);
      if (frame.reduced !== null) string(frame.reduced, `${label} reduction`);
      source(frame.source_index, `${label} source`, entries.length);
      const headwords = strings(frame.headwords, `${label} headwords`);
      const latents = strings(frame.latents, `${label} literal prose`);
      if (latents.length !== headwords.length + 1) fail(label, 'has an inconsistent literal-prose layout');
      if (!address.length) {
        if (frame.parent_id !== null || frame.via_position !== null) fail(label, 'has an invalid root parent');
      } else {
        const parentId = `F${address.slice(0, -1).map(item => `/${item}`).join('')}`;
        if (frame.parent_id !== parentId || frame.via_position !== address.at(-1) || !frameMap.has(parentId)) fail(label, 'has a missing or inconsistent parent');
      }
      const holes = array(frame.holes, `${label} holes`);
      if (holes.length !== headwords.length) fail(label, 'has an inconsistent hole list');
      holes.forEach((value, position) => {
        const hole = object(value, `${label} hole ${position}`);
        if (hole.position !== position || hole.headword !== headwords[position]) fail(label, 'has inconsistent hole positions');
        if (![null, 'expand', 'recall', 'inject'].includes(hole.resolution as null)) fail(label, 'has an unknown resolution');
        source(hole.source_index, `${label} hole source`, entries.length);
        if (hole.child_frame_id !== null) {
          if (hole.child_frame_id !== `${frame.id}/${position}` || !frameMap.has(hole.child_frame_id as string) || hole.resolution === null) fail(label, 'references a missing or inconsistent child');
        } else if (hole.resolution === 'expand' || hole.resolution === 'inject') fail(label, 'is missing a resolved child');
        if (hole.resolution === null && frameMap.has(`${frame.id}/${position}`)) fail(label, 'has an unlinked child');
        const candidates = array(hole.candidates, `${label} candidates`);
        const candidateIndexes: number[] = [];
        candidates.forEach(value => {
          const candidate = object(value, `${label} candidate`);
          integer(candidate.entry_index, `${label} candidate index`); source(candidate.entry_index, `${label} candidate`, entries.length);
          candidateIndexes.push(candidate.entry_index);
          string(candidate.headword, `${label} candidate headword`, true); string(candidate.definition, `${label} candidate definition`); string(candidate.instantiated_definition, `${label} instantiated definition`);
          const entry = object(entries[candidate.entry_index], 'Candidate entry');
          if (candidate.headword !== entry.headword || candidate.definition !== entry.definition) fail(label, 'has a candidate inconsistent with its dictionary entry');
        });
        unique(candidateIndexes, `${label} candidates`);
      });
      if (address.length) {
        const parent = frameMap.get(frame.parent_id as string)!;
        const parentHole = object(array(parent.holes, 'Parent holes')[address.at(-1)!], 'Parent hole');
        if (parentHole.child_frame_id !== frame.id) fail(label, 'is not linked by its parent');
      }
    });
    if (!frameMap.has('F')) fail(path, 'has no root frame');
    inspectPredictions(snapshot.prediction_set, path, snapshot.event_count as number, entries.length);
    const predictionSet = object(snapshot.prediction_set, path);
    if (predictionSet.result !== frameMap.get('F')!.render) fail(path, 'has inconsistent root results');
    if (i < commands.length) {
      const next = object(commands[i], `Command ${i}`);
      if (!frameMap.has(next.frame_id as string)) fail(`Command ${i}`, 'targets a missing frame');
    }
  });
  if (previousCount !== events.length) fail('Final snapshot', 'does not include the full event history');
  // Return the exact parsed object, including producer evidence fields unknown to the viewer.
  return record as unknown as TraceRecord;
}

function inspectPredictions(value: unknown, path: string, eventCount: number, entryCount: number) {
  const set = object(value, `${path} prediction set`);
  if (set.schema_version !== 2) fail(path, 'has an unsupported prediction-set version');
  string(set.result, `${path} result`); bool(set.trace_complete, `${path} completion`);
  bool(set.dependency_selection_complete, `${path} support coverage`);
  if (set.coverage_complete !== false) fail(path, 'claims unsupported full prediction coverage');
  indexes(set.unrecorded_events, `${path} unrecorded events`).forEach(index => { if (index >= eventCount) fail(path, 'references a missing event'); });
  strings(set.limitations, `${path} limitations`);
  const claims = array(set.predictions, `${path} claims`);
  const ids: string[] = [];
  claims.forEach(value => {
    const claim = object(value, `${path} claim`); integer(claim.event_index, `${path} claim event`);
    if (claim.event_index >= eventCount || claim.id !== `P${claim.event_index}`) fail(path, 'has an inconsistent claim identity');
    ids.push(claim.id as string);
    for (const key of ['operation', 'kind', 'statement']) string(claim[key], `${path} claim ${key}`);
    if (claim.verification !== 'unchecked') fail(path, 'contains a verification state unsupported by this viewer');
    const classification = object(claim.classification, `${path} classification`);
    string(classification.category, `${path} category`); string(classification.note, `${path} classification note`);
    const evidence = object(claim.evidence, `${path} evidence`);
    string(evidence.stimulus, `${path} stimulus`); string(evidence.response, `${path} response`);
    bool(evidence.dependencies_complete, `${path} dependency coverage`);
    const dependencies = indexes(evidence.dependencies, `${path} dependencies`); unique(dependencies, `${path} dependencies`);
    if (dependencies.some(index => index >= (claim.event_index as number))) fail(path, 'has a non-earlier dependency');
    for (const key of ['before', 'after']) {
      const node = object(evidence[key], `${path} ${key} frame`);
      indexes(node.address, `${path} evidence address`); string(node.render, `${path} evidence render`);
      source(node.source_index, `${path} evidence source`, entryCount);
    }
  });
  unique(ids, `${path} claim IDs`);
  const current = strings(set.current_prediction_ids, `${path} current support`);
  const history = strings(set.historical_prediction_ids, `${path} historical support`);
  unique([...current, ...history], `${path} support groups`);
  if ([...current, ...history].some(id => !ids.includes(id))) fail(path, 'references an unknown claim');
  if (set.dependency_selection_complete && current.length + history.length !== ids.length) fail(path, 'has an incomplete support partition');
  if (!set.dependency_selection_complete && history.length) fail(path, 'asserts history-only support with incomplete selection');
}

export function parseRecord(text: string): TraceRecord {
  if (new TextEncoder().encode(text).byteLength > MAX_RECORD_BYTES) throw new Error('The record exceeds the 8 MiB local-file limit.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  return inspectRecord(parsed);
}

/** The adapter displays supplied snapshots; it never reconstructs trace semantics. */
export function recordPlayback(record: TraceRecord): PreparedTrace {
  return {
    id: record.record_id, dictionaryId: record.dictionary.sha256, title: record.question.demand,
    kind: 'recorded', provenance: 'VDfirst trace record. Interpreter responses are unchecked.',
    question: record.question.context,
    steps: record.snapshots.map((snapshot, i) => ({
      id: snapshot.id, title: snapshot.title, snapshotLabel: snapshot.id,
      operation: i === 0 ? 'Start' : record.commands[i - 1].operation === 'reopen' ? 'Reopen' : 'Onward',
      description: i === 0 ? 'Initial demand. Choose a frame and an open hole to begin.' : snapshot.title,
      context: 'Root frame', relatedEntryIds: [], fragment: [{ text: snapshot.prediction_set.result }],
      predictionSet: snapshot.prediction_set, settled: snapshot.prediction_set.trace_complete,
    })),
  };
}

export type WorkbenchEndpoint = 'start' | 'command' | 'validate';
export async function requestWorkbench(endpoint: WorkbenchEndpoint, body: unknown, fetcher: typeof fetch = fetch): Promise<TraceRecord> {
  let response: Response;
  try {
    response = await fetcher(`/api/workbench/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  } catch { throw new Error('Could not reach the local engine. Open connection help below, then try again. Your record is unchanged.'); }
  let payload: ObjectValue;
  try { payload = object(await response.json(), 'Engine response'); } catch { throw new Error('The local engine did not return a trace record. Open connection help below. Your record is unchanged.'); }
  if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'The local engine rejected this request. Your record is unchanged.');
  return inspectRecord(payload.record);
}
