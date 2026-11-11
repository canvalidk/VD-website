import type { Dictionary } from './data/dictionaries.ts';
import type { PreparedTrace } from './data/traces.ts';
import type { Bounds, HouseLabel, HouseLink, SceneEdge, SceneFrame, SceneLink, SceneNode, ScenePlaceholder } from './graphScene.ts';
import { surrounding } from './graphScene.ts';
import { edgeId, traceGraphState } from './traceGraph.ts';
import type { House, HouseRole } from './houses.ts';
import { houseHeadwords } from './houses.ts';

/**
 * The law-structure layout. Every definition is one node.
 *
 * Degrees nest: degree 0 is the outermost frame, degree 1 lies inside it, degree 2 inside
 * degree 1, and so on. Each frame holds the entries of its own degree in a band at its top,
 * and the next degree's frame below them.
 *
 * A law is not drawn as a shape. Its six entries are placed so that their own links draw it:
 *
 *        [chimney]            same headword as the corner below (the old word's earlier entry)
 *            |
 *        [corner A]           the triplet: each corner refers to the other two,
 *         /     \             so the three references form the roof
 *   [corner B]--[corner C]
 *        |         |          same headword as the corner above (the new words' later entries)
 *    [wall B]   [wall C]
 */
export const NODE = { width: 172, height: 64 };
// House spacing is wide enough that the links between entries, not the boxes, carry the shape.
const PX = 150, PY = 116, GRID_X = NODE.width + 14, GRID_Y = NODE.height + 16;
const LEFT = 24, TOP = 20, INSET = 26, PAD_X = 20, HEADER = 40, LEVEL_GAP = 30, PAD_BOTTOM = 20, ITEM_GAP = 44, GUTTER = 44;

export interface Slot { id: string | null; role: HouseRole; headword: string; col: number; row: number }
/** The six positions of a house, relative to its chimney. */
export function houseSlots(house: House): Slot[] {
  const [first, second] = house.winters;
  return [
    { id: house.chimney, role: 'chimney', headword: house.anchor, col: 0, row: 0 },
    { id: house.triplet[house.anchor], role: 'triplet', headword: house.anchor, col: 0, row: 1 },
    { id: house.triplet[first], role: 'triplet', headword: first, col: -1, row: 2 },
    { id: house.triplet[second], role: 'triplet', headword: second, col: 1, row: 2 },
    { id: house.walls[first], role: 'wall', headword: first, col: -1, row: 3 },
    { id: house.walls[second], role: 'wall', headword: second, col: 1, row: 3 },
  ];
}

interface Cell { col: number; row: number }
export interface HouseCluster { houses: { index: number; origin: Cell }[]; cells: Map<string, Cell>; degree: number; min: Cell; max: Cell }
/**
 * Houses that share a definition interlock: the shared entry is one node, and the later
 * house is positioned from it. A wall of one law that is a corner of the next puts the
 * next house directly below, which is how walls become chimneys.
 */
export function clusterHouses(houses: House[]): HouseCluster[] {
  const clusters: HouseCluster[] = [];
  const home = new Map<string, HouseCluster>();
  houses.forEach((house, index) => {
    const slots = houseSlots(house);
    const shared = slots.find(slot => slot.id !== null && home.has(slot.id));
    let cluster: HouseCluster, origin: Cell;
    if (shared) {
      cluster = home.get(shared.id!)!;
      const at = cluster.cells.get(shared.id!)!;
      origin = { col: at.col - shared.col, row: at.row - shared.row };
    } else {
      cluster = { houses: [], cells: new Map(), degree: house.degree, min: { col: 0, row: 0 }, max: { col: 0, row: 0 } };
      origin = { col: 0, row: 0 };
      clusters.push(cluster);
    }
    for (const slot of slots) if (slot.id !== null && !home.has(slot.id)) {
      cluster.cells.set(slot.id, { col: origin.col + slot.col, row: origin.row + slot.row });
      home.set(slot.id, cluster);
    }
    cluster.houses.push({ index, origin });
    cluster.degree = Math.min(cluster.degree, house.degree);
  });
  for (const cluster of clusters) {
    const cells = cluster.houses.flatMap(({ index, origin }) => houseSlots(houses[index]).map(slot => ({ col: origin.col + slot.col, row: origin.row + slot.row })));
    cluster.min = { col: Math.min(...cells.map(cell => cell.col)), row: Math.min(...cells.map(cell => cell.row)) };
    cluster.max = { col: Math.max(...cells.map(cell => cell.col)), row: Math.max(...cells.map(cell => cell.row)) };
  }
  return clusters;
}

