import assert from 'node:assert/strict';
import test from 'node:test';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';
import { fitCamera, openingCamera } from '../src/graphScene.ts';
import type { Bounds } from '../src/graphScene.ts';
import { clusterHouses, createLawScene, homeDegrees, houseSlots } from '../src/lawScene.ts';
import { houseHeadwords } from '../src/houses.ts';
import { hyphenLines } from '../src/graphGeometry.ts';

const withHouses = dictionaries.filter(dictionary => dictionary.houses?.length);
const draft = dictionaries.find(dictionary => dictionary.id === 'newton-current')!;
const snapshot = dictionaries.find(dictionary => dictionary.id === 'newton-operational')!;
const scene = (dictionary = draft, sourceId: string | null = null, headword = dictionary.entries[0].id) => createLawScene(dictionary, headword, sourceId, undefined, 0);
const box = (item: Bounds) => ({ left: item.x - item.width / 2, right: item.x + item.width / 2, top: item.y - item.height / 2, bottom: item.y + item.height / 2 });
const overlap = (a: Bounds, b: Bounds) => { const p = box(a), q = box(b); return p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom; };
/** Frames are given by their top-left corner. */
const inside = (item: Bounds, frame: Bounds) => { const edges = box(item); return edges.left >= frame.x && edges.right <= frame.x + frame.width && edges.top >= frame.y && edges.bottom <= frame.y + frame.height; };
const centred = (frame: Bounds): Bounds => ({ ...frame, x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 });

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

test('degrees nest: each frame lies inside the one before it', () => {
  for (const dictionary of withHouses) {
    const { frames, bounds } = scene(dictionary);
    assert.deepEqual(frames.map(frame => frame.degree), Array.from({ length: frames.length }, (_, degree) => degree), dictionary.id);
    assert.equal(frames.length, Math.max(...dictionary.houses!.map(house => house.degree)) + 1);
    assert.ok(frames[0].x >= 0 && frames[0].y >= 0 && frames[0].x + frames[0].width <= bounds.width && frames[0].y + frames[0].height <= bounds.height);
    for (const [index, frame] of frames.entries()) if (index) {
      const outer = frames[index - 1];
      assert.ok(frame.x > outer.x && frame.y > outer.y && frame.x + frame.width < outer.x + outer.width && frame.y + frame.height < outer.y + outer.height, `${dictionary.id}: degree ${frame.degree} is not inside degree ${outer.degree}`);
    }
  }
});

test('every entry sits in the frame of its degree, outside any deeper frame', () => {
  for (const dictionary of withHouses) {
    const { frames, nodes, placeholders } = scene(dictionary);
    const degrees = homeDegrees(dictionary);
    const placeholderDegree = (id: string) => dictionary.houses![Number(id.split('-')[0])].degree;
    for (const item of [...nodes, ...placeholders]) {
      const degree = degrees.get(item.id) ?? placeholderDegree(item.id);
      assert.ok(inside(item, frames[degree]), `${dictionary.id} ${item.id} is outside degree ${degree}`);
      if (frames[degree + 1]) assert.ok(!overlap(item, centred(frames[degree + 1])), `${dictionary.id} ${item.id} is inside degree ${degree + 1}`);
    }
  }
  // The current draft: groundwork at 0, Newton I at 1, Newton II at 2.
  const degrees = homeDegrees(draft);
  assert.deepEqual(['K1', 'K15', 'K16 / E1', 'E2', 'E6', 'E7', 'E10', 'E11'].map(id => degrees.get(id)), [0, 0, 1, 1, 1, 2, 2, 2]);
  // In the snapshot, law 5 shares E32 and E36 with law 4: they stay at degree 3, and its own entries are at 4.
  const snapshotDegrees = homeDegrees(snapshot);
  assert.deepEqual(['E32', 'E36', 'E34', 'E35'].map(id => snapshotDegrees.get(id)), [3, 3, 4, 4]);
});

test('a house is drawn by its own links: roof from the triplet, chimney and walls from same-headword pairs', () => {
  for (const dictionary of withHouses) {
    const { houseLinks, nodes, placeholders } = scene(dictionary);
    const at = new Map([...nodes, ...placeholders].map(item => [item.id, item as Bounds]));
    const headword = new Map(dictionary.structure!.definitions.map(item => [item.id, item.headword]));
    const references = new Map(dictionary.structure!.definitions.map(item => [item.id, item.references]));
    const roof = houseLinks.filter(link => link.kind === 'roof');
    assert.equal(roof.length, 3 * dictionary.houses!.length, dictionary.id);
    for (const link of roof) {
      const [a, b] = link.id.split('|');
      // The two corners refer to each other.
      assert.ok(references.get(a)!.includes(headword.get(b)!) && references.get(b)!.includes(headword.get(a)!), `${dictionary.id} ${link.id}`);
      assert.ok(!link.unwritten);
    }
    for (const link of houseLinks.filter(item => item.kind !== 'roof')) {
      const [a, b] = link.id.split('|');
      if (link.unwritten) assert.ok(placeholders.some(slot => slot.id === a || slot.id === b), link.id);
      else assert.equal(headword.get(a), headword.get(b), `${dictionary.id} ${link.id} joins two different headwords`);
    }
    for (const link of houseLinks) {
      const [a, b] = link.id.split('|');
      assert.deepEqual([link.source, link.target].map(point => `${point.x},${point.y}`).sort(), [at.get(a)!, at.get(b)!].map(point => `${point.x},${point.y}`).sort(), link.id);
    }
  }
  // Six links per house, except where interlocking houses share one: E32 to E36 is law 4's wall and law 5's chimney.
  const links = scene(snapshot).houseLinks;
  assert.equal(links.length, 6 * snapshot.houses!.length - 1);
  assert.deepEqual(links.filter(link => link.id === 'E32|E36').map(link => link.kind), ['wall']);
  assert.equal(scene().houseLinks.filter(link => link.unwritten).length, 1);
});

