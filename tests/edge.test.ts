import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dictionaries } from '../src/data/dictionaries.ts';
import { houseStatus } from '../src/houses.ts';
import { EDGE_HEIGHT, EDGE_SIZES, edgeFit, edgeHit, edgeLength, edgeModel, edgeOrder, edgePositions } from '../src/edgeModel.ts';

const byId = (id: string) => dictionaries.find(dictionary => dictionary.id === id)!;
const draft = byId('newton-current');
const snapshot = byId('newton-operational');
const exported = dictionaries.filter(dictionary => dictionary.structure?.definitions.length);
const sourceOrder = (id: string) => {
  const source = JSON.parse(readFileSync(new URL(`../docs/${id}-source.json`, import.meta.url), 'utf8'));
  return new Map<string, number>(source.entries.map((entry: { id: string; code_index: number }) => [entry.id, entry.code_index]));
};

test('the Edge draws exported dictionaries in the order of structure.definitions, which is the order of appending', () => {
  assert.deepEqual(exported.map(dictionary => dictionary.id), ['newton-current', 'newton-operational']);
  for (const dictionary of exported) {
    const model = edgeModel(dictionary);
    assert.deepEqual(model.strokes.map(stroke => stroke.sourceId), dictionary.structure!.definitions.map(item => item.id), dictionary.id);
    assert.equal(model.strokes.length, dictionary.definitionCount, dictionary.id);
    assert.equal(model.chronological, true);
    assert.match(model.caption, /in the order it was added/);
    // Chronology must be true: positions in the source are strictly increasing along the Edge.
    const order = sourceOrder(dictionary.id);
    const positions = model.strokes.map(stroke => order.get(stroke.sourceId));
    assert.ok(positions.every(position => position !== undefined), dictionary.id);
    for (let index = 1; index < positions.length; index += 1) assert.ok(positions[index]! > positions[index - 1]!, `${dictionary.id}: ${model.strokes[index].sourceId} is out of order`);
  }
  const draftModel = edgeModel(draft);
  assert.equal(draftModel.strokes.length, 26);
  assert.equal(draftModel.first, 'K1');
  assert.equal(draftModel.newest, 'E11');
  assert.equal(draftModel.listLabel, 'Entries in the order they were added: 26, from K1 to E11');
  assert.equal(edgeModel(snapshot).strokes.length, 45);
});

test('dictionaries without an export are drawn as listed, and say so', () => {
  for (const dictionary of dictionaries.filter(item => !item.structure?.definitions.length)) {
    const model = edgeModel(dictionary);
    const listed = dictionary.entries.flatMap(entry => [entry.sourceId, ...(entry.alternatives ?? []).map(item => item.sourceId)]);
    assert.deepEqual(model.strokes.map(stroke => stroke.sourceId), listed, dictionary.id);
    assert.deepEqual(edgeOrder(dictionary).map(item => item.sourceId), listed, dictionary.id);
    assert.equal(model.chronological, false);
    assert.equal(model.caption, 'Every entry, in the order listed.');
    assert.doesNotMatch(model.caption, /added/);
    assert.match(model.listLabel, /^Entries in the order listed: /);
    assert.ok(model.strokes.every(stroke => stroke.kind === 'ground'), dictionary.id);
    assert.equal(model.placeholders.length, 0);
  }
});

test('stroke height follows the role: groundwork 10, chimney and wall 18, the law 28', () => {
  assert.deepEqual(EDGE_HEIGHT, { ground: 10, again: 18, law: 28 });
  const kinds = new Map(edgeModel(draft).strokes.map(stroke => [stroke.sourceId, stroke.kind]));
  assert.equal(kinds.get('K1'), 'ground');
  assert.equal(kinds.get('K16 / E1'), 'again');
  for (const id of ['E2', 'E3', 'E4', 'E8', 'E9', 'E10']) assert.equal(kinds.get(id), 'law', id);
  for (const id of ['E5', 'E6', 'E7', 'E11']) assert.equal(kinds.get(id), 'again', id);
  // An entry that is a wall of one law and a corner of the next is drawn as the law.
  const snapshotKinds = new Map(edgeModel(snapshot).strokes.map(stroke => [stroke.sourceId, stroke]));
  assert.equal(snapshotKinds.get('E36')!.kind, 'law');
  assert.equal(snapshotKinds.get('E36')!.roleText, 'wall of Law 4 and roof of Law 5');
  for (const dictionary of exported) for (const house of dictionary.houses!) {
    for (const id of Object.values(house.triplet)) assert.equal(edgeModel(dictionary).strokes.find(stroke => stroke.sourceId === id)!.kind, 'law');
  }
});

