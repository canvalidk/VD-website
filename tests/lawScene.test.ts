import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';
import { fitCamera, openingCamera } from '../src/graphScene.ts';
import type { Bounds } from '../src/graphScene.ts';
import { clusterHouses, createLawScene, houseSlots } from '../src/lawScene.ts';
import { houseHeadwords } from '../src/houses.ts';

const withHouses = dictionaries.filter(dictionary => dictionary.houses?.length);
const draft = dictionaries.find(dictionary => dictionary.id === 'newton-current')!;
const snapshot = dictionaries.find(dictionary => dictionary.id === 'newton-operational')!;
const scene = (dictionary = draft, sourceId: string | null = null, headword = dictionary.entries[0].id) => createLawScene(dictionary, headword, sourceId, undefined, 0);
const box = (item: Bounds) => ({ left: item.x - item.width / 2, right: item.x + item.width / 2, top: item.y - item.height / 2, bottom: item.y + item.height / 2 });
const overlap = (a: Bounds, b: Bounds) => { const p = box(a), q = box(b); return p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom; };

test('every definition is exactly one node, inside the map, overlapping nothing', () => {
  for (const dictionary of withHouses) {
    const { nodes, placeholders, bounds } = scene(dictionary);
    assert.equal(nodes.length, dictionary.definitionCount, dictionary.id);
    assert.deepEqual(nodes.map(node => node.id), dictionary.structure!.definitions.map(item => item.id));
    assert.equal(new Set(nodes.map(node => node.id)).size, nodes.length);
    const items = [...nodes, ...placeholders];
    for (const item of items) { const edges = box(item); assert.ok(edges.left >= 0 && edges.top >= 0 && edges.right <= bounds.width && edges.bottom <= bounds.height, `${dictionary.id} ${item.id} leaves the map`); }
    for (const [index, a] of items.entries()) for (const b of items.slice(index + 1)) assert.ok(!overlap(a, b), `${dictionary.id}: ${a.id} overlaps ${b.id}`);
  }
});

test('a law is a house: chimney above the old word\'s corner, new words\' corners below, walls under them', () => {
  const at = new Map(scene().nodes.map(node => [node.id, node]));
  const [chimney, apex, left, right, leftWall, rightWall] = ['K16 / E1', 'E2', 'E3', 'E4', 'E5', 'E6'].map(id => at.get(id)!);
  assert.equal(chimney.x, apex.x);
  assert.ok(chimney.y < apex.y && apex.y < left.y && left.y < leftWall.y);
  assert.equal(left.y, right.y);
  assert.equal(apex.x - left.x, right.x - apex.x);
  assert.ok(left.x < apex.x);
  assert.deepEqual([leftWall.x, rightWall.x, leftWall.y], [left.x, right.x, rightWall.y]);
  // Each headword of a law is a vertical pair wherever both of its entries exist.
  for (const dictionary of withHouses) {
    const nodes = new Map(scene(dictionary).nodes.map(node => [node.id, node]));
    for (const house of dictionary.houses!) for (const headword of houseHeadwords(house)) {
      const pair = houseSlots(house).filter(slot => slot.headword === headword && slot.id !== null).map(slot => nodes.get(slot.id!)!);
      if (pair.length === 2) { assert.equal(pair[0].x, pair[1].x, `${dictionary.id} ${headword}`); assert.ok(pair[0].y < pair[1].y); }
    }
  }
});

test('an entry that is not written yet leaves a marked gap in its house', () => {
  const { placeholders, nodes } = scene();
  assert.deepEqual(placeholders.map(slot => slot.label), ['Wall not written']);
  const corner = nodes.find(node => node.id === 'E10')!;
  assert.deepEqual([placeholders[0].x, placeholders[0].y > corner.y], [corner.x, true]);
  assert.equal(scene(snapshot).placeholders.length, 6);
});

test('houses that share entries interlock instead of duplicating them', () => {
  const clusters = clusterHouses(snapshot.houses!);
  assert.deepEqual(clusters.map(cluster => cluster.houses.map(item => item.index)), [[0], [1], [2], [3, 4], [5]]);
  const nodes = new Map(scene(snapshot).nodes.map(node => [node.id, node]));
  // E32 is a corner of law 4 and the chimney of law 5; E36 is a wall of law 4 and the top corner of law 5.
  assert.equal(nodes.get('E32')!.x, nodes.get('E36')!.x);
  assert.ok(nodes.get('E32')!.y < nodes.get('E36')!.y);
  assert.ok(nodes.get('E34')!.y > nodes.get('E36')!.y && nodes.get('E34')!.y === nodes.get('E35')!.y);
  assert.equal(nodes.get('E36')!.roles, 'wall of law 4, triplet corner of law 5');
});

