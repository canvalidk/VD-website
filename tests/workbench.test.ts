import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { inspectRecord, MAX_RECORD_BYTES, parseRecord, recordPlayback, requestWorkbench } from '../src/traceRecord.ts';

const source = readFileSync(new URL('./fixtures/workbench-record.json', import.meta.url), 'utf8');
const fixture = () => JSON.parse(source);

test('a real VDfirst workbench correction record opens without reconstructing its evidence', () => {
  const original = fixture();
  assert.equal(inspectRecord(original), original);
  const record = parseRecord(source);
  assert.equal(record.snapshots.length, record.commands.length + 1);
  assert.equal(record.snapshots.at(-1)!.prediction_set.result, 'Prediction: 10 N');
  assert.deepEqual(record.snapshots.at(-1)!.prediction_set.historical_prediction_ids, ['P4', 'P5']);
  assert.deepEqual(record.snapshots.at(-1)!.prediction_set.current_prediction_ids, ['P2', 'P3', 'P7', 'P8']);
  assert.deepEqual(record.dictionary.entries.map(entry => [entry.headword, entry.definition]), [
    ['force_p_t', 'mass_p times acceleration_p_t'], ['mass_p', 'supplied mass of p'], ['acceleration_p_t', 'supplied acceleration of p at t'],
  ]);
  assert.ok(record.snapshots.at(-1)!.frames.some(frame => frame.id === 'F/0/1'));
});

test('the display adapter retains every supplied root snapshot and unchecked prediction object', () => {
  const record = parseRecord(source); const playback = recordPlayback(record);
  assert.equal(playback.kind, 'recorded');
  assert.equal(playback.scriptedResponses, undefined);
  assert.equal(playback.steps.length, 9);
  playback.steps.forEach((step, index) => {
    assert.equal(step.predictionSet, record.snapshots[index].prediction_set);
    assert.deepEqual(step.fragment, [{ text: record.snapshots[index].prediction_set.result }]);
    assert.deepEqual(step.relatedEntryIds, []);
    assert.ok(step.predictionSet!.predictions.every(claim => claim.verification === 'unchecked'));
  });
});

test('structural validation retains unknown producer evidence for saving unchanged', () => {
  const record = fixture(); record.events[2].change.extra_evidence = { text: '<script>literal only</script>', retained: true };
  record.snapshots[4].prediction_set.predictions[0].evidence.extra_evidence = ['retained'];
  assert.deepEqual(JSON.parse(JSON.stringify(inspectRecord(record))), record);
});

const invalidCases: [string, (record: any) => void][] = [
  ['unknown version', r => r.version = 2],
  ['unknown producer', r => r.producer.name = 'Other'],
  ['missing record digest', r => delete r.sha256],
  ['invalid dictionary digest', r => r.dictionary.sha256 = 'not a digest'],
  ['entry index drift', r => r.dictionary.entries[0].index = 1],
  ['missing context', r => delete r.question.context],
  ['unrelated command field', r => r.commands[0].response = 'invented'],
  ['unsupported operation', r => r.commands[0].operation = 'execute'],
  ['non-text input', r => r.commands[1].response = { text: '2 kg' }],
  ['missing snapshot', r => r.snapshots.pop()],
  ['missing root', r => r.snapshots[2].frames.shift()],
  ['false root ID', r => r.snapshots[2].root_frame_id = 'F/0'],
  ['changed frame address', r => r.snapshots[2].frames[1].address = [9]],
  ['false frame parent', r => r.snapshots[2].frames[1].parent_id = 'F/8'],
  ['missing linked child', r => r.snapshots[2].frames[0].holes[0].child_frame_id = 'F/7'],
  ['orphan child', r => r.snapshots[2].frames[1].holes[0].child_frame_id = null],
  ['duplicate frame', r => r.snapshots[2].frames.push(r.snapshots[2].frames[1])],
  ['false candidate definition', r => r.snapshots[0].frames[0].holes[0].candidates[0].definition = 'other'],
  ['unknown candidate entry', r => r.snapshots[0].frames[0].holes[0].candidates[0].entry_index = 99],
  ['inconsistent literal layout', r => r.snapshots[0].frames[0].latents.pop()],
  ['false hole position', r => r.snapshots[0].frames[0].holes[0].position = 2],
  ['wrong event identity', r => r.events[0].id = 'event-8'],
  ['out of range event count', r => r.snapshots.at(-1).event_count = 1000],
  ['truncated final events', r => r.snapshots.at(-1).event_count--],
  ['inconsistent root output', r => r.snapshots[2].prediction_set.result = 'invented'],
  ['unsupported verification', r => r.snapshots[2].prediction_set.predictions[0].verification = 'verified'],
  ['unsupported full coverage', r => r.snapshots[2].prediction_set.coverage_complete = true],
  ['duplicate support ID', r => r.snapshots[2].prediction_set.current_prediction_ids.push('P2')],
  ['unknown support ID', r => r.snapshots[2].prediction_set.current_prediction_ids.push('P999')],
  ['missing current support', r => r.snapshots[2].prediction_set.current_prediction_ids = []],
  ['claim event drift', r => r.snapshots[2].prediction_set.predictions[0].event_index = 90],
  ['claim evidence source drift', r => r.snapshots[2].prediction_set.predictions[0].evidence.before.source_index = 99],
  ['claim self dependency', r => r.snapshots[2].prediction_set.predictions[0].evidence.dependencies = [2]],
  ['false history certainty', r => r.snapshots.at(-1).prediction_set.dependency_selection_complete = false],
];
for (const [name, mutate] of invalidCases) test(`rejects ${name} before display while keeping the previous record`, () => {
  const previous = parseRecord(source); const before = JSON.stringify(previous); const changed = fixture(); mutate(changed);
  assert.throws(() => inspectRecord(changed));
  assert.equal(JSON.stringify(previous), before);
});

