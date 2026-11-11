import type { Dictionary } from './data/dictionaries.ts';
import type { PreparedTrace } from './data/traces.ts';
import type { Bounds, HouseShape, SceneBand, SceneEdge, SceneLink, SceneNode, ScenePlaceholder } from './graphScene.ts';
import { surrounding } from './graphScene.ts';
import { edgeId, traceGraphState } from './traceGraph.ts';
import type { House, HouseRole } from './houses.ts';
import { houseHeadwords } from './houses.ts';

/**
 * The law-structure layout. Every definition is one node. Each law is drawn as a house:
 *
 *        [chimney]            the old word's earlier entry
 *        [corner A]           roof: the triplet, old word at the top
 *   [corner B] [corner C]
 *   [wall B]   [wall C]       body: the new words' later entries
 *
 * So each headword of a law is a vertical pair. Definitions outside every law sit in a
 * band on top (degree 0) or under the houses of their degree. Houses stand in columns by degree.
 */
export const NODE = { width: 172, height: 64 };
const PX = 100, PY = 84, EDGE = 28, EDGE_Y = 18, GRID_X = NODE.width + 14, GRID_Y = NODE.height + 16;
const LEFT = 30, TOP = 26, COLUMN_GAP = 44, CLUSTER_GAP = 34;

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

const clusterWidth = (cluster: HouseCluster) => (cluster.max.col - cluster.min.col) * PX + NODE.width + 2 * EDGE;
const clusterHeight = (cluster: HouseCluster) => (cluster.max.row - cluster.min.row) * PY + NODE.height + 2 * EDGE_Y;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const roleWord: Record<HouseRole, string> = { chimney: 'chimney', triplet: 'triplet corner', wall: 'wall' };

