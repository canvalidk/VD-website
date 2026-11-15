import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BRACES_SCHEMA, KIND_DESCRIPTIONS, KIND_LABELS, canIssue, changedFrameId, childFrames, describeCommand, describeParts,
  entryId, frameSegments, frameState, hasBraces, inspectRecord, issuedResults, kindDescription, kindLabel, openHoles,
  ownWording, parseRecord, recalledText, suppliedText, support, valueCommands,
} from '../src/workbench/record.ts';
import type { TraceRecord } from '../src/workbench/record.ts';
import { BridgeError, command, commandSteps, health, recordDictionary, restartFrom, start, validate } from '../src/workbench/bridge.ts';
import { doerSources, headwordsOf, sourceIdOf, sourceOf } from '../src/workbench/sources.ts';

// Records made by VDfirst's own workbench: tools/export_workbench_fixtures.py.
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const correction = (): TraceRecord => load('workbench-correction.json');
const newton = (): TraceRecord => load('workbench-newton.json');
const calls = (): TraceRecord => load('workbench-calls.json');
// The correction record as VDfirst 7414a68 made it, before the brace convention (schema 5). Kept to
// check that the page still reads such records; it is not regenerated.
const earlier = (): TraceRecord => load('workbench-correction-schema5.json');
const manifest = load('workbench-fixtures.json');

test('engine-made records pass the shape check, schema 6 with issued results', () => {
  for (const record of [correction(), newton(), calls()]) {
    assert.equal(inspectRecord(record), record);
    assert.equal(record.snapshots.at(-1)!.prediction_set.schema_version, 6);
    assert.equal(record.producer.engine_sha256, manifest.producer.engine_sha256);
    assert.ok(record.snapshots.every(hasBraces));
  }
  assert.deepEqual(manifest.files, ['workbench-correction.json', 'workbench-newton.json', 'workbench-calls.json']);
  assert.deepEqual(parseRecord(JSON.stringify(newton())).record_id, newton().record_id);
});

test('a record made before the brace convention is still read, in its own terms', () => {
  const record = earlier();
  assert.equal(inspectRecord(record), record);
  const last = record.snapshots.at(-1)!;
  assert.equal(last.prediction_set.schema_version, 5);
  assert.equal(hasBraces(last), false);
  assert.ok(last.frames.flatMap(frame => frame.holes).every(hole => !('braced' in hole)));
  // Its supplied inputs were values, so its kinds keep their earlier names.
  assert.equal(kindLabel('supplied_input', 5), 'supplied input');
  assert.equal(kindLabel('left_unexpanded', 5), 'left as text');
  assert.match(kindDescription('supplied_input', 5), /a response was supplied/);
  assert.equal(kindLabel('supplied_input', 6), KIND_LABELS.supplied_input);
  for (const schema of [3, 4]) assert.equal(kindLabel('supplied_input', schema), 'supplied input');
  assert.equal(describeCommand(record.commands[1], record.snapshots[1]), 'Supply 2 kg for mass_cart');
});

test('the shape check names what is wrong', () => {
  const broken = (change: (record: any) => void, base = correction) => { const record = base() as any; change(record); return () => inspectRecord(record); };
  assert.throws(broken(record => { record.version = 2; }), /version 1/);
  assert.throws(broken(record => { record.commands[0].operation = 'delete'; }), /operation/);
  assert.throws(broken(record => { record.commands[2].entry_index = 1; }), /does not take/);
  assert.throws(broken(record => { record.snapshots.pop(); }), /one per command/);
  assert.throws(broken(record => { record.snapshots[1].frames[0].latents.push('x'); }), /one more piece/);
  assert.throws(broken(record => { record.snapshots[1].frames[1].holes[0].resolution = 'guess'; }), /state/);
  assert.throws(broken(record => { record.snapshots[1].prediction_set.schema_version = 2; }), /schema/);
  assert.throws(broken(record => { record.snapshots.at(-1).prediction_set.issued[0].prediction_ids.push('P99'); }), /P99/);
  // Braces: said for every hole from schema 6, never before, never round an open headword or a supplied call.
  assert.throws(broken(record => { delete record.snapshots[1].frames[1].holes[0].braced; }), /whether their text shows braces/);
  assert.throws(broken(record => { record.snapshots[1].frames[1].holes[0].braced = true; }), /not been dealt with/);
  assert.throws(broken(record => { record.snapshots[1].frames[0].holes[0].braced = 'yes'; }), /true or false/);
  assert.throws(broken(record => { record.snapshots[1].frames[0].holes[0].braced = true; }, earlier), /before schema 6/);
  assert.throws(broken(record => { record.snapshots.at(-1).frames[0].holes[0].braced = true; }, calls), /not been dealt with/);
  assert.throws(broken(record => { record.commands.at(-1).shown = 'no'; }, newton), /true or false/);
  assert.throws(broken(record => { delete record.commands.at(-1).shown; }, newton), /missing shown/);
  assert.throws(broken(record => { record.commands[0].shown = true; }), /does not take/);
  assert.throws(() => parseRecord('{'), /not JSON/);
  assert.throws(() => inspectRecord([]), /must be an object/);
});

