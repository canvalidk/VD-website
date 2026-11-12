/**
 * The engine's trace record (`vd-trace-record` version 1, prediction-set schema 3 to 5), as the
 * VDfirst workbench bridge writes it. The site never makes or changes a record: the engine does,
 * one command at a time. This module reads records and checks their shape for display only;
 * replay and digests are checked by the engine when a record is continued.
 *
 * Client notes: VDfirst specs/2026-11-12-workbench-flatten-and-issue.md section 10 and
 * specs/2026-11-12-structured-arguments.md section 11.
 */

export const MAX_RECORD_BYTES = 8 * 1024 * 1024;
export const MAX_COMMANDS = 80;
export const SCHEMA_VERSIONS = [3, 4, 5] as const;

export type Operation = 'expand' | 'recall' | 'inject' | 'flatten' | 'reduce' | 'reopen' | 'clean' | 'issue';
export const OPERATIONS: Operation[] = ['expand', 'recall', 'inject', 'flatten', 'reduce', 'reopen', 'clean', 'issue'];
export type Resolution = 'expand' | 'recall' | 'inject' | 'flatten';

export interface Command {
  operation: Operation; frame_id: string; position?: number; entry_index?: number;
  response?: string; latents?: string[]; note?: string;
}
export interface Candidate { entry_index: number; headword: string; definition: string; instantiated_definition: string }
export interface Hole {
  position: number; headword: string; resolution: Resolution | null;
  child_frame_id: string | null; source_index: number | null; candidates: Candidate[];
}
export interface Frame {
  id: string; address: number[]; parent_id: string | null; via_position: number | null;
  render: string; resolved: boolean; reduced: string | null; source_index: number | null;
  headwords: string[]; latents: string[]; holes: Hole[];
}
export type CandidateKind = 'normalization' | 'entry_application' | 'entry_recall' | 'left_unexpanded' | 'supplied_input' | 'meaning_preservation';
export interface EntryEvidence {
  index: number; headword: string; definition: string; call: string; bindings: [string, string][];
  text: string; candidates: number[]; dictionary: string; clauses?: [number, string][];
}
export interface StepState { address: number[]; render: string; [key: string]: unknown }
export interface Evidence {
  stimulus: string; response: string; position: number | null; dependencies: number[];
  dependencies_complete: boolean; entry: EntryEvidence | null; before: StepState; after: StepState;
  [key: string]: unknown;
}
export interface Prediction {
  id: string; event_index: number; kind: CandidateKind; operation: string; statement: string;
  verification: string; evidence: Evidence; [key: string]: unknown;
}
export interface IssuedResult {
  id: string; event_index: number; demand: string; result: string; statement: string;
  prediction_ids: string[]; dependency_selection_complete: boolean; verification: string; [key: string]: unknown;
}
export interface PredictionSet {
  schema_version: number; result: string; trace_complete: boolean; coverage_complete: boolean;
  dependency_selection_complete: boolean; current_prediction_ids: string[]; historical_prediction_ids: string[];
  predictions: Prediction[]; issued: IssuedResult[]; limitations: string[]; scope: string; [key: string]: unknown;
}
export interface Snapshot {
  id: string; command_index: number; title: string; root_frame_id: 'F'; event_count: number;
  frames: Frame[]; prediction_set: PredictionSet;
}
export interface TraceEvent { id: string; index: number; kind: string; detail: string; change: Record<string, unknown> | null }
export interface Producer { name: 'VDfirst'; protocol_version: 1; engine_sha256: string }
export interface TraceRecord {
  format: 'vd-trace-record'; version: 1; record_id: string; sha256: string; producer: Producer;
  dictionary: { name: string; entries: { index: number; headword: string; definition: string }[]; sha256: string };
  question: { demand: string; context: string }; commands: Command[]; events: TraceEvent[]; snapshots: Snapshot[];
}
/** What the bridge's start route takes: the exact dictionary, entries in the order added. */
export interface BridgeDictionary { name: string; entries: [string, string][] }