test('selecting an entry brightens the links of every house it belongs to', () => {
  const draftLinks = scene(draft, 'E3', 'inertial-frame').houseLinks;
  assert.deepEqual(draftLinks.filter(link => link.connected).map(link => link.house), [0, 0, 0, 0, 0, 0]);
  const shared = scene(snapshot, 'E36', 'canonical-force_acting-object').houseLinks;
  assert.deepEqual([...new Set(shared.filter(link => link.connected).map(link => link.house))].sort(), [3, 4]);
});

test('house labels sit beside the chimney without covering any entry', () => {
  for (const dictionary of withHouses) {
    const { houseLabels, nodes, placeholders } = scene(dictionary);
    assert.equal(houseLabels.length, dictionary.houses!.length);
    for (const label of houseLabels) {
      const area = { x: label.x + 60, y: label.y + 8, width: 120, height: 40 };
      for (const item of [...nodes, ...placeholders]) assert.ok(!overlap(area, item), `${dictionary.id} ${label.label} covers ${item.id}`);
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
      assert.ok(node.y >= node.parent.y && node.y - node.parent.y < 420, `${label}: occurrence is far below its entry`);
      assert.ok(node.x > Math.max(...current.frames.map(frame => frame.x + frame.width)), `${label}: occurrence is inside the frames`);
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

test('a house label and its anchor headword, wrapped at the headword\'s own hyphens, cover no entry', () => {
  for (const dictionary of withHouses) {
    const { houseLabels, nodes, placeholders } = scene(dictionary);
    for (const label of houseLabels) {
      assert.equal(label.anchor, dictionary.houses![label.index].anchor);
      const lines = 1 + hyphenLines(label.anchor!, 18).length;
      // Text runs right from x; the first baseline is at y and each further line 17px lower. 140px holds 18 characters at 13px.
      const area = { x: label.x + 70, y: label.y - 13 + lines * 17 / 2, width: 140, height: lines * 17 };
      for (const item of [...nodes, ...placeholders]) assert.ok(!overlap(area, item), `${dictionary.id} ${label.label} covers ${item.id}`);
    }
  }
});

test('the "start" and "step" tags above a slip have room: nothing sits in the 24px over any slip', () => {
  for (const dictionary of withHouses) {
    const { nodes, placeholders } = scene(dictionary);
    const items = [...nodes, ...placeholders];
    for (const node of nodes) {
      const above = { x: node.x, y: node.y - node.height / 2 - 12, width: node.width, height: 24 };
      for (const item of items) if (item !== node) assert.ok(!overlap(above, item), `${dictionary.id}: no room above ${node.id} for its tags (${item.id})`);
    }
  }
});

test('role rules: law entries carry the law, chimneys and walls carry "defined again", groundwork carries none', () => {
  const kinds = new Map(scene().nodes.map(node => [node.id, node.roleKind]));
  assert.deepEqual(['E2', 'E3', 'E4'].map(id => kinds.get(id)), ['law', 'law', 'law']);
  assert.deepEqual(['K16 / E1', 'E5', 'E6'].map(id => kinds.get(id)), ['again', 'again', 'again']);
  assert.equal(kinds.get('K1'), undefined);
  // E36 is a wall of law 4 and a corner of law 5: the law's rule wins.
  assert.equal(scene(snapshot).nodes.find(node => node.id === 'E36')!.roleKind, 'law');
  for (const dictionary of withHouses) for (const node of scene(dictionary).nodes) {
    const roles = dictionary.houses!.flatMap(house => houseSlots(house).filter(slot => slot.id === node.id).map(slot => slot.role));
    assert.equal(node.roleKind, roles.includes('triplet') ? 'law' : roles.length ? 'again' : undefined, `${dictionary.id} ${node.id}`);
  }
});

test('an unwritten slot knows whose entry it is waiting for', () => {
  const [slot] = scene().placeholders;
  assert.equal(slot.role, 'wall');
  const house = draft.houses!.find(item => Object.values(item.walls).includes(null))!;
  assert.equal(slot.headword, Object.entries(house.walls).find(([, id]) => id === null)![0]);
});

test('visited slips are the headwords the trace has named so far, and only those', () => {
  for (const trace of traces.filter(item => item.dictionaryId === snapshot.id)) for (const [index] of trace.steps.entries()) {
    const current = createLawScene(snapshot, trace.steps[index].relatedEntryIds[0], null, trace, index);
    const named = new Set([trace.startEntryId ?? trace.steps[0].relatedEntryIds[0], ...trace.steps.slice(0, index + 1).flatMap(step => step.relatedEntryIds)]);
    for (const node of current.nodes) assert.equal(node.visited, named.has(node.entryId), `${trace.id} step ${index + 1} ${node.id}`);
    for (const link of current.links) assert.ok(link.targetBox && link.targetBox.width > 0, link.id);
  }
  assert.ok(scene(snapshot).nodes.every(node => !node.visited));
});
