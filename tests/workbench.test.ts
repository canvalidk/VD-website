import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  KIND_DESCRIPTIONS, KIND_LABELS, canIssue, changedFrameId, childFrames, describeCommand, describeParts, entryId,
  frameSegments, frameState, inspectRecord, issuedResults, openHoles, ownWording, parseRecord, recalledText,
  suppliedText, support,
} from '../src/workbench/record.ts';
import type { TraceRecord } from '../src/workbench/record.ts';
import { BridgeError, command, health, recordDictionary, restartFrom, start, validate } from '../src/workbench/bridge.ts';
import { doerSources, headwordsOf, sourceIdOf, sourceOf } from '../src/workbench/sources.ts';

// Records made by VDfirst's own workbench: tools/export_workbench_fixtures.py.
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const correction = (): TraceRecord => load('workbench-correction.json');
const newton = (): TraceRecord => load('workbench-newton.json');
const manifest = load('workbench-fixtures.json');

test('engine-made records pass the shape check, schema 5 with issued results', () => {
  for (const record of [correction(), newton()]) {
    assert.equal(inspectRecord(record), record);
    assert.equal(record.snapshots.at(-1)!.prediction_set.schema_version, 5);
    assert.equal(record.producer.engine_sha256, manifest.producer.engine_sha256);
  }
  assert.deepEqual(parseRecord(JSON.stringify(newton())).record_id, newton().record_id);
});

test('the shape check names what is wrong', () => {
  const broken = (change: (record: any) => void) => { const record = correction() as any; change(record); return () => inspectRecord(record); };
  assert.throws(broken(record => { record.version = 2; }), /version 1/);
  assert.throws(broken(record => { record.commands[0].operation = 'delete'; }), /operation/);
  assert.throws(broken(record => { record.commands[1].entry_index = 1; }), /does not take/);
  assert.throws(broken(record => { record.snapshots.pop(); }), /one per command/);
  assert.throws(broken(record => { record.snapshots[1].frames[0].latents.push('x'); }), /one more piece/);
  assert.throws(broken(record => { record.snapshots[1].frames[1].holes[0].resolution = 'guess'; }), /state/);
  assert.throws(broken(record => { record.snapshots[1].prediction_set.schema_version = 2; }), /schema/);
  assert.throws(broken(record => { record.snapshots.at(-1).prediction_set.issued[0].prediction_ids.push('P99'); }), /P99/);
  assert.throws(() => parseRecord('{'), /not JSON/);
  assert.throws(() => inspectRecord([]), /must be an object/);
});

test('a frame reads as its wording with its holes in place', () => {
  const frame = newton().snapshots.at(-1)!.frames.find(item => item.id === 'F/0')!;
  const segments = frameSegments(frame);
  assert.deepEqual(segments.map(item => item.kind === 'text' ? item.text : `[${item.hole.headword}:${item.hole.resolution}]`), [
    'The vector quantity satisfying ', '[net-force:flatten]', ' = ', '[inertial-mass:recall]', ' times ',
    '[inertial-acceleration:null]', ' for a ', '[point-particle:inject]', '.',
  ]);
  assert.equal(ownWording(frame), 'The vector quantity satisfying net-force = inertial-mass times inertial-acceleration for a point-particle.');
});

test('the tree, open holes and the recalled wording come from the snapshot', () => {
  const snapshot = newton().snapshots.at(-1)!;
  const root = snapshot.frames[0];
  assert.deepEqual(childFrames(snapshot, root).map(frame => frame.id), ['F/0']);
  assert.deepEqual(childFrames(snapshot, snapshot.frames[1]).map(frame => frame.id), ['F/0/3']);
  assert.equal(ownWording(snapshot.frames[2]), 'a cart');
  assert.deepEqual(openHoles(snapshot).map(item => `${item.frame.id}#${item.hole.position}`), ['F#1', 'F/0#2']);
  assert.equal(canIssue(snapshot), false);
  const frame = snapshot.frames[1];
  assert.match(recalledText(snapshot, frame, frame.holes[1])!, /^The positive scalar coefficient m/);
  assert.equal(recalledText(snapshot, frame, frame.holes[0]), null);
  assert.equal(suppliedText(snapshot, frame, frame.holes[3]), 'a cart');
  assert.equal(suppliedText(snapshot, frame, frame.holes[1]), null);
});

test('a frame is "all filled" only when the engine calls it resolved', () => {
  const snapshot = correction().snapshots[2];
  // The root's own headword is expanded, but the mass is still open below it.
  const [root, child] = snapshot.frames;
  assert.equal(root.resolved, false);
  assert.equal(frameState(root), 'open below');
  assert.equal(frameState(child), '1 open');
  const done = correction().snapshots[3].frames[0];
  assert.equal(frameState(done), 'all filled');
  assert.equal(frameState(correction().snapshots[5].frames[0]), 'reduced');
  assert.equal(frameState(newton().snapshots.at(-1)!.frames[2]), 'no headwords');
});