/** The engine's own one-line description of each candidate kind (prediction_set.KIND_DESCRIPTIONS). */
export const KIND_DESCRIPTIONS: Record<CandidateKind, string> = {
  normalization: 'the starting demand states what is asked',
  entry_application: 'a dictionary entry was applied to a demand, which continues as a child demand',
  entry_recall: "a dictionary entry's text was inserted for a demand as it stands",
  left_unexpanded: 'a headword was left as plain text, with no entry applied',
  supplied_input: 'a response was supplied for a demand from outside the dictionary',
  meaning_preservation: 'one wording was replaced by another said to mean the same',
};
/** Short names the site uses for the kinds. */
export const KIND_LABELS: Record<CandidateKind, string> = {
  normalization: 'question',
  entry_application: 'entry applied',
  entry_recall: 'entry recalled',
  left_unexpanded: 'left as text',
  supplied_input: 'supplied input',
  meaning_preservation: 'same meaning',
};
const KINDS = Object.keys(KIND_DESCRIPTIONS) as CandidateKind[];

// ---------------------------------------------------------------- shape checks

type Obj = Record<string, unknown>;
function fail(path: string, reason = 'has an unexpected value'): never { throw new Error(`${path} ${reason}.`); }
function obj(value: unknown, path: string): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  return value as Obj;
}
function list(value: unknown, path: string): unknown[] { if (!Array.isArray(value)) fail(path, 'must be a list'); return value; }
function text(value: unknown, path: string, nonempty = false): string {
  if (typeof value !== 'string' || (nonempty && !value.trim())) fail(path, nonempty ? 'must be text with a value' : 'must be text');
  return value;
}
function whole(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(path, 'must be a whole number');
  return value as number;
}
function flag(value: unknown, path: string): boolean { if (typeof value !== 'boolean') fail(path, 'must be true or false'); return value; }
function maybeWhole(value: unknown, path: string) { if (value !== null) whole(value, path); }
function maybeText(value: unknown, path: string) { if (value !== null) text(value, path); }
function digest(value: unknown, path: string) { if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) fail(path, 'must be a SHA-256 digest'); }

function checkCommand(value: unknown, path: string, entryCount: number) {
  const command = obj(value, path);
  const operation = command.operation as Operation;
  if (!OPERATIONS.includes(operation)) fail(`${path} operation`, `is not one of ${OPERATIONS.join(', ')}`);
  if (typeof command.frame_id !== 'string' || !/^F(\/(0|[1-9][0-9]*))*$/.test(command.frame_id)) fail(`${path} frame`, 'must be a frame id such as F or F/0');
  const extra: Record<Operation, string[]> = {
    expand: ['position', 'entry_index'], recall: ['position', 'entry_index'], inject: ['position', 'response'],
    flatten: ['position'], reduce: ['response'], reopen: [], clean: ['latents'], issue: [],
  };
  const allowed = new Set(['operation', 'frame_id', 'note', ...extra[operation]]);
  for (const key of Object.keys(command)) if (!allowed.has(key)) fail(path, `has a field ${key} that ${operation} does not take`);
  for (const key of extra[operation]) if (!(key in command)) fail(path, `is missing ${key}`);
  if ('position' in command) whole(command.position, `${path} position`);
  if ('entry_index' in command && whole(command.entry_index, `${path} entry`) >= entryCount) fail(`${path} entry`, 'is not in the dictionary');
  if ('response' in command) text(command.response, `${path} response`, true);
  if ('latents' in command) list(command.latents, `${path} wording`).forEach((item, i) => text(item, `${path} wording ${i}`));
  if ('note' in command) text(command.note, `${path} note`);
}

