import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';
import { explorerReducer as reduce, initialState } from '../src/player.ts';

test('all graph and trace references resolve in their own dictionary', () => {
  assert.equal(new Set(dictionaries.map(d => d.id)).size, dictionaries.length);
  assert.equal(new Set(traces.map(t => t.id)).size, traces.length);
  for (const dictionary of dictionaries) {
    const entries = new Set(dictionary.entries.map(e => e.id));
    assert.equal(entries.size, dictionary.entries.length);
    for (const entry of dictionary.entries) for (const id of entry.references) assert.ok(entries.has(id), `${dictionary.id}: ${id}`);
    const examples = traces.filter(t => t.dictionaryId === dictionary.id);
    assert.ok(examples.length);
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
  let state = reduce(initialState, { type: 'seek', index: 3 });
  state = reduce(state, { type: 'toggle' });
  state = reduce(state, { type: 'entry', id: 'trajectory' });
  const saved = state.sessions.kinematics;
  assert.equal(saved.playing, false);
  assert.equal(saved.stepIndex, 3);
  assert.equal(saved.selectedEntryId, 'trajectory');
  state = reduce(state, { type: 'dictionary', id: 'toy-force' });
  state = reduce(state, { type: 'seek', index: 2 });
  state = reduce(state, { type: 'dictionary', id: 'kinematics' });
  assert.deepEqual(state.sessions.kinematics, saved);
  assert.equal(state.sessions['toy-force'].stepIndex, 2);
});

test('manual seek selects a relevant entry and restart resets only the active dictionary', () => {
  let state = reduce(initialState, { type: 'seek', index: 4 });
  assert.equal(state.sessions.kinematics.selectedEntryId, 'time');
  state = reduce(state, { type: 'dictionary', id: 'toy-force' });
  state = reduce(state, { type: 'seek', index: 3 });
  state = reduce(state, { type: 'restart' });
  assert.equal(state.sessions['toy-force'].stepIndex, 0);
  assert.equal(state.sessions['toy-force'].playing, false);
  assert.equal(state.sessions.kinematics.stepIndex, 4);
});

test('invalid IDs and out-of-range steps cannot corrupt state', () => {
  for (const action of [
    { type: 'seek', index: -1 }, { type: 'seek', index: 999 }, { type: 'seek', index: 1.5 },
    { type: 'dictionary', id: 'missing' }, { type: 'entry', id: 'force' }, { type: 'trace', id: 'force' },
  ] as const) assert.equal(reduce(initialState, action), initialState);
});

test('toy force keeps literal residual and does not silently calculate it', () => {
  const result = traces.find(t => t.id === 'force')!.steps.at(-1)!;
  assert.deepEqual(result.fragment, [{ text: '2 kg times 5 m/s^2' }]);
});
