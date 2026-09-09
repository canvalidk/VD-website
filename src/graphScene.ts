import type { Dictionary, Entry } from './data/dictionaries.ts';
import type { PreparedTrace } from './data/traces.ts';
import { edgeId, traceGraphState } from './traceGraph.ts';

export type GraphView = 'focused' | 'full';
export interface Bounds { x: number; y: number; width: number; height: number }
export interface SceneNode extends Bounds { id: string; entryId: string; label: string; caption: string; entry?: Entry; flattened: boolean; occurrence: boolean; visible: boolean; active: boolean; start: boolean; given?: string }

function surrounding(nodes: SceneNode[]): Bounds {
  if (!nodes.length) return { x: 0, y: 0, width: 1, height: 1 };
  const x = Math.min(...nodes.map(node => node.x - node.width / 2));
  const y = Math.min(...nodes.map(node => node.y - node.height / 2 - (node.start ? 24 : 0)));
  return { x, y, width: Math.max(...nodes.map(node => node.x + node.width / 2)) - x, height: Math.max(...nodes.map(node => node.y + node.height / 2)) - y };
}

/** Both views share the same trace history. Only background dictionary membership differs. */
export function createGraphScene(dictionary: Dictionary, selectedId: string, trace: PreparedTrace | undefined, index: number, view: GraphView) {
  const history = traceGraphState(trace, index);
  const step = trace?.steps[index];
  const traceIds = new Set(trace ? [history.startEntryId!, ...trace.steps.flatMap(item => [
    ...item.relatedEntryIds, ...item.fragment.flatMap(part => part.entryId ? [part.entryId] : []),
    ...(item.traversedEdges ?? []).flatMap(edge => [edge.from, edge.to]),
    ...(item.boundInputs ?? []).flatMap(input => [input.from, input.to]),
  ]), ...(trace.occurrences ?? []).flatMap(item => [item.entryId, item.parentEntryId])] : []);
  const selected = dictionary.entries.find(entry => entry.id === selectedId)!;
  const focusIds = trace ? new Set([...traceIds, selectedId]) : new Set([selectedId, ...selected.references,
    ...dictionary.entries.filter(entry => entry.references.includes(selectedId)).map(entry => entry.id)]);
  const included = dictionary.entries.filter(entry => view === 'full' || dictionary.entries.length <= 10 || focusIds.has(entry.id));
  const entries = trace ? [...included.filter(entry => traceIds.has(entry.id)), ...included.filter(entry => !traceIds.has(entry.id))] : included;
  const columns = entries.length > 12 ? 5 : Math.min(3, entries.length);
  const cellWidth = 206, cellHeight = 124, padding = 120;
  const traceCount = entries.filter(entry => traceIds.has(entry.id)).length;
  const traceRows = Math.ceil(traceCount / columns);
  const occurrenceColumns = Math.max(1, Math.min(columns, trace?.occurrences?.length ?? 0));
  const occurrenceRows = Math.ceil((trace?.occurrences?.length ?? 0) / occurrenceColumns);
  const width = Math.max(420, (columns - 1) * cellWidth + 2 * padding);
  const nodes: SceneNode[] = entries.map((entry, position) => {
    const background = occurrenceRows > 0 && position >= traceCount;
    const column = (background ? position - traceCount : position) % columns;
    const row = background ? traceRows + occurrenceRows + Math.floor((position - traceCount) / columns) : Math.floor(position / columns);
    return {
    id: entry.id, entryId: entry.id, label: entry.id, caption: entry.alternatives?.length ? (entry.alternatives.length + 1) + ' definitions' : entry.sourceId,
    entry, occurrence: false, flattened: false, visible: true, active: !!step?.relatedEntryIds.includes(entry.id), start: entry.id === history.startEntryId,
    x: columns === 1 ? width / 2 : padding + column * cellWidth, y: 104 + row * cellHeight + (background ? 30 : 0), width: 174, height: 96,
    given: [...history.boundInputs.values()].find(input => input.to === entry.id)?.value,
  }; });
  // Keep occurrence animations beside the trace, with the remaining dictionary below.
  const occurrenceStartY = 104 + traceRows * cellHeight + 30;
  const occurrences: SceneNode[] = (trace?.occurrences ?? []).map((occurrence, position) => {
    const state = history.occurrences.find(item => item.id === occurrence.id);
    return {
      id: occurrence.id, entryId: occurrence.entryId, label: occurrence.entryId, caption: occurrence.label,
      occurrence: true, flattened: state?.flattened ?? false, visible: !!state, start: false,
      active: step?.id === occurrence.appearsAt || step?.id === occurrence.flattenedAt,
      x: width / 2 + (position % occurrenceColumns - (occurrenceColumns - 1) / 2) * 238,
      y: occurrenceStartY + Math.floor(position / occurrenceColumns) * 120, width: 214, height: 96,
    };
  });
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = nodes.flatMap(source => source.entry!.references.filter(id => byId.has(id)).map(id => ({
    id: edgeId(source.id, id), source, target: byId.get(id)!, traversed: history.traversed.has(edgeId(source.id, id)),
    current: !!step?.traversedEdges?.some(edge => edge.from === source.id && edge.to === id),
    bound: history.boundInputs.has(edgeId(source.id, id)),
    currentInput: !!step?.boundInputs?.some(input => input.from === source.id && input.to === id),
  }))).sort((a, b) => Number(a.traversed || a.bound) - Number(b.traversed || b.bound));
  const currentIds = new Set([...(step?.relatedEntryIds ?? []),
    ...(step?.traversedEdges ?? []).flatMap(edge => [edge.from, edge.to]),
    ...(step?.boundInputs ?? []).flatMap(input => [input.from, input.to])]);
  // Include the complete highlighted history so following never crops a traversed edge or the start.
  const historyIds = new Set([history.startEntryId, selectedId, ...currentIds,
    ...edges.filter(edge => edge.traversed || edge.bound).flatMap(edge => [edge.source.id, edge.target.id])]);
  const focusNodes = [...nodes.filter(node => trace ? historyIds.has(node.id) : node.id === selectedId), ...occurrences.filter(node => node.visible)];
  const allBounds = surrounding([...nodes, ...occurrences]);
  return { nodes, occurrences, edges, history, focusBounds: surrounding(focusNodes),
    bounds: { x: 0, y: 0, width: Math.max(width, allBounds.x + allBounds.width + 30), height: allBounds.y + allBounds.height + 35 } };
}

export interface Camera { x: number; y: number; scale: number }
export interface Viewport { width: number; height: number }

export function fitCamera(bounds: Bounds, viewport: Viewport): Camera {
  const scale = Math.min(1.25, (viewport.width - 36) / Math.max(1, bounds.width), (viewport.height - 44) / Math.max(1, bounds.height));
  return { scale, x: (viewport.width - bounds.width * scale) / 2 - bounds.x * scale, y: (viewport.height - bounds.height * scale) / 2 - bounds.y * scale };
}

/** Preserve a manually chosen zoom when it already shows every animated element. */
export function keepTraceVisible(camera: Camera, bounds: Bounds, viewport: Viewport): Camera {
  const fitting = fitCamera(bounds, viewport);
  const scale = Math.min(camera.scale, fitting.scale);
  const minX = 18 - bounds.x * scale, maxX = viewport.width - 18 - (bounds.x + bounds.width) * scale;
  const minY = 22 - bounds.y * scale, maxY = viewport.height - 22 - (bounds.y + bounds.height) * scale;
  return { scale, x: Math.max(minX, Math.min(maxX, camera.x)), y: Math.max(minY, Math.min(maxY, camera.y)) };
}