test('degree 0 is the band on top; higher degrees are columns from left to right', () => {
  for (const dictionary of withHouses) {
    const { bands, nodes, houses } = scene(dictionary);
    assert.equal(bands[0].label, 'Degree 0');
    const columns = bands.slice(1);
    assert.deepEqual(columns.map(band => band.label), [...new Set(dictionary.houses!.map(house => house.degree))].sort((a, b) => a - b).map(degree => `Degree ${degree}`));
    for (const [index, band] of columns.entries()) if (index) assert.ok(band.x >= columns[index - 1].x + columns[index - 1].width);
    const groundBottom = Math.max(...nodes.filter(node => !dictionary.houses!.some(house => houseHeadwords(house).includes(node.entryId)) && (dictionary.structure!.headwordDegrees[node.entryId] ?? 0) === 0).map(node => node.y));
    assert.ok(columns.every(band => band.y > groundBottom));
    assert.equal(houses.length, dictionary.houses!.length);
    // A house that starts its own cluster stands inside the column of its degree.
    for (const cluster of clusterHouses(dictionary.houses!)) {
      const first = dictionary.houses![cluster.houses[0].index];
      const band = columns.find(item => item.label === `Degree ${cluster.degree}`)!;
      const top = nodes.find(node => node.id === first.triplet[first.anchor])!;
      assert.ok(top.x > band.x && top.x < band.x + band.width, `${dictionary.id} law ${cluster.houses[0].index + 1}`);
    }
  }
});

test('lines follow references, except inside a roof', () => {
  for (const dictionary of withHouses) {
    const { edges, nodes } = scene(dictionary);
    const references = new Map(dictionary.structure!.definitions.map(item => [item.id, item.references]));
    const roofOf = new Map<string, string[]>();
    for (const house of dictionary.houses!) for (const id of Object.values(house.triplet)) roofOf.set(id, [...(roofOf.get(id) ?? []), ...houseHeadwords(house)]);
    for (const edge of edges) {
      assert.ok(references.get(edge.source.id)!.includes(edge.target.entryId), `${dictionary.id} ${edge.id}`);
      assert.ok(!roofOf.get(edge.source.id)?.includes(edge.target.entryId), `${dictionary.id} ${edge.id} is inside a roof`);
    }
    const expected = nodes.flatMap(node => references.get(node.id)!.filter(headword => headword !== node.entryId && !roofOf.get(node.id)?.includes(headword)).map(headword => `${node.id}→${headword}`));
    assert.deepEqual(edges.map(edge => edge.id).sort(), expected.sort(), dictionary.id);
  }
});

test('selecting an entry marks that node; selecting a headword marks all of its entries', () => {
  assert.deepEqual(scene(draft, 'E2', 'uniform-motion').nodes.filter(node => node.selected).map(node => node.id), ['E2']);
  assert.deepEqual(scene(draft, null, 'uniform-motion').nodes.filter(node => node.selected).map(node => node.id), ['K16 / E1', 'E2']);
  // E2 is a roof corner: its only references are inside the roof, so no line is drawn for it.
  assert.ok(scene(draft, 'E2', 'uniform-motion').edges.every(edge => edge.source.id !== 'E2'));
  const selected = scene(draft, 'K16 / E1', 'uniform-motion');
  assert.ok(selected.edges.filter(edge => edge.connected).every(edge => edge.source.id === 'K16 / E1' || edge.target.entryId === 'uniform-motion'));
  assert.deepEqual(selected.edges.filter(edge => edge.connected && edge.source.id === 'K16 / E1').map(edge => edge.target.entryId).sort(), ['path', 'point-particle', 'position', 'speed', 'time-interval', 'trajectory', 'velocity']);
});

test('a trace replays on the structure at headword precision without leaving the map', () => {
  for (const trace of traces.filter(item => item.dictionaryId === snapshot.id)) for (const [index, step] of trace.steps.entries()) {
    const current = createLawScene(snapshot, step.relatedEntryIds[0], null, trace, index);
    const label = `${trace.id} step ${index + 1}`;
    assert.deepEqual(new Set(current.nodes.filter(node => node.active).map(node => node.entryId)), new Set(step.relatedEntryIds), label);
    assert.equal(current.nodes.filter(node => node.start).length, 1, label);
    assert.ok(current.edges.every(edge => !edge.traversed && !edge.bound), label);
    for (const edge of step.traversedEdges ?? []) assert.ok(current.links.some(link => link.traversed && link.current && link.id.endsWith(`${edge.from}→${edge.to}`)), label);
    for (const node of current.occurrences.filter(item => item.visible)) {
      assert.ok(node.parent, label);
      assert.ok(node.y > node.parent.y && node.y - node.parent.y < 420, `${label}: occurrence is far from its entry`);
      for (const other of [...current.nodes, ...current.placeholders, ...current.occurrences.filter(item => item !== node)]) assert.ok(!overlap(node, other), `${label}: occurrence overlaps ${other.id}`);
    }
    const focus = current.focusBounds;
    assert.ok(focus.x >= 0 && focus.y >= 0 && focus.x + focus.width <= current.bounds.width && focus.y + focus.height <= current.bounds.height, label);
  }
});

test('a large map opens at a readable scale from its top-left corner', () => {
  const viewport = { width: 700, height: 640 };
  const large = scene(snapshot).bounds, small = { x: 0, y: 0, width: 600, height: 500 };
  assert.ok(fitCamera(large, viewport).scale < .62);
  assert.deepEqual(openingCamera(large, viewport), { scale: .62, x: 14, y: large.height * .62 <= viewport.height ? (viewport.height - large.height * .62) / 2 : 14 });
  assert.deepEqual(openingCamera(small, viewport), fitCamera(small, viewport));
});
