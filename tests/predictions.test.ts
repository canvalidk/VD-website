import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { correctionTrace, correctionDictionary, correctionSource } from '../src/data/correction.ts';
import { traces } from '../src/data/traces.ts';
import { claimDependencies, relevance, snapshotChanges, sourceEntryId } from '../src/predictions.ts';

const snapshots = correctionTrace.steps.map(step => step.predictionSet!);

test('display snapshots retain the exact pinned VDfirst export and dictionary', () => {
  const bytes = readFileSync(new URL('../src/data/correction-source.json', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '57fd1df6292f92ca9e85c9be51bf9403fc43eb693790ad123b9edf77d5cb4eb4');
  assert.equal(correctionSource.scripted_responses, true);
  assert.equal(correctionTrace.scriptedResponses, true);
  assert.deepEqual(snapshots, correctionSource.stages.map(stage => stage.prediction_set));
  assert.deepEqual(correctionDictionary.entries.map(entry => [entry.id, entry.definition]), correctionSource.dictionary.entries);
});

test('mistaken and corrected results keep separate recorded support without deleting claims', () => {
  assert.deepEqual(snapshots.map(snapshot => snapshot.result), ['2 kg times 5 m/s^2', '12 N', 'Prediction: 12 N', '2 kg times 5 m/s^2', 'Prediction: 10 N']);
  assert.deepEqual(snapshots[2].current_prediction_ids, ['P2', 'P3', 'P4', 'P5']);
  assert.deepEqual(snapshots[3].current_prediction_ids, ['P2', 'P3']);
  assert.deepEqual(snapshots[4].current_prediction_ids, ['P2', 'P3', 'P7', 'P8']);
  for (const id of ['P4', 'P5']) {
    assert.equal(relevance(snapshots[2], id), 'current');
    assert.equal(relevance(snapshots[4], id), 'historical');
    assert.deepEqual(snapshots[2].predictions.find(claim => claim.id === id), snapshots[4].predictions.find(claim => claim.id === id));
  }
});

test('reopening and replacing support are separate visible transitions', () => {
  assert.deepEqual(snapshotChanges(snapshots[2], snapshots[3]), { added: [], retired: ['P4', 'P5'] });
  assert.deepEqual(snapshotChanges(snapshots[3], snapshots[4]), { added: ['P7', 'P8'], retired: [] });
  assert.deepEqual(snapshotChanges(undefined, snapshots[0]), { added: ['P2', 'P3'], retired: [] });
});

test('missing support coverage stays unknown instead of being labelled history only', () => {
  const partial = { ...snapshots[4], dependency_selection_complete: false };
  assert.equal(relevance(partial, 'P4'), 'unknown');
  assert.equal(relevance(partial, 'P7'), 'current');
  assert.equal(relevance(snapshots[4], 'missing'), 'unknown');
  assert.deepEqual(snapshotChanges(snapshots[2], partial).retired, []);
});

test('dependency inspection uses transitive recorded indexes, retaining historical claim support', () => {
  const snapshot = snapshots[4];
  const claim = (id: string) => snapshot.predictions.find(item => item.id === id)!;
  assert.deepEqual(claimDependencies(snapshot, claim('P8')).map(item => item.id), ['P2', 'P3', 'P7']);
  assert.deepEqual(claimDependencies(snapshot, claim('P5')).map(item => item.id), ['P2', 'P3', 'P4']);
  assert.deepEqual(claimDependencies(snapshot, claim('P2')), []);
  assert.equal(claim('P7').evidence.stimulus, '2 kg times 5 m/s^2');
});

test('categories, support and no open demands never become a verification verdict', () => {
  for (const snapshot of snapshots) {
    assert.equal(snapshot.schema_version, 2);
    assert.equal(snapshot.trace_complete, true);
    assert.equal(snapshot.coverage_complete, false);
    assert.ok(snapshot.predictions.every(claim => claim.verification === 'unchecked'));
    const ids = new Set(snapshot.predictions.map(claim => claim.id));
    assert.deepEqual(new Set([...snapshot.current_prediction_ids, ...snapshot.historical_prediction_ids]), ids);
  }
});

test('source links use recorded entry indexes, while older playbacks have no invented sets', () => {
  const final = snapshots[4];
  assert.equal(sourceEntryId(final.predictions.find(claim => claim.id === 'P7')!, correctionDictionary.entries), 'force_p_t');
  assert.equal(sourceEntryId(final.predictions.find(claim => claim.id === 'P8')!, correctionDictionary.entries), undefined);
  assert.ok(traces.filter(trace => trace.id !== correctionTrace.id).every(trace => trace.steps.every(step => step.predictionSet === undefined)));
});