/** The degree a definition belongs to: the lowest degree among the laws it is part of, else its headword's degree. */
export function homeDegrees(dictionary: Dictionary): Map<string, number> {
  const houses = dictionary.houses ?? [];
  const degrees = new Map<string, number>();
  houses.forEach(house => { for (const slot of houseSlots(house)) if (slot.id !== null) degrees.set(slot.id, Math.min(degrees.get(slot.id) ?? Infinity, house.degree)); });
  for (const definition of dictionary.structure?.definitions ?? []) if (!degrees.has(definition.id)) degrees.set(definition.id, dictionary.structure!.headwordDegrees[definition.headword] ?? 0);
  return degrees;
}

const placeholderId = (house: number, slot: Slot) => `${house}-${slot.role}-${slot.headword}`;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const roleWord: Record<HouseRole, string> = { chimney: 'chimney', triplet: 'triplet corner', wall: 'wall' };
const frameNote = (degree: number) => degree === 0 ? 'Groundwork: entries that stand on no law' : degree === 1 ? 'Laws that stand on groundwork only' : `Laws that stand on a degree ${degree - 1} law`;

export function createLawScene(dictionary: Dictionary, selectedId: string, selectedSourceId: string | null, trace: PreparedTrace | undefined, index: number) {
  const houses = dictionary.houses ?? [];
  const definitions = dictionary.structure?.definitions ?? [];
  const history = traceGraphState(trace, index);
  const step = trace?.steps[index];
  const home = homeDegrees(dictionary);
  const clusters = clusterHouses(houses);
  const inHouse = new Set(houses.flatMap(house => houseSlots(house).flatMap(slot => slot.id === null ? [] : [slot.id])));

  // Everything a cluster draws, with the degree each item belongs to.
  const groups = clusters.map((cluster, order) => {
    const items = [
      ...[...cluster.cells].map(([id, cell]) => ({ id, cell, degree: home.get(id)!, placeholder: false })),
      ...cluster.houses.flatMap(({ index: houseIndex, origin }) => houseSlots(houses[houseIndex]).filter(slot => slot.id === null)
        .map(slot => ({ id: placeholderId(houseIndex, slot), cell: { col: origin.col + slot.col, row: origin.row + slot.row }, degree: houses[houseIndex].degree, placeholder: true }))),
    ];
    const levels = [...new Set(items.map(item => item.degree))].sort((a, b) => a - b);
    return { cluster, order, items, levels, top: levels[0], deepest: levels.at(-1)!, width: (cluster.max.col - cluster.min.col) * PX + NODE.width, x: 0 };
  });
  const loose = definitions.filter(definition => !inHouse.has(definition.id));
  const looseAt = (degree: number) => loose.filter(definition => home.get(definition.id) === degree);
  const deepest = Math.max(0, ...groups.map(group => group.deepest), ...loose.map(definition => home.get(definition.id)!));
  const levels = Array.from({ length: deepest + 1 }, (_, degree) => degree);
  const contentLeft = (degree: number) => LEFT + degree * INSET + PAD_X;

  // Horizontal placement. A cluster that spans several degrees keeps one x at every level, so it is
  // placed first and far enough in to sit inside its deepest frame.
  const right = levels.map(() => -Infinity);
  for (const degree of levels) {
    const starting = groups.filter(group => group.top === degree).sort((a, b) => (b.deepest - b.top) - (a.deepest - a.top) || a.order - b.order);
    for (const group of starting) {
      group.x = Math.max(contentLeft(group.deepest), ...group.levels.map(level => right[level] === -Infinity ? -Infinity : right[level] + ITEM_GAP));
      for (const level of group.levels) right[level] = Math.max(right[level], group.x + group.width);
    }
  }
  const looseStart = (degree: number) => right[degree] === -Infinity ? contentLeft(degree) : right[degree] + ITEM_GAP;
  const minimumColumns = (degree: number) => Math.min(looseAt(degree).length, degree === 0 ? 5 : 2);
  const width = Math.max(...levels.map(degree => {
    const looseRight = minimumColumns(degree) ? looseStart(degree) + minimumColumns(degree) * GRID_X - 14 : -Infinity;
    const used = Math.max(right[degree], looseRight, contentLeft(degree) + 240);
    return used + PAD_X + degree * INSET - LEFT;
  }));
  const contentRight = (degree: number) => LEFT + width - degree * INSET - PAD_X;

  // Vertical placement, level by level from the outside in.
  const position = new Map<string, { x: number; y: number }>();
  const frames: SceneFrame[] = [];
  let frameTop = TOP, lastBottom = TOP;
  for (const degree of levels) {
    const contentTop = frameTop + HEADER;
    let bandHeight = 0;
    for (const group of groups) {
      const items = group.items.filter(item => item.degree === degree);
      if (!items.length) continue;
      const minRow = Math.min(...items.map(item => item.cell.row)), maxRow = Math.max(...items.map(item => item.cell.row));
      for (const item of items) position.set(item.id, { x: group.x + NODE.width / 2 + (item.cell.col - group.cluster.min.col) * PX, y: contentTop + NODE.height / 2 + (item.cell.row - minRow) * PY });
      bandHeight = Math.max(bandHeight, (maxRow - minRow) * PY + NODE.height);
    }
    const extra = looseAt(degree);
    if (extra.length) {
      let start = looseStart(degree), top = contentTop;
      let columns = Math.min(extra.length, Math.floor((contentRight(degree) - start + 14) / GRID_X));
      if (columns < 1) { start = contentLeft(degree); top = contentTop + bandHeight + 16; columns = Math.max(1, Math.floor((contentRight(degree) - start + 14) / GRID_X)); }
      extra.forEach((definition, place) => position.set(definition.id, { x: start + NODE.width / 2 + (place % columns) * GRID_X, y: top + NODE.height / 2 + Math.floor(place / columns) * GRID_Y }));
      bandHeight = Math.max(bandHeight, top - contentTop + Math.ceil(extra.length / columns) * GRID_Y - 16);
    }
    frames.push({ degree, note: frameNote(degree), x: LEFT + degree * INSET, y: frameTop, width: width - 2 * degree * INSET, height: 0 });
    lastBottom = contentTop + bandHeight;
    frameTop = lastBottom + LEVEL_GAP;
  }
  // Centre each level's content in its frame, unless a house reaches into it from another level
  // (that house keeps one x at every level it spans).
  const levelOf = new Map<string, number>([
    ...groups.flatMap(group => group.items.map(item => [item.id, item.degree] as [string, number])),
    ...loose.map(definition => [definition.id, home.get(definition.id)!] as [string, number]),
  ]);
  for (const degree of levels) {
    if (groups.some(group => group.levels.length > 1 && group.levels.includes(degree))) continue;
    const ids = [...levelOf].filter(([id, level]) => level === degree && position.has(id)).map(([id]) => id);
    if (!ids.length) continue;
    const xs = ids.map(id => position.get(id)!.x);
    const shift = (contentLeft(degree) + contentRight(degree)) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
    for (const id of ids) position.get(id)!.x += shift;
  }
  const innermostBottom = lastBottom + PAD_BOTTOM;
  for (const frame of frames) frame.height = innermostBottom + (deepest - frame.degree) * PAD_BOTTOM - frame.y;

  const labels: HouseLabel[] = houses.map((house, houseIndex) => {
    const at = position.get(house.chimney ?? placeholderId(houseIndex, houseSlots(house)[0]))!;
    return { index: houseIndex, label: `Law ${houseIndex + 1}`, title: dictionary.lawTitles?.[houseIndex], x: at.x - NODE.width / 2 - PX, y: at.y - NODE.height / 2 + 12 };
  });

  const placeholders: ScenePlaceholder[] = groups.flatMap(group => group.items.filter(item => item.placeholder).map(item => {
    const role = item.id.split('-')[1];
    return { id: item.id, label: `${role === 'wall' ? 'Wall' : 'Chimney'} not written`, ...position.get(item.id)!, ...NODE };
  }));

  const roles = new Map<string, string[]>();
  const cornerOf = new Map<string, Set<string>>();
  houses.forEach((house, houseIndex) => {
    for (const slot of houseSlots(house)) if (slot.id !== null) {
      roles.set(slot.id, [...(roles.get(slot.id) ?? []), `${roleWord[slot.role]} of law ${houseIndex + 1}`]);
      if (slot.role === 'triplet') cornerOf.set(slot.id, new Set([...(cornerOf.get(slot.id) ?? []), ...houseHeadwords(house)]));
    }
  });
  const firstOf = new Map<string, string>();
  for (const definition of definitions) if (!firstOf.has(definition.headword)) firstOf.set(definition.headword, definition.id);
  const nodes: SceneNode[] = definitions.filter(definition => position.has(definition.id)).map(definition => ({
    id: definition.id, entryId: definition.headword, sourceId: definition.id, label: definition.headword, caption: definition.id,
    entry: dictionary.entries.find(entry => entry.id === definition.headword), roles: roles.get(definition.id)?.join(', '),
    occurrence: false, flattened: false, visible: true, ...position.get(definition.id)!, ...NODE,
    active: !!step?.relatedEntryIds.includes(definition.headword),
    start: definition.headword === history.startEntryId && firstOf.get(definition.headword) === definition.id,
    selected: selectedSourceId ? definition.id === selectedSourceId : definition.headword === selectedId,
    given: firstOf.get(definition.headword) === definition.id ? [...history.boundInputs.values()].find(input => input.to === definition.headword)?.value : undefined,
  }));
  const selectedIds = new Set(nodes.filter(node => node.selected).map(node => node.id));

  // The house: roof from the triplet's references, chimney and walls from same-headword pairs.
  // When two laws share an entry pair, their common link is drawn once.
  const houseLinks: HouseLink[] = [];
  const byKey = new Map<string, HouseLink>();
  houses.forEach((house, houseIndex) => {
    const slots = houseSlots(house);
    const point = (slot: Slot) => position.get(slot.id ?? placeholderId(houseIndex, slot))!;
    const connected = slots.some(slot => slot.id !== null && selectedIds.has(slot.id));
    const add = (kind: HouseLink['kind'], a: Slot, b: Slot) => {
      const id = [a.id ?? placeholderId(houseIndex, a), b.id ?? placeholderId(houseIndex, b)].sort().join('|');
      const existing = byKey.get(id);
      if (existing) { existing.connected ||= connected; return; }
      const link: HouseLink = { id, house: houseIndex, kind, source: point(a), target: point(b), unwritten: a.id === null || b.id === null, connected };
      byKey.set(id, link);
      houseLinks.push(link);
    };
    const [chimney, apex, leftCorner, rightCorner, leftWall, rightWall] = slots;
    add('roof', apex, leftCorner); add('roof', apex, rightCorner); add('roof', leftCorner, rightCorner);
    add('chimney', chimney, apex); add('wall', leftCorner, leftWall); add('wall', rightCorner, rightWall);
  });

  const byHeadword = new Map<string, SceneNode[]>();
  for (const node of nodes) byHeadword.set(node.entryId, [...(byHeadword.get(node.entryId) ?? []), node]);
  const nearest = (from: { x: number; y: number }, headword: string) => [...(byHeadword.get(headword) ?? [])].sort((a, b) => distance(from, a) - distance(from, b))[0];
  const referencesOf = new Map(definitions.map(definition => [definition.id, definition.references]));

  // Other references: from an entry to the nearest entry of the headword it refers to.
  // References between the corners of one law are the roof, drawn above.
  const edges: SceneEdge[] = nodes.flatMap(source => (referencesOf.get(source.id) ?? []).flatMap(headword => {
    if (headword === source.entryId || cornerOf.get(source.id)?.has(headword)) return [];
    const target = nearest(source, headword);
    return target ? [{ id: edgeId(source.id, headword), source, target, traversed: false, current: false, bound: false, currentInput: false,
      connected: source.selected || headword === selectedId, reciprocal: !!referencesOf.get(target.id)?.includes(source.entryId) }] : [];
  })).sort((a, b) => Number(a.connected) - Number(b.connected));

  // A recorded trace names headwords, not entries, so its path is drawn between the closest entries of each pair.
  const closestPair = (from: string, to: string) => (byHeadword.get(from) ?? []).flatMap(a => (byHeadword.get(to) ?? []).map(b => ({ a, b }))).sort((p, q) => distance(p.a, p.b) - distance(q.a, q.b))[0];
  const links: SceneLink[] = [];
  const addLink = (from: string, to: string, kind: 'traversed' | 'bound') => {
    const pair = closestPair(from, to);
    if (!pair || links.some(link => link.id === `${kind}:${edgeId(from, to)}`)) return;
    links.push({ id: `${kind}:${edgeId(from, to)}`, source: pair.a, target: pair.b, traversed: kind === 'traversed', bound: kind === 'bound',
      current: kind === 'traversed' && !!step?.traversedEdges?.some(edge => edge.from === from && edge.to === to),
      currentInput: kind === 'bound' && !!step?.boundInputs?.some(input => input.from === from && input.to === to) });
  };
  for (const item of trace?.steps.slice(0, index + 1) ?? []) for (const edge of item.traversedEdges ?? []) addLink(edge.from, edge.to, 'traversed');
  for (const input of history.boundInputs.values()) addLink(input.from, input.to, 'bound');

  // Self-label occurrences sit in a gutter to the right of the frames, level with the entry they came from.
  const occurrenceX = LEFT + width + GUTTER + 107;
  let previousY = -Infinity;
  const occurrences: SceneNode[] = (trace?.occurrences ?? [])
    .map(occurrence => ({ occurrence, parent: [...(byHeadword.get(occurrence.parentEntryId) ?? [])].sort((a, b) => b.y - a.y)[0] }))
    .sort((a, b) => (a.parent?.y ?? 0) - (b.parent?.y ?? 0))
    .map(({ occurrence, parent }) => {
      const state = history.occurrences.find(item => item.id === occurrence.id);
      const y = Math.max(parent?.y ?? TOP + 48, previousY + 112);
      previousY = y;
      return { id: occurrence.id, entryId: occurrence.entryId, label: occurrence.entryId, caption: occurrence.label,
        occurrence: true, flattened: state?.flattened ?? false, visible: !!state, start: false, selected: false,
        active: step?.id === occurrence.appearsAt || step?.id === occurrence.flattenedAt,
        x: occurrenceX, y, width: 214, height: 96, parent: parent ? { x: parent.x, y: parent.y } : undefined };
    });

  const involved = new Set([history.startEntryId, ...(step?.relatedEntryIds ?? []),
    ...(trace?.steps.slice(0, index + 1) ?? []).flatMap(item => (item.traversedEdges ?? []).flatMap(edge => [edge.from, edge.to])),
    ...[...history.boundInputs.values()].flatMap(input => [input.from, input.to])]);
  const focusNodes = [...nodes.filter(node => trace ? involved.has(node.entryId) || node.selected : node.selected), ...occurrences.filter(node => node.visible)];
  const all = surrounding([...nodes, ...occurrences]);
  const bounds: Bounds = { x: 0, y: 0, width: Math.max(LEFT + width + LEFT, all.x + all.width + LEFT), height: Math.max(frames[0].y + frames[0].height, all.y + all.height) + TOP };
  return { nodes, occurrences, edges, history, houseLabels: labels, frames, houseLinks, placeholders, links, focusBounds: surrounding(focusNodes.length ? focusNodes : nodes), bounds };
}