test('invalid JSON, nulls, oversized files and nonrecords have readable import failures', () => {
  assert.throws(() => parseRecord('{'), /not valid JSON/);
  assert.throws(() => parseRecord('null'), /object/);
  assert.throws(() => parseRecord('[]'), /object/);
  assert.throws(() => parseRecord('{}'), /unsupported format/);
  assert.throws(() => parseRecord(' '.repeat(MAX_RECORD_BYTES + 1)), /8 MiB/);
  const nested = fixture(); let cursor = nested;
  for (let i = 0; i < 120; i++) { cursor.extra = {}; cursor = cursor.extra; }
  assert.throws(() => parseRecord(JSON.stringify(nested)), /too complex/);
});

test('offline structural validation does not pretend to check the digest or scientific truth', () => {
  const changed = fixture();
  changed.question.context = 'Accidentally altered context';
  changed.sha256 = 'f'.repeat(64);
  // The engine must reject this on replay/digest validation before continuation.
  assert.equal(inspectRecord(changed).question.context, 'Accidentally altered context');
});

test('literal-only records with an empty dictionary can be reopened offline', () => {
  const record = parseRecord(readFileSync(new URL('./fixtures/literal-record.json', import.meta.url), 'utf8'));
  assert.equal(record.dictionary.entries.length, 0);
  assert.deepEqual(recordPlayback(record).steps.map(step => step.predictionSet!.result), ['5 + 6', '12', '5 + 6', '11']);
  assert.deepEqual(record.snapshots.at(-1)!.prediction_set.historical_prediction_ids, ['P1']);
  assert.deepEqual(record.snapshots.at(-1)!.prediction_set.current_prediction_ids, ['P3']);
});

test('API commands use a relative same-origin route and retain exact record fields', async () => {
  const record = parseRecord(source); const before = JSON.stringify(record); let route = ''; let options: RequestInit | undefined;
  const fetcher = (async (url, init) => { route = String(url); options = init; return new Response(JSON.stringify({ record })); }) as typeof fetch;
  const command = { operation: 'reduce', frame_id: 'F', response: 'another response' };
  const result = await requestWorkbench('command', { record, command }, fetcher);
  assert.equal(route, '/api/workbench/command'); assert.equal(options!.method, 'POST');
  assert.deepEqual(JSON.parse(options!.body as string), { record, command });
  assert.equal(JSON.stringify(record), before); assert.deepEqual(result, record);
});

test('API connection, protocol and validation failures preserve the supplied record', async () => {
  const record = parseRecord(source); const before = JSON.stringify(record);
  const rejected = (async () => { throw new TypeError('offline'); }) as typeof fetch;
  await assert.rejects(requestWorkbench('validate', { record }, rejected), /local engine/);
  const failure = (async () => new Response(JSON.stringify({ error: 'Record digest mismatch' }), { status: 400 })) as typeof fetch;
  await assert.rejects(requestWorkbench('validate', { record }, failure), /Record digest mismatch/);
  const html = (async () => new Response('<html>Not the bridge</html>')) as typeof fetch;
  await assert.rejects(requestWorkbench('start', {}, html), /did not return a trace record/);
  const unsupported = fixture(); unsupported.version = 99;
  const drift = (async () => new Response(JSON.stringify({ record: unsupported }))) as typeof fetch;
  await assert.rejects(requestWorkbench('validate', { record }, drift), /unsupported/);
  assert.equal(JSON.stringify(record), before);
});
