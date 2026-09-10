import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';
import { explorerReducer as reduce, initialState } from '../src/player.ts';
import { traceGraphState, edgeId } from '../src/traceGraph.ts';
import { readFileSync } from 'node:fs';
import { referencePath } from '../src/graphGeometry.ts';

const kinematicsState = () => reduce(reduce(initialState, { type: 'dictionary', id: 'kinematics' }), { type: 'trace', id: 'displacement' });

test('reciprocal reference arrows occupy separate sides of an edge', () => {
  const a = { x: 100, y: 100 }, b = { x: 500, y: 100 };
  const forward = referencePath(a, b, true), reverse = referencePath(b, a, true);
  assert.ok(forward.middle.y > 100);
  assert.ok(reverse.middle.y < 100);
  assert.equal(referencePath(a, b, false).middle.y, 100);
});

test('all graph and trace references resolve in their own dictionary', () => {
  assert.equal(new Set(dictionaries.map(d => d.id)).size, dictionaries.length);
  assert.equal(new Set(traces.map(t => t.id)).size, traces.length);
  for (const dictionary of dictionaries) {
    const entries = new Set(dictionary.entries.map(e => e.id));
    assert.equal(entries.size, dictionary.entries.length);
    for (const entry of dictionary.entries) for (const id of entry.references) assert.ok(entries.has(id), `${dictionary.id}: ${id}`);
    const examples = traces.filter(t => t.dictionaryId === dictionary.id);
    if (dictionary.id !== 'newton-current') assert.ok(examples.length);
    for (const trace of examples) {
      assert.ok(trace.steps.length > 1);
      assert.equal(new Set(trace.steps.map(s => s.id)).size, trace.steps.length);
      for (const step of trace.steps) {
        assert.ok(step.relatedEntryIds.length);
        for (const id of step.relatedEntryIds) assert.ok(entries.has(id), `${trace.id}: ${id}`);
        for (const part of step.fragment) {
          assert.notEqual('text' in part, 'entryId' in part);
          if (part.entryId) assert.ok(entries.has(part.entryId));
        }
        if (step.settled) assert.ok(step.fragment.every(part => !part.entryId));
        for (const edge of step.traversedEdges ?? []) {
          assert.ok(dictionary.entries.find(entry => entry.id === edge.from)?.references.includes(edge.to), trace.id + ': invalid traversed edge');
        }
      }
      for (const occurrence of trace.occurrences ?? []) {
        assert.ok(entries.has(occurrence.entryId));
        assert.ok(entries.has(occurrence.parentEntryId));
        const appeared = trace.steps.findIndex(step => step.id === occurrence.appearsAt);
        const flattened = trace.steps.findIndex(step => step.id === occurrence.flattenedAt);
        assert.ok(appeared >= 0 && flattened > appeared);
        assert.equal(trace.steps[flattened].operation, 'Flatten');
      }
    }
  }
});

test('playing each trace stops at the final step and replay starts over', () => {
  for (const trace of traces) {
    let state = reduce(initialState, { type: 'dictionary', id: trace.dictionaryId });
    state = reduce(state, { type: 'trace', id: trace.id });
    state = reduce(state, { type: 'toggle' });
    assert.ok(state.sessions[trace.dictionaryId].playing);
    for (let i = 1; i < trace.steps.length + 2; i++) state = reduce(state, { type: 'tick' });
    assert.equal(state.sessions[trace.dictionaryId].stepIndex, trace.steps.length - 1);
    assert.equal(state.sessions[trace.dictionaryId].playing, false);
    state = reduce(state, { type: 'toggle' });
    assert.equal(state.sessions[trace.dictionaryId].stepIndex, 0);
    assert.equal(state.sessions[trace.dictionaryId].playing, true);
  }
});

test('browsing pauses playback without changing the step, and switching dictionaries remembers both places', () => {
  let state = reduce(kinematicsState(), { type: 'seek', index: 3 });
  state = reduce(state, { type: 'toggle' });
  state = reduce(state, { type: 'entry', id: 'trajectory' });
  const saved = state.sessions.kinematics;
  assert.equal(saved.playing, false);
  assert.equal(saved.stepIndex, 3);
  assert.equal(saved.selectedEntryId, 'trajectory');
  state = reduce(state, { type: 'dictionary', id: 'toy-force' });
  state = reduce(state, { type: 'trace', id: 'force' });
  state = reduce(state, { type: 'seek', index: 2 });
  state = reduce(state, { type: 'dictionary', id: 'kinematics' });
  assert.deepEqual(state.sessions.kinematics, saved);
  assert.equal(state.sessions['toy-force'].stepIndex, 2);
});