function checkFrame(value: unknown, path: string, entryCount: number): Frame {
  const frame = obj(value, path);
  text(frame.id, `${path} id`, true);
  list(frame.address, `${path} address`).forEach((item, i) => whole(item, `${path} address ${i}`));
  maybeText(frame.parent_id, `${path} parent`); maybeWhole(frame.via_position, `${path} position`);
  text(frame.render, `${path} reading`); flag(frame.resolved, `${path} resolved`); maybeText(frame.reduced, `${path} reduction`);
  maybeWhole(frame.source_index, `${path} entry`);
  const headwords = list(frame.headwords, `${path} headwords`).map((item, i) => text(item, `${path} headword ${i}`, true));
  const latents = list(frame.latents, `${path} wording`).map((item, i) => text(item, `${path} wording ${i}`));
  if (latents.length !== headwords.length + 1) fail(`${path} wording`, 'must have one more piece than the frame has headwords');
  const holes = list(frame.holes, `${path} holes`);
  if (holes.length !== headwords.length) fail(`${path} holes`, 'must have one hole per headword');
  holes.forEach((value, i) => {
    const hole = obj(value, `${path} hole ${i}`);
    if (hole.position !== i) fail(`${path} hole ${i}`, 'is out of order');
    if (hole.headword !== headwords[i]) fail(`${path} hole ${i}`, 'does not match its headword');
    if (hole.resolution !== null && !['expand', 'recall', 'inject', 'flatten'].includes(hole.resolution as string)) fail(`${path} hole ${i} state`);
    maybeText(hole.child_frame_id, `${path} hole ${i} child`); maybeWhole(hole.source_index, `${path} hole ${i} entry`);
    list(hole.candidates, `${path} hole ${i} candidates`).forEach((value, j) => {
      const candidate = obj(value, `${path} hole ${i} candidate ${j}`);
      if (whole(candidate.entry_index, `${path} hole ${i} candidate ${j} entry`) >= entryCount) fail(`${path} hole ${i} candidate ${j}`, 'is not in the dictionary');
      text(candidate.headword, `${path} hole ${i} candidate ${j} headword`, true);
      text(candidate.definition, `${path} hole ${i} candidate ${j} definition`);
      text(candidate.instantiated_definition, `${path} hole ${i} candidate ${j} instantiated definition`);
    });
    if (hole.resolution !== null && (hole.candidates as unknown[]).length) fail(`${path} hole ${i}`, 'is closed but still lists candidates');
  });
  return frame as unknown as Frame;
}

function checkPredictionSet(value: unknown, path: string) {
  const set = obj(value, path);
  if (!SCHEMA_VERSIONS.includes(set.schema_version as 3)) fail(`${path} schema`, `must be one of ${SCHEMA_VERSIONS.join(', ')}`);
  text(set.result, `${path} result`);
  for (const key of ['trace_complete', 'coverage_complete', 'dependency_selection_complete']) flag(set[key], `${path} ${key}`);
  const ids = list(set.predictions, `${path} candidates`).map((value, i) => {
    const prediction = obj(value, `${path} candidate ${i}`);
    const id = text(prediction.id, `${path} candidate ${i} id`, true);
    if (id !== `P${whole(prediction.event_index, `${path} candidate ${i} event`)}`) fail(`${path} candidate ${id}`, 'must be named after its event');
    if (!KINDS.includes(prediction.kind as CandidateKind)) fail(`${path} candidate ${id} kind`);
    text(prediction.statement, `${path} candidate ${id} statement`);
    const evidence = obj(prediction.evidence, `${path} candidate ${id} evidence`);
    if (evidence.entry !== null) obj(evidence.entry, `${path} candidate ${id} entry`);
    return id;
  });
  const known = new Set(ids);
  for (const key of ['current_prediction_ids', 'historical_prediction_ids']) {
    list(set[key], `${path} ${key}`).forEach(id => { if (!known.has(id as string)) fail(`${path} ${key}`, `names ${String(id)}, which is not listed`); });
  }
  // Schema 3 has no issued list; 4 and 5 do.
  if ((set.schema_version as number) >= 4 || 'issued' in set) {
    list(set.issued, `${path} issued`).forEach((value, i) => {
      const issued = obj(value, `${path} issued ${i}`);
      if (text(issued.id, `${path} issued ${i} id`, true) !== `I${whole(issued.event_index, `${path} issued ${i} event`)}`) fail(`${path} issued ${i}`, 'must be named after its event');
      text(issued.result, `${path} issued ${i} result`);
      list(issued.prediction_ids, `${path} issued ${i} support`).forEach(id => { if (!known.has(id as string)) fail(`${path} issued ${i}`, `rests on ${String(id)}, which is not listed`); });
    });
  }
}

/**
 * Check that a value has the shape of an engine record, for display. Throws an Error that names the
 * first problem. It does not replay commands or check digests; continuing a record asks the engine.
 */