test('a frame reads as its wording with its holes in place, and says where its text shows braces', () => {
  const frame = newton().snapshots.at(-1)!.frames.find(item => item.id === 'F/0')!;
  const segments = frameSegments(frame);
  assert.deepEqual(segments.map(item => item.kind === 'text' ? item.text : `[${item.hole.headword}:${item.hole.resolution}:${item.hole.braced}]`), [
    'The vector quantity satisfying ', '[net-force:flatten:true]', ' = ', '[inertial-mass:recall:false]', ' times ',
    '[inertial-acceleration:null:false]', ' for a ', '[point-particle:expand:true]', '.',
  ]);
  assert.equal(ownWording(frame), 'The vector quantity satisfying net-force = inertial-mass times inertial-acceleration for a point-particle.');
  // The engine's own text of the frame: braces round what was dealt with, none round the open headword,
  // and none round the recalled wording, whose braces were taken out at the last step.
  assert.equal(frame.render, 'The vector quantity satisfying {net-force} = The positive scalar coefficient m such that net-force = m '
    + 'times inertial-acceleration for a point-particle. times inertial-acceleration for a {a cart}.');
});

test('the tree, open holes and the recalled wording come from the snapshot', () => {
  const snapshot = newton().snapshots.at(-1)!;
  const root = snapshot.frames[0];
  assert.deepEqual(childFrames(snapshot, root).map(frame => frame.id), ['F/0']);
  assert.deepEqual(childFrames(snapshot, snapshot.frames[1]).map(frame => frame.id), ['F/0/3']);
  // The value replaced the text of point-particle's definition: the frame it opened now reads "a cart".
  const value = snapshot.frames[2];
  assert.equal(value.reduced, 'a cart');
  assert.equal(ownWording(value), 'An idealised object whose spatial extent and internal structure are neglected.');
  assert.deepEqual(openHoles(snapshot).map(item => `${item.frame.id}#${item.hole.position}`), ['F#1', 'F/0#2']);
  assert.equal(canIssue(snapshot), false);
  const frame = snapshot.frames[1];
  assert.match(recalledText(snapshot, frame, frame.holes[1])!, /^The positive scalar coefficient m/);
  assert.equal(recalledText(snapshot, frame, frame.holes[0]), null);
  assert.equal(suppliedText(snapshot, frame, frame.holes[3]), null);
});

test('a supplied call is the one thing taken at a headword, and it has no braces', () => {
  const snapshot = calls().snapshots.at(-1)!;
  const [root, call, definition] = snapshot.frames;
  assert.equal(root.holes[0].resolution, 'inject');
  assert.equal(root.holes[0].braced, false);
  assert.equal(suppliedText(snapshot, root, root.holes[0]), 'force_cart_0');
  // The call is itself a headword, expanded in turn: then it stands in braces.
  assert.equal(call.holes[0].resolution, 'expand');
  assert.equal(call.holes[0].braced, true);
  assert.equal(snapshot.prediction_set.result, '{mass_cart times acceleration_cart_0}');
  assert.deepEqual(openHoles(snapshot).map(item => `${item.frame.id}#${item.hole.position}`), ['F/0/0#0', 'F/0/0#1']);
  assert.equal(definition.render, 'mass_cart times acceleration_cart_0');
  const step = snapshot.prediction_set.predictions.find(item => item.kind === 'supplied_input')!;
  assert.equal(step.statement, "The supplied response 'force_cart_0' is appropriate for the demand 'force' in the recorded context.");
  assert.equal(describeCommand(calls().commands[0], calls().snapshots[0]), 'Supply force_cart_0 for force');
});

test('a frame is "all filled" only when the engine calls it resolved', () => {
  const record = correction();
  // The root's own headword is expanded, but the acceleration is still open below it.
  const [root, child] = record.snapshots[2].frames;
  assert.equal(root.resolved, false);
  assert.equal(frameState(root), 'open below');
  assert.equal(frameState(child), '1 open');
  assert.equal(frameState(record.snapshots[7].frames[0]), 'all filled');
  assert.equal(frameState(record.snapshots[9].frames[0]), 'reduced');
  assert.equal(frameState(newton().snapshots.at(-1)!.frames[2]), 'reduced');
  assert.equal(frameState(calls().snapshots.at(-1)!.frames[2]), '2 open');
});