export function createLawScene(dictionary: Dictionary, selectedId: string, selectedSourceId: string | null, trace: PreparedTrace | undefined, index: number) {
  const houses = dictionary.houses ?? [];
  const definitions = dictionary.structure?.definitions ?? [];
  const headwordDegrees = dictionary.structure?.headwordDegrees ?? {};
  const history = traceGraphState(trace, index);
  const step = trace?.steps[index];
  const clusters = clusterHouses(houses);
  const lawHeadwords = new Set(houses.flatMap(houseHeadwords));
  const loose = definitions.filter(definition => !lawHeadwords.has(definition.headword));
  const looseAt = (degree: number) => loose.filter(definition => (headwordDegrees[definition.headword] ?? 0) === degree);
  const degrees = [...new Set([...clusters.map(cluster => cluster.degree), ...loose.map(definition => headwordDegrees[definition.headword] ?? 0)])].filter(degree => degree > 0).sort((a, b) => a - b);

  // Columns for degree 1 and up: their houses stacked, then their loose definitions.
  const columns = degrees.map(degree => {
    const own = clusters.filter(cluster => cluster.degree === degree);
    const extra = looseAt(degree);
    const width = Math.max(GRID_X + 14, ...own.map(clusterWidth));
    const perRow = Math.max(1, Math.floor((width + 14) / GRID_X));
    return { degree, own, extra, width, perRow };
  });
  const columnsWidth = columns.reduce((total, column) => total + column.width, 0) + COLUMN_GAP * Math.max(0, columns.length - 1);
  const ground = looseAt(0);
  const groundPerRow = Math.max(3, Math.min(ground.length || 3, Math.floor((columnsWidth + 14) / GRID_X)));
  const groundWidth = groundPerRow * GRID_X - 14;
  const contentWidth = Math.max(columnsWidth, ground.length ? groundWidth : 0);

  const position = new Map<string, { x: number; y: number }>();
  const bands: SceneBand[] = [];
  const shapes: HouseShape[] = [];
  const placeholders: ScenePlaceholder[] = [];
  let y = TOP;
  if (ground.length) {
    bands.push({ label: 'Degree 0', note: 'Groundwork: defined without any law', x: LEFT, y: y + 12, width: contentWidth });
    const left = LEFT + (contentWidth - groundWidth) / 2;
    ground.forEach((definition, place) => position.set(definition.id, { x: left + NODE.width / 2 + (place % groundPerRow) * GRID_X, y: y + 34 + NODE.height / 2 + Math.floor(place / groundPerRow) * GRID_Y }));
    y += 34 + Math.ceil(ground.length / groundPerRow) * GRID_Y + 18;
  }
  const columnsTop = y;
  let x = LEFT + (contentWidth - columnsWidth) / 2;
  let bottom = columnsTop;
  const columnEnds: { left: number; right: number; bottom: number }[] = [];
  for (const column of columns) {
    bands.push({ label: `Degree ${column.degree}`, note: column.degree === 1 ? 'Laws standing on groundwork only' : `Stands on degree ${column.degree - 1}`, x, y: columnsTop + 12, width: column.width });
    let cursor = columnsTop + 30;
    for (const cluster of column.own) {
      const left = x + (column.width - clusterWidth(cluster)) / 2;
      const at = (cell: Cell) => ({ x: left + EDGE + NODE.width / 2 + (cell.col - cluster.min.col) * PX, y: cursor + EDGE_Y + NODE.height / 2 + (cell.row - cluster.min.row) * PY });
      for (const [id, cell] of cluster.cells) position.set(id, at(cell));
      for (const { index: houseIndex, origin } of cluster.houses) {
        const top = at(origin), half = NODE.width / 2, yA = top.y + PY, yE = top.y + 2 * PY;
        const roofTop = yA - NODE.height / 2 - 12, roofBottom = yE + NODE.height / 2 + 10;
        shapes.push({
          index: houseIndex, label: `Law ${houseIndex + 1}`, title: dictionary.lawTitles?.[houseIndex],
          roof: [[top.x - half - 12, roofTop], [top.x + half + 12, roofTop], [top.x + PX + half + 20, roofBottom], [top.x - PX - half - 20, roofBottom]].map(point => point.join(',')).join(' '),
          body: { x: top.x - PX - half - 12, y: roofBottom, width: 2 * PX + NODE.width + 24, height: PY + 4 },
          stack: { x: top.x - half - 8, y: top.y - NODE.height / 2 - 8, width: NODE.width + 16, height: roofTop - (top.y - NODE.height / 2 - 8) },
          labelAt: { x: top.x - PX - half - 20, y: top.y - NODE.height / 2 + 6 },
        });
        for (const slot of houseSlots(houses[houseIndex])) if (slot.id === null) {
          const point = at({ col: origin.col + slot.col, row: origin.row + slot.row });
          placeholders.push({ id: `${houseIndex}-${slot.role}-${slot.headword}`, label: `${slot.role === 'wall' ? 'Wall' : 'Chimney'} not written`, x: point.x, y: point.y, ...NODE });
        }
      }
      cursor += clusterHeight(cluster) + CLUSTER_GAP;
    }
    const gridLeft = x + (column.width - (Math.min(column.perRow, Math.max(1, column.extra.length)) * GRID_X - 14)) / 2;
    column.extra.forEach((definition, place) => position.set(definition.id, { x: gridLeft + NODE.width / 2 + (place % column.perRow) * GRID_X, y: cursor + NODE.height / 2 + Math.floor(place / column.perRow) * GRID_Y }));
    cursor += Math.ceil(column.extra.length / column.perRow) * GRID_Y;
    bottom = Math.max(bottom, cursor);
    columnEnds.push({ left: x, right: x + column.width, bottom: cursor });
    x += column.width + COLUMN_GAP;
  }

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
  const byHeadword = new Map<string, SceneNode[]>();
  for (const node of nodes) byHeadword.set(node.entryId, [...(byHeadword.get(node.entryId) ?? []), node]);
  const nearest = (from: { x: number; y: number }, headword: string) => [...(byHeadword.get(headword) ?? [])].sort((a, b) => distance(from, a) - distance(from, b))[0];
  const referencesOf = new Map(definitions.map(definition => [definition.id, definition.references]));

  // A reference is to a headword. Its line ends at the nearest entry of that headword.
  // References between the three corners of one law are not drawn: the roof shows them.
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

  const worldWidth = contentWidth + 2 * LEFT;
  // A self-label occurrence sits under the column of the entry it came from, so following a trace stays close.
  const stacked = new Map<number, number>();
  const occurrences: SceneNode[] = (trace?.occurrences ?? []).map((occurrence, place, all) => {
    const state = history.occurrences.find(item => item.id === occurrence.id);
    const parent = [...(byHeadword.get(occurrence.parentEntryId) ?? [])].sort((a, b) => b.y - a.y)[0];
    const column = parent ? columnEnds.findIndex(range => parent.x >= range.left && parent.x <= range.right) : -1;
    const order = stacked.get(column) ?? 0;
    stacked.set(column, order + 1);
    const point = parent && column >= 0 ? { x: parent.x, y: columnEnds[column].bottom + 70 + order * 112 }
      : { x: worldWidth / 2 + (place - (all.length - 1) / 2) * 238, y: bottom + 76 };
    return { id: occurrence.id, entryId: occurrence.entryId, label: occurrence.entryId, caption: occurrence.label,
      occurrence: true, flattened: state?.flattened ?? false, visible: !!state, start: false, selected: false,
      active: step?.id === occurrence.appearsAt || step?.id === occurrence.flattenedAt,
      ...point, width: 214, height: 96, parent: parent ? { x: parent.x, y: parent.y } : undefined };
  });

  const involved = new Set([history.startEntryId, ...(step?.relatedEntryIds ?? []),
    ...(trace?.steps.slice(0, index + 1) ?? []).flatMap(item => (item.traversedEdges ?? []).flatMap(edge => [edge.from, edge.to])),
    ...[...history.boundInputs.values()].flatMap(input => [input.from, input.to])]);
  const focusNodes = [...nodes.filter(node => trace ? involved.has(node.entryId) || node.selected : node.selected), ...occurrences.filter(node => node.visible)];
  const all = surrounding([...nodes, ...occurrences]);
  const bounds: Bounds = { x: 0, y: 0, width: Math.max(worldWidth, all.x + all.width + LEFT), height: Math.max(bottom, all.y + all.height) + 30 };
  return { nodes, occurrences, edges, history, houses: shapes, bands, placeholders, links, focusBounds: surrounding(focusNodes.length ? focusNodes : nodes), bounds };
}