test('issued results and support: a redo is a second issue, the mistake stays in the first', () => {
  const record = correction();
  const last = record.snapshots.at(-1)!;
  const issued = issuedResults(last.prediction_set);
  assert.deepEqual(issued.map(item => [item.id, item.result]), [['I6', 'Prediction: 12 N'], ['I10', 'Prediction: 10 N']]);
  assert.ok(issued[0].prediction_ids.includes('P4') && !issued[1].prediction_ids.includes('P4'));
  const { current, history } = support(last.prediction_set);
  assert.deepEqual(current.map(item => item.id), last.prediction_set.current_prediction_ids);
  assert.ok(history.some(item => item.id === 'P4'));
  assert.equal(canIssue(last), true);
  // Before the first issue there is nothing issued.
  assert.deepEqual(issuedResults(record.snapshots[5].prediction_set), []);
});

test('every kind the engine lists has a description and a label', () => {
  for (const record of [correction(), newton()]) {
    for (const item of record.snapshots.at(-1)!.prediction_set.predictions) {
      assert.ok(KIND_DESCRIPTIONS[item.kind] && KIND_LABELS[item.kind], item.kind);
    }
  }
});

test('steps are described in the site\'s words, against the snapshot before them', () => {
  const record = newton();
  const said = record.commands.map((item, i) => describeCommand(item, record.snapshots[i]));
  assert.deepEqual(said, [
    'Expand net-force with E21',
    'Leave net-force as text',
    'Recall E22 for inertial-mass',
    'Supply a cart for point-particle',
    'Edit the wording of the root',
  ]);
  assert.equal(changedFrameId(record, 0), null);
  assert.equal(changedFrameId(record, 2), 'F/0');
  // Entries are named as the engine's own statements name them.
  assert.match(record.snapshots[1].prediction_set.predictions[1].statement, /entry E21 defines 'net-force'/);
  assert.deepEqual(describeParts(record.commands[3], record.snapshots[3]), ['Supply ', { string: 'a cart' }, ' for ', { string: 'point-particle' }]);
  const plain = correction();
  assert.equal(describeCommand(plain.commands[5], plain.snapshots[5]), 'Issue the result');
  assert.equal(describeCommand(plain.commands[3], plain.snapshots[3]), 'Reduce F/0 to 12 N');
});

test('sources give the bridge each dictionary in the order the engine added it', () => {
  const ids = doerSources.map(item => item.id);
  assert.deepEqual(ids, ['correction', 'newton-current', 'newton-operational']);
  for (const source of doerSources) {
    assert.equal(source.sourceIds.length, source.dictionary.entries.length);
    assert.ok(source.dictionary.entries.length <= 64, 'the bridge takes at most 64 entries');
    assert.ok(headwordsOf(source).length > 0);
  }
  assert.equal(sourceOf(newton())?.id, 'newton-operational');
  assert.equal(sourceOf(correction())?.id, 'correction');
  const current = doerSources[1];
  assert.equal(current.sourceIds[15], 'K16 / E1');
  // The source's own id is shown beside the engine's only where they differ.
  assert.equal(sourceIdOf(newton())(21), 'E22');
  assert.equal(sourceIdOf(correction())(0), null);
  assert.equal(entryId(21), 'E21');
  assert.deepEqual(recordDictionary(newton()).entries[21], doerSources[2].dictionary.entries[21]);
});

// ---------------------------------------------------------------- bridge client, with a stand-in fetch

type Call = { url: string; init: RequestInit };
function stub(reply: (call: Call) => { status: number; body: unknown } | 'down') {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const call = { url, init }; calls.push(call);
    const answer = reply(call);
    if (answer === 'down') throw new TypeError('fetch failed');
    return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'Content-Type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

test('the client posts relative requests and reads the record back', async () => {
  const record = correction();
  const { calls, fetcher } = stub(() => ({ status: 200, body: { record } }));
  const dictionary = recordDictionary(record);
  assert.deepEqual(await start(dictionary, 'force_cart_0', '', fetcher), record);
  await command(record, { operation: 'issue', frame_id: 'F' }, fetcher);
  await validate(record, fetcher);
  assert.deepEqual(calls.map(item => item.url), ['/api/workbench/start', '/api/workbench/command', '/api/workbench/validate']);
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { dictionary, demand: 'force_cart_0', context: '' });
  assert.deepEqual(Object.keys(JSON.parse(calls[1].init.body as string)), ['record', 'command']);
});

test('the client tells a refusal from a missing engine', async () => {
  const refused = stub(() => ({ status: 400, body: { error: 'cannot issue: the trace still has open holes' } }));
  await assert.rejects(command(newton(), { operation: 'issue', frame_id: 'F' }, refused.fetcher),
    (error: unknown) => error instanceof BridgeError && !error.offline && /open holes/.test(error.message));
  const down = stub(() => 'down');
  await assert.rejects(health(down.fetcher), (error: unknown) => error instanceof BridgeError && error.offline);
  const proxy = stub(() => ({ status: 502, body: null }));
  await assert.rejects(validate(newton(), proxy.fetcher), (error: unknown) => error instanceof BridgeError && error.offline);
  const strange = stub(() => ({ status: 200, body: { record: { format: 'other' } } }));
  await assert.rejects(validate(newton(), strange.fetcher), /cannot read/);
});

test('restarting from a step replays only the steps before it, into a new record', async () => {
  const record = correction();
  const { calls, fetcher } = stub(() => ({ status: 200, body: { record } }));
  await restartFrom(record, 3, recordDictionary(record), fetcher);
  assert.deepEqual(calls.map(item => item.url.split('/').at(-1)), ['start', 'command', 'command', 'command']);
  assert.deepEqual(calls.slice(1).map(item => JSON.parse(item.init.body as string).command), record.commands.slice(0, 3));
});