export function inspectRecord(value: unknown): TraceRecord {
  const record = obj(value, 'The record');
  if (record.format !== 'vd-trace-record' || record.version !== 1) fail('The record', 'is not a version 1 vd-trace-record');
  text(record.record_id, 'The record id', true); digest(record.sha256, 'The record digest');
  const producer = obj(record.producer, 'The producer');
  if (producer.name !== 'VDfirst' || producer.protocol_version !== 1) fail('The producer', 'is not VDfirst protocol 1');
  digest(producer.engine_sha256, 'The engine fingerprint');
  const dictionary = obj(record.dictionary, 'The dictionary');
  text(dictionary.name, 'The dictionary name', true); digest(dictionary.sha256, 'The dictionary digest');
  const entries = list(dictionary.entries, 'The dictionary entries');
  entries.forEach((value, i) => {
    const entry = obj(value, `Entry ${i}`);
    if (entry.index !== i) fail(`Entry ${i}`, 'is out of order');
    text(entry.headword, `Entry ${i} headword`, true); text(entry.definition, `Entry ${i} definition`);
  });
  const question = obj(record.question, 'The question');
  text(question.demand, 'The starting demand', true); text(question.context, 'The context');
  const commands = list(record.commands, 'The commands');
  commands.forEach((value, i) => checkCommand(value, `Command ${i + 1}`, entries.length));
  const events = list(record.events, 'The events');
  events.forEach((value, i) => {
    const event = obj(value, `Event ${i}`);
    if (event.index !== i || event.id !== `event-${i}`) fail(`Event ${i}`, 'is out of order');
    text(event.kind, `Event ${i} kind`, true); text(event.detail, `Event ${i} detail`);
  });
  if (events.length !== commands.length + 1) fail('The events', 'must be one per command, plus the start');
  const snapshots = list(record.snapshots, 'The snapshots');
  if (snapshots.length !== commands.length + 1) fail('The snapshots', 'must be one per command, plus the start');
  snapshots.forEach((value, i) => {
    const snapshot = obj(value, `Snapshot ${i}`);
    if (snapshot.id !== `S${i}` || snapshot.command_index !== i - 1) fail(`Snapshot ${i}`, 'is out of order');
    if (snapshot.root_frame_id !== 'F') fail(`Snapshot ${i}`, 'must have its root at F');
    whole(snapshot.event_count, `Snapshot ${i} event count`);
    const frames = list(snapshot.frames, `Snapshot ${i} frames`).map((value, j) => checkFrame(value, `Snapshot ${i} frame ${j}`, entries.length));
    const ids = new Set(frames.map(frame => frame.id));
    if (frames[0]?.id !== 'F' || ids.size !== frames.length) fail(`Snapshot ${i} frames`, 'must start at F and name each frame once');
    for (const frame of frames) {
      if (frame.parent_id !== null && !ids.has(frame.parent_id)) fail(`Snapshot ${i} frame ${frame.id}`, 'has a parent that is not listed');
      for (const hole of frame.holes) if (hole.child_frame_id !== null && !ids.has(hole.child_frame_id)) fail(`Snapshot ${i} frame ${frame.id}`, 'points to a child that is not listed');
    }
    checkPredictionSet(snapshot.prediction_set, `Snapshot ${i} prediction set`);
  });
  return record as unknown as TraceRecord;
}

/** Parse a saved file. Size first, then JSON, then shape. */
export function parseRecord(source: string): TraceRecord {
  if (new TextEncoder().encode(source).length > MAX_RECORD_BYTES) throw new Error('The file is larger than the 8 MiB a record may be.');
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new Error('The file is not JSON.'); }
  return inspectRecord(value);
}

// ---------------------------------------------------------------- reading a snapshot

export type Segment = { kind: 'text'; text: string } | { kind: 'hole'; hole: Hole };

/** A frame's own wording with its holes in place: latents[0], hole 0, latents[1], ... latents[n]. */
export function frameSegments(frame: Frame): Segment[] {
  const out: Segment[] = [];
  frame.latents.forEach((latent, i) => {
    if (latent) out.push({ kind: 'text', text: latent });
    if (i < frame.holes.length) out.push({ kind: 'hole', hole: frame.holes[i] });
  });
  return out;
}

/** A frame's own wording as plain text, headwords as written: for a supplied input, exactly what was supplied. */
export const ownWording = (frame: Frame) =>
  frame.latents.map((latent, i) => latent + (frame.headwords[i] ?? '')).join('');

export const childFrames =(snapshot: Snapshot, frame: Frame) =>
  snapshot.frames.filter(item => item.parent_id === frame.id).sort((a, b) => (a.via_position ?? 0) - (b.via_position ?? 0));