test('manual seek selects a relevant entry and restart resets only the active dictionary', () => {
  let state = reduce(kinematicsState(), { type: 'seek', index: 4 });
  assert.equal(state.sessions.kinematics.selectedEntryId, 'time');
  state = reduce(state, { type: 'dictionary', id: 'toy-force' });
  state = reduce(state, { type: 'trace', id: 'force' });
  state = reduce(state, { type: 'seek', index: 3 });
  state = reduce(state, { type: 'restart' });
  assert.equal(state.sessions['toy-force'].stepIndex, 0);
  assert.equal(state.sessions['toy-force'].playing, false);
  assert.equal(state.sessions.kinematics.stepIndex, 4);
});

test('invalid IDs and out-of-range steps cannot corrupt state', () => {
  const state = kinematicsState();
  for (const action of [
    { type: 'seek', index: -1 }, { type: 'seek', index: 999 }, { type: 'seek', index: 1.5 },
    { type: 'dictionary', id: 'missing' }, { type: 'entry', id: 'force' }, { type: 'trace', id: 'force' },
  ] as const) assert.equal(reduce(state, action), state);
});

test('starts unpicked; clearing the dictionary pauses playback and safely hides the trace', () => {
  assert.equal(initialState.dictionaryId, '');
  assert.ok(Object.values(initialState.sessions).every(session => session.traceId === null && !session.playing));
  assert.equal(reduce(initialState, { type: 'toggle' }), initialState);
  let state = reduce(kinematicsState(), { type: 'toggle' });
  state = reduce(state, { type: 'dictionary', id: '' });
  assert.equal(state.dictionaryId, '');
  assert.equal(state.sessions.kinematics.playing, false);
  assert.equal(reduce(state, { type: 'tick' }), state);
  state = reduce(state, { type: 'dictionary', id: 'newton-current' });
  assert.equal(state.sessions['newton-current'].traceId, null);
  assert.equal(reduce(state, { type: 'trace', id: 'newton-ii-recorded' }), state);
});

test('traversed edges accumulate by step and rewind without conflating inspection and traversal', () => {
  const trace = traces.find(item => item.id === 'newton-ii-recorded')!;
  assert.equal(traceGraphState(trace, 0).startEntryId, 'inertial-acceleration');
  assert.equal(traceGraphState(trace, 1).traversed.size, 0);
  assert.deepEqual([...traceGraphState(trace, 2).traversed], [edgeId('inertial-acceleration', 'point-particle')]);
  assert.deepEqual([...traceGraphState(trace, trace.steps.length - 1).traversed].sort(), [
    edgeId('inertial-acceleration', 'point-particle'), edgeId('inertial-acceleration', 'net-force'),
    edgeId('net-force', 'impressed-force'), edgeId('net-force', 'interaction-set'),
  ].sort());
  assert.equal(traceGraphState(trace, 0).traversed.size, 0);
  assert.equal(traceGraphState(undefined, 0).startEntryId, undefined);
});

test('only the recorded self-label occurrences fade on their flatten steps', () => {
  const trace = traces.find(item => item.id === 'newton-ii-recorded')!;
  assert.equal(traceGraphState(trace, 0).occurrences.length, 0);
  assert.equal(traceGraphState(trace, 1).occurrences[0].flattened, false);
  assert.equal(traceGraphState(trace, 3).occurrences[0].flattened, true);
  assert.equal(traceGraphState(trace, 5).occurrences[1].flattened, false);
  assert.ok(traceGraphState(trace, 6).occurrences.every(item => item.flattened));
  assert.equal(traceGraphState(trace, 1).occurrences[0].flattened, false);
  assert.equal(traceGraphState(trace, 6).startEntryId, 'inertial-acceleration');
  assert.equal(traceGraphState(traces.find(item => item.id === 'force'), 3).occurrences.length, 0);
});

test('both Newton versions retain every source definition and duplicate headword', () => {
  for (const [id, count] of [['newton-current', 26], ['newton-operational', 45]] as const) {
    const dictionary = dictionaries.find(item => item.id === id)!;
    const source = JSON.parse(readFileSync(new URL('../docs/' + id + '-source.json', import.meta.url), 'utf8'));
    const definitions = dictionary.entries.flatMap(entry => [
      { id: entry.sourceId, headword: entry.id, definition: entry.definition },
      ...(entry.alternatives ?? []).map(definition => ({ id: definition.sourceId, headword: entry.id, definition: definition.definition })),
    ]);
    assert.equal(definitions.length, count);
    for (const entry of source.entries) assert.deepEqual(definitions.find(item => item.id === entry.id), { id: entry.id, headword: entry.headword, definition: entry.definition });
  }
});

test('toy force keeps literal residual and does not silently calculate it', () => {
  const result = traces.find(t => t.id === 'force')!.steps.at(-1)!;
  assert.deepEqual(result.fragment, [{ text: '2 kg times 5 m/s^2' }]);
});
