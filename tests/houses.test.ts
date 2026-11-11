import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dictionaries } from '../src/data/dictionaries.ts';
import type { Dictionary } from '../src/data/dictionaries.ts';
import { houseExports } from '../src/data/houses.ts';
import { entryRoles, houseColumns, houseHeadwords, houseStatus, outline, usedBy } from '../src/houses.ts';

const withHouses = dictionaries.filter(dictionary => dictionary.houses?.length);
const byId = (id: string) => dictionaries.find(dictionary => dictionary.id === id)!;
const definitions = (dictionary: Dictionary, headword: string) => {
  const entry = dictionary.entries.find(item => item.id === headword)!;
  return [{ sourceId: entry.sourceId, definition: entry.definition, references: entry.references }, ...(entry.alternatives ?? [])];
};
const flat = (text: string) => text.split(/\s+/).join(' ').trim();
const sourceOrder = (id: string) => {
  const source = JSON.parse(readFileSync(new URL(`../docs/${id}-source.json`, import.meta.url), 'utf8'));
  return new Map<string, number>(source.entries.map((entry: { id: string; code_index: number }) => [entry.id, entry.code_index]));
};

test('house exports come from the checked-in source extracts and a pinned engine commit', () => {
  assert.deepEqual(withHouses.map(dictionary => dictionary.id), ['newton-current', 'newton-operational']);
  for (const [id, exported] of Object.entries(houseExports)) {
    const bytes = readFileSync(new URL(`../docs/${exported.source.file}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(exported.source.file, `${id}-source.json`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), exported.source.file_sha256, `${id}: houses were exported from a different extract`);
    assert.equal(exported.format, 'vd-website-houses');
    assert.equal(exported.version, 2);
    assert.match(exported.producer.commit, /^[0-9a-f]{40}$/);
    assert.equal(exported.source.entry_count, byId(id).definitionCount);
  }
});

test('every house is three headwords whose corner entries each use the other two', () => {
  for (const dictionary of withHouses) for (const [index, house] of dictionary.houses!.entries()) {
    const label = `${dictionary.id} law ${index + 1}`;
    const trio = houseHeadwords(house);
    assert.equal(new Set(trio).size, 3, label);
    assert.deepEqual(Object.keys(house.triplet).sort(), [...trio].sort(), label);
    assert.deepEqual(Object.keys(house.walls).sort(), [...house.winters].sort(), label);
    for (const headword of trio) {
      const corner = definitions(dictionary, headword).find(item => item.sourceId === house.triplet[headword]);
      assert.ok(corner, `${label}: ${house.triplet[headword]} is not a definition of ${headword}`);
      for (const other of trio.filter(item => item !== headword)) assert.ok(corner.references.includes(other), `${label}: ${corner.sourceId} does not use ${other}`);
    }
    if (house.chimney !== null) assert.ok(definitions(dictionary, house.anchor).some(item => item.sourceId === house.chimney), label);
    for (const winter of house.winters) if (house.walls[winter] !== null) assert.ok(definitions(dictionary, winter).some(item => item.sourceId === house.walls[winter]), label);
    const used = [house.chimney, ...Object.values(house.triplet), ...Object.values(house.walls)].filter(id => id !== null);
    assert.deepEqual(Object.keys(house.entries).sort(), [...new Set(used)].sort(), label);
  }
});

test('the old word comes first: chimney before the triplet, walls after their corners', () => {
  for (const dictionary of withHouses) {
    const order = sourceOrder(dictionary.id);
    for (const [index, house] of dictionary.houses!.entries()) {
      const label = `${dictionary.id} law ${index + 1}`;
      const corners = Object.values(house.triplet).map(id => order.get(id)!);
      if (house.chimney !== null) assert.ok(order.get(house.chimney)! < Math.min(...corners), `${label}: chimney is not before the triplet`);
      for (const winter of house.winters) {
        const wall = house.walls[winter];
        if (wall !== null) assert.ok(order.get(wall)! > order.get(house.triplet[winter])!, `${label}: wall ${wall} is not after its corner`);
      }
    }
  }
});

test('displayed parts rebuild each definition exactly, apart from line wrapping', () => {
  for (const dictionary of withHouses) for (const house of dictionary.houses!) for (const [sourceId, parts] of Object.entries(house.entries)) {
    const definition = dictionary.entries.flatMap(entry => definitions(dictionary, entry.id)).find(item => item.sourceId === sourceId)!;
    assert.equal(parts.map(part => part.text).join(''), flat(definition.definition), `${dictionary.id} ${sourceId}`);
    for (const part of parts) if (part.headword !== undefined) assert.equal(part.text.toLowerCase(), part.headword.toLowerCase());
  }
});

test('the current draft has two laws: Newton I complete, Newton II missing one wall', () => {
  const draft = byId('newton-current');
  assert.deepEqual(draft.lawTitles, ['Newton I', 'Newton II']);
  const [first, second] = draft.houses!;
  assert.deepEqual(houseColumns(first), [
    { headword: 'uniform-motion', born: false, before: 'K16 / E1', law: 'E2' },
    { headword: 'inertial-frame', born: true, law: 'E3', after: 'E5' },
    { headword: 'free-particle', born: true, law: 'E4', after: 'E6' },
  ]);
  assert.deepEqual(houseStatus(first), { present: 6, total: 6, missing: [] });
  assert.deepEqual(houseStatus(second), { present: 5, total: 6, missing: [{ headword: 'inertial-mass-material-object', role: 'wall' }] });
  assert.equal(houseColumns(second)[2].after, null);
  assert.equal(houseColumns(second)[0].after, undefined);
});

test('the outline puts every headword in groundwork or a law, in log order', () => {
  const draft = byId('newton-current');
  const structure = outline(draft);
  assert.deepEqual(structure.groundwork.map(entry => entry.sourceId), Array.from({ length: 15 }, (_, index) => `K${index + 1}`));
  assert.deepEqual(structure.laws.map(law => law.entries.map(entry => entry.id)), draft.houses!.map(houseHeadwords));
  for (const dictionary of withHouses) {
    const listed = new Set([...outline(dictionary).groundwork, ...outline(dictionary).laws.flatMap(law => law.entries), ...outline(dictionary).others.flatMap(group => group.entries)].map(entry => entry.id));
    assert.deepEqual([...listed].sort(), dictionary.entries.map(entry => entry.id).sort(), dictionary.id);
  }
});

test('one entry can play a role in two houses, and houses join through shared headwords', () => {
  const snapshot = byId('newton-operational');
  assert.deepEqual(entryRoles(snapshot.houses!, 'E36').map(item => item.role).sort(), ['triplet', 'wall']);
  assert.deepEqual(entryRoles(snapshot.houses!, 'E32').map(item => item.role).sort(), ['chimney', 'triplet']);
  assert.deepEqual(entryRoles(snapshot.houses!, 'E1'), []);
  const draft = byId('newton-current');
  assert.deepEqual(usedBy(draft, 0), [{ house: 1, headwords: ['inertial-frame'] }]);
  assert.deepEqual(usedBy(draft, 1), []);
});

test('degrees come from the engine: laws by R-LAW-07, other headwords by the laws they reach', () => {
  assert.deepEqual(byId('newton-current').houses!.map(house => house.degree), [1, 2]);
  assert.deepEqual(byId('newton-operational').houses!.map(house => house.degree), [1, 2, 1, 3, 4, 4]);
  const snapshot = outline(byId('newton-operational'));
  assert.equal(snapshot.groundwork.length, 14);
  assert.deepEqual(snapshot.others.map(group => [group.degree, group.entries.map(entry => entry.id)]), [[4, ['interaction-set', 'mechanical-composition_point-particle', 'paired-particle_acting-object']]]);
  assert.deepEqual(outline(byId('newton-current')).others, []);
  for (const dictionary of withHouses) {
    assert.deepEqual(dictionary.structure!.definitions.map(item => item.id), [...sourceOrder(dictionary.id).keys()], dictionary.id);
    for (const house of dictionary.houses!) assert.ok(Number.isInteger(house.degree) && house.degree >= 1);
  }
});