export const openHoles = (snapshot: Snapshot) =>
  snapshot.frames.flatMap(frame => frame.holes.filter(hole => hole.resolution === null).map(hole => ({ frame, hole })));

/** The engine refuses an issue while any hole is open, and for any frame but the root. */
export const canIssue = (snapshot: Snapshot) => openHoles(snapshot).length === 0;

/** The text a recall put in place, from the recall's own evidence; the hole itself keeps only the entry. */
export function recalledText(snapshot: Snapshot, frame: Frame, hole: Hole): string | null {
  const step = snapshot.prediction_set.predictions.find(item => item.kind === 'entry_recall'
    && item.evidence.position === hole.position && sameAddress(item.evidence.after?.address, frame.address));
  return step?.evidence.entry?.text ?? null;
}
const sameAddress = (a: unknown, b: number[]) => Array.isArray(a) && a.length === b.length && a.every((item, i) => item === b[i]);

/** What was supplied for a hole, exactly as typed: the input's own evidence. The child frame's wording drops escapes. */
export function suppliedText(snapshot: Snapshot, frame: Frame, hole: Hole): string | null {
  const step = snapshot.prediction_set.predictions.find(item => item.kind === 'supplied_input'
    && item.evidence.position === hole.position && sameAddress(item.evidence.after?.address, frame.address));
  return step ? step.evidence.response : null;
}

/** The frame a command changed, so the view can mark where the trace has just been. */
export const changedFrameId = (record: TraceRecord, snapshotIndex: number) =>
  snapshotIndex > 0 ? record.commands[snapshotIndex - 1]?.frame_id ?? null : null;

/** A piece of a step's description: the site's words, or a string of the dictionary's or the record's own. */
export type Part = string | { string: string };

/** A command described in the site's words, against the snapshot it was applied to. */
export function describeParts(command: Command, before: Snapshot | undefined, entryLabel: (index: number) => string = entryId): Part[] {
  const frame = before?.frames.find(item => item.id === command.frame_id);
  const headword = command.position !== undefined ? frame?.holes[command.position]?.headword : undefined;
  const where = command.frame_id === 'F' ? 'the root' : command.frame_id;
  const word: Part = headword ? { string: headword } : `position ${command.position ?? '?'}`;
  const entry: Part = { string: entryLabel(command.entry_index ?? -1) };
  switch (command.operation) {
    case 'expand': return ['Expand ', word, ' with ', entry];
    case 'recall': return ['Recall ', entry, ' for ', word];
    case 'inject': return ['Supply ', { string: command.response ?? '' }, ' for ', word];
    case 'flatten': return ['Leave ', word, ' as text'];
    case 'reduce': return [`Reduce ${where} to `, { string: command.response ?? '' }];
    case 'reopen': return [`Reopen ${where}`];
    case 'clean': return [`Edit the wording of ${where}`];
    case 'issue': return ['Issue the result'];
  }
}

/** The same description as plain text, for notices. */
export const describeCommand = (command: Command, before: Snapshot | undefined, entryLabel: (index: number) => string = entryId) =>
  describeParts(command, before, entryLabel).map(part => typeof part === 'string' ? part : part.string).join('');

/** The engine's own name for an entry, as its statements and errors use it: E and the index from 0. */
export const entryId = (index: number) => `E${index}`;

/**
 * How a frame stands, from the engine's own flags. A frame whose own headwords are filled may still
 * have open headwords further down; the engine calls it resolved only when nothing under it is open.
 */
export function frameState(frame: Frame): string {
  if (frame.reduced !== null) return 'reduced';
  const open = frame.holes.filter(hole => hole.resolution === null).length;
  if (open) return `${open} open`;
  if (!frame.holes.length) return 'no headwords';
  return frame.resolved ? 'all filled' : 'open below';
}

export interface Support { current: Prediction[]; history: Prediction[] }
/** Split the candidates into what the root's result rests on now and what is history. */
export function support(set: PredictionSet): Support {
  const current = new Set(set.current_prediction_ids);
  return {
    current: set.predictions.filter(item => current.has(item.id)),
    history: set.predictions.filter(item => !current.has(item.id)),
  };
}

export const issuedResults = (set: PredictionSet): IssuedResult[] => set.issued ?? [];