test('one dashed placeholder per missing house slot, after the end', () => {
  for (const dictionary of exported) {
    const missing = dictionary.houses!.reduce((total, house) => total + houseStatus(house).missing.length, 0);
    assert.equal(edgeModel(dictionary).placeholders.length, missing, dictionary.id);
  }
  const { placeholders, placeholderNote } = edgeModel(draft);
  assert.equal(placeholders.length, 1);
  assert.deepEqual({ ...placeholders[0], label: undefined }, { house: 1, role: 'wall', headword: 'inertial-mass-material-object', kind: 'again', roleText: 'wall of Law 2', label: undefined });
  assert.match(placeholderNote!, /not written yet/);
  const size = EDGE_SIZES[0];
  const { xs, placeholderXs } = edgePositions(26, 1, size);
  assert.equal(placeholderXs[0] - (xs.at(-1)! + size.stroke), 12, 'set apart by a 12px gap');
});

test('options are named by id, headword and role', () => {
  const labels = new Map(edgeModel(draft).strokes.map(stroke => [stroke.sourceId, stroke.label]));
  assert.equal(labels.get('E2'), 'E2, uniform-motion, roof of Law 1');
  assert.equal(labels.get('K16 / E1'), 'K16 / E1, uniform-motion, chimney of Law 1');
  assert.equal(labels.get('E5'), 'E5, inertial-frame, wall of Law 1');
  assert.equal(labels.get('K1'), 'K1, time, groundwork');
  const kinematics = edgeModel(byId('kinematics'));
  assert.equal(kinematics.strokes[0].label, 'E1, time');
  // Exact strings: no transforms, no middle dots.
  for (const dictionary of dictionaries) for (const stroke of edgeModel(dictionary).strokes) {
    assert.ok(stroke.label.startsWith(`${stroke.sourceId}, ${stroke.headword}`));
    assert.doesNotMatch(stroke.label, /·/);
  }
});

test('the Edge has true length and scales down to a 4px stroke and 1px gap, never past the width', () => {
  assert.equal(edgeLength(26, 1, EDGE_SIZES[0]), 26 * 8 + 25 * 3 + 12 + 8);
  assert.deepEqual(edgeFit(26, 1, 1200), EDGE_SIZES[0]);
  assert.deepEqual(edgeFit(26, 1, null), EDGE_SIZES[0]);
  // The Newton II snapshot at 390px wide (358px inside the margins).
  const size = edgeFit(45, 6, 358);
  assert.ok(edgeLength(45, 6, size) <= 358);
  assert.ok(size.stroke >= 4 && size.gap >= 1);
  assert.deepEqual(edgeFit(500, 0, 300), { stroke: 4, gap: 1, apart: 8 });
  assert.deepEqual(EDGE_SIZES.at(-1), { stroke: 4, gap: 1, apart: 8 });
});

test('a pointer x selects the nearest stroke, or a placeholder past the end', () => {
  const size = EDGE_SIZES[0];
  assert.deepEqual(edgeHit(-20, 26, 1, size), { kind: 'stroke', index: 0 });
  assert.deepEqual(edgeHit(4, 26, 1, size), { kind: 'stroke', index: 0 });
  assert.deepEqual(edgeHit(11 * 5 + 4, 26, 1, size), { kind: 'stroke', index: 5 });
  assert.deepEqual(edgeHit(11 * 25 + 4, 26, 1, size), { kind: 'stroke', index: 25 });
  const { placeholderXs } = edgePositions(26, 1, size);
  assert.deepEqual(edgeHit(placeholderXs[0] + 4, 26, 1, size), { kind: 'placeholder', index: 0 });
  assert.deepEqual(edgeHit(5000, 26, 0, size), { kind: 'stroke', index: 25 });
});
