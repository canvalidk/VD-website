import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaries } from '../src/data/dictionaries.ts';
import { homeGroups, homeIncompleteLaw, homeLawWords, homeLog, homeOpening } from '../src/homeFigure.ts';
import { houseSlots } from '../src/lawScene.ts';

const draft = dictionaries.find(dictionary => dictionary.id === 'newton-current')!;
const withHouses = dictionaries.filter(dictionary => dictionary.houses?.length);
const flat = (text: string) => text.split(/\s+/).join(' ').trim();
const definitionOf = (sourceId: string) => draft.entries.flatMap(entry => [{ sourceId: entry.sourceId, definition: entry.definition }, ...(entry.alternatives ?? [])]).find(item => item.sourceId === sourceId)!.definition;

test('the Introduction figure shows Law 1 of the current draft: six entries with their roles', () => {
  const log = homeLog(draft, 0);
  assert.deepEqual(log.map(line => [line.id, line.headword, line.role, line.group]), [
    ['K16 / E1', 'uniform-motion', 'chimney', 'before'],
    ['E2', 'uniform-motion', 'triplet', 'law'],
    ['E3', 'inertial-frame', 'triplet', 'law'],
    ['E4', 'free-particle', 'triplet', 'law'],
    ['E5', 'inertial-frame', 'wall', 'after'],
    ['E6', 'free-particle', 'wall', 'after'],
  ]);
  assert.deepEqual(log.map(line => line.roleLabel), [
    "the old word's earlier entry, the chimney",
    'roof', 'roof', 'roof',
    "a new word's later entry, a wall",
    "a new word's later entry, a wall",
  ]);
  assert.deepEqual(homeGroups.map(group => group.label), ['Before', 'The law', 'After']);
});

test('the figure opens on E3, whose string names both other law words', () => {
  assert.equal(homeOpening(draft, 0), 'E3');
  const e3 = homeLog(draft, 0).find(line => line.id === 'E3')!;
  const lawWords = homeLawWords(draft, 0, e3);
  assert.deepEqual([...lawWords].sort(), ['free-particle', 'uniform-motion']);
  for (const word of lawWords) assert.ok(e3.parts!.some(part => part.headword === word && !part.self), `E3 should use ${word}`);
  assert.deepEqual(homeLawWords(draft, 0, homeLog(draft, 0).find(line => line.id === 'E5')!), [], 'only law entries make the roof');
});

test('each slip shows its exact string, apart from line wrapping', () => {
  for (const line of homeLog(draft, 0)) assert.equal(line.parts!.map(part => part.text).join(''), flat(definitionOf(line.id!)), line.id!);
});

test('the log order is the append order of the dictionary', () => {
  const appended = draft.structure!.definitions.map(definition => definition.id);
  const ids = homeLog(draft, 0).map(line => line.id!);
  assert.deepEqual(ids, appended.filter(id => ids.includes(id)));
  for (const dictionary of withHouses) for (const index of dictionary.houses!.keys()) {
    const order = homeLog(dictionary, index).filter(line => line.id !== null).map(line => dictionary.structure!.definitions.findIndex(definition => definition.id === line.id));
    assert.ok(order.every(place => place >= 0), `${dictionary.id} law ${index + 1}: every written entry is in the log`);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${dictionary.id} law ${index + 1}: log lines follow the append order`);
  }
});

test('the drawing uses the house geometry, and an unwritten entry is kept as an empty slot', () => {
  for (const dictionary of withHouses) for (const [index, house] of dictionary.houses!.entries()) {
    const log = homeLog(dictionary, index);
    assert.equal(log.length, 6);
    const slots = houseSlots(house);
    assert.deepEqual([...log].sort((a, b) => a.row - b.row || a.col - b.col).map(line => [line.id, line.col, line.row]), slots.map(slot => [slot.id, slot.col, slot.row]));
    for (const line of log) assert.equal(line.parts === null, line.id === null);
  }
});

test('the caption points to the draft\'s other law, which is missing one wall', () => {
  const incomplete = homeIncompleteLaw(draft, 0)!;
  assert.equal(incomplete.index, 1);
  assert.equal(incomplete.ordinal, 'second');
  assert.equal(incomplete.missing, 1);
  assert.equal(incomplete.role, 'wall');
});