test('issued results and support: a redo is a second issue, the mistake stays in the first', () => {
  const record = correction();
  const last = record.snapshots.at(-1)!;
  const issued = issuedResults(last.prediction_set);
  assert.deepEqual(issued.map(item => [item.id, item.result]), [['I10', 'Prediction: 12 N'], ['I14', 'Prediction: 10 N']]);
  // P8 is the mistaken product, "{2 kg} times {5 m/s^2}" said to mean "12 N".
  const mistake = last.prediction_set.predictions.find(item => item.id === 'P8')!;
  assert.deepEqual([mistake.evidence.stimulus, mistake.evidence.response], ['{2 kg} times {5 m/s^2}', '12 N']);
  assert.ok(issued[0].prediction_ids.includes('P8') && !issued[1].prediction_ids.includes('P8'));
  const { current, history } = support(last.prediction_set);
  assert.deepEqual(current.map(item => item.id), last.prediction_set.current_prediction_ids);
  assert.ok(history.some(item => item.id === 'P8'));
  assert.equal(canIssue(last), true);
  // Before the first issue there is nothing issued.
  assert.deepEqual(issuedResults(record.snapshots[9].prediction_set), []);
});

test('a value answers the wording of a definition, never a bare headword', () => {
  const steps = correction().snapshots.at(-1)!.prediction_set.predictions;
  assert.ok(!steps.some(item => item.kind === 'supplied_input'));
  const values = steps.filter(item => item.kind === 'meaning_preservation' && item.evidence.before.address.length === 2);
  assert.deepEqual(values.map(item => [item.evidence.stimulus, item.evidence.response]), [
    ['supplied {mass} of cart', '2 kg'],
    ['supplied {acceleration} of cart at 0', '5 m/s^2'],
  ]);
});

test('giving a value: after the expansion, each open headword in the definition is left unexpanded, then its text replaced', () => {
  const record = correction();
  // Snapshot 2 is the one the expansion of mass_cart produced (command 2 opened F/0/0).
  assert.deepEqual(valueCommands(record.snapshots[2], 'F/0/0', '2 kg'), [
    { operation: 'flatten', frame_id: 'F/0/0', position: 0 },
    { operation: 'reduce', frame_id: 'F/0/0', response: '2 kg' },
  ]);
  // Those are exactly the steps the engine took next.
  assert.deepEqual(record.commands.slice(2, 4), valueCommands(record.snapshots[2], 'F/0/0', '2 kg'));
  // A definition with no headwords in its text needs only the replacement.
  assert.deepEqual(valueCommands(newton().snapshots[4], 'F/0/3', 'a cart'), [{ operation: 'reduce', frame_id: 'F/0/3', response: 'a cart' }]);
  assert.deepEqual(newton().commands[4], { operation: 'reduce', frame_id: 'F/0/3', response: 'a cart' });
  // Several headwords in the text: each open one is left unexpanded, in order, before the replacement.
  assert.deepEqual(valueCommands(calls().snapshots.at(-1)!, 'F/0/0', '10 N'), [
    { operation: 'flatten', frame_id: 'F/0/0', position: 0 },
    { operation: 'flatten', frame_id: 'F/0/0', position: 1 },
    { operation: 'reduce', frame_id: 'F/0/0', response: '10 N' },
  ]);
  assert.throws(() => valueCommands(record.snapshots[0], 'F/0', '2 kg'), /did not open F\/0/);
});

test('a braces step cannot appear in a record of an earlier schema', () => {
  const record = earlier() as any;
  record.commands[0] = { operation: 'braces', frame_id: 'F', position: 0, shown: false };
  assert.throws(() => inspectRecord(record), /follows a braces step, which schema 5 does not have/);
  // The same step in a schema 6 record is fine (the Newton record ends with one).
  assert.equal(newton().commands.at(-1)!.operation, 'braces');
});

test('every kind the engine lists has a description and a label', () => {
  for (const record of [correction(), newton(), calls(), earlier()]) {
    const schema = record.snapshots.at(-1)!.prediction_set.schema_version;
    for (const item of record.snapshots.at(-1)!.prediction_set.predictions) {
      assert.ok(KIND_DESCRIPTIONS[item.kind] && KIND_LABELS[item.kind], item.kind);
      assert.ok(kindDescription(item.kind, schema) && kindLabel(item.kind, schema), item.kind);
    }
  }
  assert.equal(BRACES_SCHEMA, 6);
});

