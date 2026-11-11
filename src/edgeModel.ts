import type { Dictionary } from './data/dictionaries.ts';
import type { HouseRole } from './houses.ts';
import { entryRoles, houseStatus } from './houses.ts';

/**
 * The Edge's data: one stroke per entry, left to right in the order the entries were added.
 * Pure, so it can be tested without a DOM. Edge.tsx draws it.
 *
 * Stroke height and colour carry the role: groundwork and other entries are short and grey,
 * an entry for a headword defined again (chimney or wall) is medium and blue, an entry of
 * the law itself (a triplet corner, the roof) is full height and crimson. Entries a law still
 * needs have no place in the log, so they follow the end as dashed outlines.
 */
export type EdgeKind = 'ground' | 'again' | 'law';
export const EDGE_HEIGHT: Record<EdgeKind, number> = { ground: 10, again: 18, law: 28 };

export interface EdgeStroke {
  sourceId: string;
  headword: string;
  kind: EdgeKind;
  /** Every role the entry plays: one entry can be a wall of one law and a corner of the next. */
  roles: { house: number; role: HouseRole }[];
  /** "roof of Law 1", "groundwork", or empty when the dictionary has no structure. */
  roleText: string;
  /** The option's accessible name: "E2, uniform-motion, roof of Law 1". */
  label: string;
}
export interface EdgePlaceholder {
  house: number;
  role: HouseRole;
  headword: string;
  kind: EdgeKind;
  roleText: string;
  label: string;
}
export interface EdgeModel {
  strokes: EdgeStroke[];
  placeholders: EdgePlaceholder[];
  /** True only where an engine export records the order of appending. Otherwise the order is as listed. */
  chronological: boolean;
  first?: string;
  newest?: string;
  listLabel: string;
  caption: string;
  placeholderNote?: string;
}

const roleWord: Record<HouseRole, string> = { chimney: 'chimney', triplet: 'roof', wall: 'wall' };
const kindOf = (roles: { role: HouseRole }[]): EdgeKind =>
  roles.some(item => item.role === 'triplet') ? 'law' : roles.length ? 'again' : 'ground';

/** "roof of Law 4 and chimney of Law 5". */
export function roleText(roles: { house: number; role: HouseRole }[]): string {
  const parts = roles.map(item => `${roleWord[item.role]} of Law ${item.house + 1}`);
  return parts.length <= 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
}

/**
 * The order the Edge draws: the export's `definitions` where one exists (the engine's append order),
 * otherwise each headword's entry followed by its other entries, as listed.
 */
export function edgeOrder(dictionary: Dictionary): { sourceId: string; headword: string }[] {
  const exported = dictionary.structure?.definitions;
  if (exported?.length) return exported.map(item => ({ sourceId: item.id, headword: item.headword }));
  return dictionary.entries.flatMap(entry => [
    { sourceId: entry.sourceId, headword: entry.id },
    ...(entry.alternatives ?? []).map(alternative => ({ sourceId: alternative.sourceId, headword: entry.id })),
  ]);
}

export function edgeModel(dictionary: Dictionary): EdgeModel {
  const houses = dictionary.houses ?? [];
  const structured = !!dictionary.structure?.definitions.length;
  const degrees = dictionary.structure?.headwordDegrees ?? {};
  const strokes: EdgeStroke[] = edgeOrder(dictionary).map(({ sourceId, headword }) => {
    const roles = entryRoles(houses, sourceId);
    const degree = degrees[headword] ?? 0;
    const text = roles.length ? roleText(roles) : structured ? (degree === 0 ? 'groundwork' : `outside laws, degree ${degree}`) : '';
    return { sourceId, headword, kind: kindOf(roles), roles, roleText: text, label: [sourceId, headword, text].filter(Boolean).join(', ') };
  });
  const placeholders: EdgePlaceholder[] = houses.flatMap((house, index) => houseStatus(house).missing.map(missing => {
    const text = `${roleWord[missing.role]} of Law ${index + 1}`;
    return { house: index, role: missing.role, headword: missing.headword, kind: kindOf([missing]), roleText: text, label: `not written yet, ${missing.headword}, ${text}` };
  }));
  const chronological = structured;
  const first = strokes[0]?.sourceId;
  const newest = strokes.at(-1)?.sourceId;
  const span = strokes.length > 1 ? `, from ${first} to ${newest}` : '';
  return {
    strokes, placeholders, chronological, first, newest,
    listLabel: `Entries in the order ${chronological ? 'they were added' : 'listed'}: ${strokes.length}${span}`,
    caption: chronological
      ? 'Every entry, in the order it was added. Nothing is removed; the newest is on the right.'
      : 'Every entry, in the order listed.',
    placeholderNote: placeholders.length === 1
      ? 'The dashed outline after the end is an entry a law still needs; it is not written yet.'
      : placeholders.length
        ? `The dashed outlines after the end are ${placeholders.length} entries the laws still need; they are not written yet.`
      : undefined,
  };
}

/** Stroke widths and gaps, from the natural 8px stroke and 3px gap down to a 4px stroke and 1px gap. */
export const EDGE_SIZES = [
  { stroke: 8, gap: 3, apart: 12 },
  { stroke: 7, gap: 2, apart: 12 },
  { stroke: 6, gap: 2, apart: 10 },
  { stroke: 5, gap: 1, apart: 8 },
  { stroke: 4, gap: 1, apart: 8 },
] as const;
export type EdgeSize = (typeof EDGE_SIZES)[number];

/** The length of the Edge at one size: as long as the dictionary is thick, never stretched. */
export function edgeLength(strokes: number, placeholders: number, size: EdgeSize): number {
  const run = (n: number) => n ? n * size.stroke + (n - 1) * size.gap : 0;
  return run(strokes) + (placeholders ? size.apart + run(placeholders) : 0);
}

/** The largest size that fits the width; the smallest when nothing fits (the Edge then scrolls inside itself). */
export function edgeFit(strokes: number, placeholders: number, width: number | null): EdgeSize {
  if (width === null) return EDGE_SIZES[0];
  return EDGE_SIZES.find(size => edgeLength(strokes, placeholders, size) <= width) ?? EDGE_SIZES[EDGE_SIZES.length - 1];
}

/** Left x of every stroke, then of every placeholder. */
export function edgePositions(strokes: number, placeholders: number, size: EdgeSize) {
  const step = size.stroke + size.gap;
  const xs = Array.from({ length: strokes }, (_, index) => index * step);
  const start = strokes ? (strokes - 1) * step + size.stroke + size.apart : 0;
  const placeholderXs = Array.from({ length: placeholders }, (_, index) => start + index * step);
  return { xs, placeholderXs, step, length: edgeLength(strokes, placeholders, size) };
}

/** The item under an x position: the nearest stroke, or a placeholder once past the gap after the end. */
export function edgeHit(x: number, strokes: number, placeholders: number, size: EdgeSize): { kind: 'stroke' | 'placeholder'; index: number } | null {
  if (!strokes && !placeholders) return null;
  const { step, placeholderXs } = edgePositions(strokes, placeholders, size);
  const end = strokes ? (strokes - 1) * step + size.stroke : 0;
  if (placeholders && x > end + size.apart / 2) {
    const index = Math.round((x - placeholderXs[0] - size.stroke / 2) / step);
    return { kind: 'placeholder', index: Math.max(0, Math.min(placeholders - 1, index)) };
  }
  if (!strokes) return null;
  const index = Math.round((x - size.stroke / 2) / step);
  return { kind: 'stroke', index: Math.max(0, Math.min(strokes - 1, index)) };
}