test('steps are described in the site\'s words, against the snapshot before them', () => {
  const record = newton();
  const said = record.commands.map((item, i) => describeCommand(item, record.snapshots[i]));
  assert.deepEqual(said, [
    'Expand net-force with E21',
    'Leave net-force unexpanded',
    'Recall E22 for inertial-mass',
    'Expand point-particle with E2',
    'Reduce F/0/3 to a cart',
    'Edit the wording of the root',
    'Take out the braces round inertial-mass in F/0',
  ]);
  assert.equal(changedFrameId(record, 0), null);
  assert.equal(changedFrameId(record, 2), 'F/0');
  // Entries are named as the engine's own statements name them.
  assert.match(record.snapshots[1].prediction_set.predictions[1].statement, /entry E21 defines 'net-force'/);
  assert.deepEqual(describeParts(record.commands[6], record.snapshots[6]), ['Take out the braces round ', { string: 'inertial-mass' }, ' in F/0']);
  assert.deepEqual(describeParts({ ...record.commands[6], shown: true }, record.snapshots[7]), ['Put back the braces round ', { string: 'inertial-mass' }, ' in F/0']);
  const plain = correction();
  assert.equal(describeCommand(plain.commands[9], plain.snapshots[9]), 'Issue the result');
  assert.equal(describeCommand(plain.commands[7], plain.snapshots[7]), 'Reduce F/0 to 12 N');
  // A record from before the convention keeps its own word for leaving a headword.
  assert.equal(describeCommand({ operation: 'flatten', frame_id: 'F/0', position: 0 }, earlier().snapshots[1]), 'Leave mass_cart as text');
});

test('the braces step is recorded as a wording edit, and its claim names both texts', () => {
  const record = newton();
  const last = record.snapshots.at(-1)!;
  const step = last.prediction_set.predictions.at(-1)!;
  assert.equal(step.operation, 'clean');
  assert.equal(step.kind, 'meaning_preservation');
  assert.match(step.evidence.stimulus, /^The vector quantity satisfying \{net-force\} = \{The positive scalar coefficient m/);
  assert.match(step.evidence.response, /^The vector quantity satisfying \{net-force\} = The positive scalar coefficient m/);
  assert.equal(record.events.at(-1)!.kind, 'clean');
  // The hole it changed reads without braces now, and the step before still had them.
  assert.equal(record.snapshots[6].frames[1].holes[1].braced, true);
  assert.equal(last.frames[1].holes[1].braced, false);
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

test('several steps are one action: the new record comes back only if every step is taken', async () => {
  // A stand-in engine that answers each command with the correction record as it stood after it.
  const record = correction();
  const before = { ...record, commands: record.commands.slice(0, 1), snapshots: record.snapshots.slice(0, 2), events: record.events.slice(0, 2) };
  const after = (count: number) => ({ ...record, commands: record.commands.slice(0, count), snapshots: record.snapshots.slice(0, count + 1), events: record.events.slice(0, count + 1) });
  const value = (refuseAt?: number) => stub(call => {
    const sent = JSON.parse(call.init.body as string);
    const count = sent.record.commands.length + 1;
    return count === refuseAt ? { status: 400, body: { error: 'invalid command: refused on purpose' } } : { status: 200, body: { record: after(count) } };
  });
  const expand = record.commands[1];
  const rest = (next: TraceRecord) => valueCommands(next.snapshots.at(-1)!, 'F/0/0', '2 kg');

  const taken = value();
  const next = await commandSteps(before as TraceRecord, expand, rest, taken.fetcher);
  assert.equal(next.commands.length, 4);
  assert.deepEqual(taken.calls.map(call => JSON.parse(call.init.body as string).command), record.commands.slice(1, 4));

  // A refusal at the second or third step: nothing comes back, so the page keeps the record it had.
  for (const refuseAt of [3, 4]) {
    await assert.rejects(commandSteps(before as TraceRecord, expand, rest, value(refuseAt).fetcher), /refused on purpose/);
  }
  // Steps that would not fit in a record are refused before the second is sent, and nothing is recorded.
  const nearlyFull = { ...before, commands: Array.from({ length: 78 }, () => record.commands[0]) } as TraceRecord;
  // The engine answers the expansion with F/0/0 open, so a flatten and a replacement are still to come.
  const tooMany = stub(() => ({ status: 200, body: { record: after(2) } }));
  await assert.rejects(commandSteps(nearlyFull, expand, rest, tooMany.fetcher), /takes 3 steps, and the record has room for 2 more\. Nothing was recorded/);
  assert.equal(tooMany.calls.length, 1);
  const full = { ...before, commands: Array.from({ length: 80 }, () => record.commands[0]) } as TraceRecord;
  await assert.rejects(commandSteps(full, expand, rest, value().fetcher), /at most 80 steps/);
});

test('restarting from a step replays only the steps before it, into a new record', async () => {
  const record = correction();
  const { calls, fetcher } = stub(() => ({ status: 200, body: { record } }));
  await restartFrom(record, 3, recordDictionary(record), fetcher);
  assert.deepEqual(calls.map(item => item.url.split('/').at(-1)), ['start', 'command', 'command', 'command']);
  assert.deepEqual(calls.slice(1).map(item => JSON.parse(item.init.body as string).command), record.commands.slice(0, 3));
});
