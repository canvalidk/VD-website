import type { Dictionary } from './data/dictionaries.ts';
import type { HousePart, HouseRole } from './houses.ts';
import { houseStatus } from './houses.ts';
import { houseSlots } from './lawScene.ts';

/**
 * The data behind the Introduction's figure: one law-house as six log lines, in the order the
 * dictionary added them, grouped under the rows of Laws as a table. Kept free of React so the
 * order and the roles can be tested.
 */
export type HomeGroup = 'before' | 'law' | 'after';
export const homeGroups: { key: HomeGroup; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'law', label: 'The law' },
  { key: 'after', label: 'After' },
];

const groupOf: Record<HouseRole, HomeGroup> = { chimney: 'before', triplet: 'law', wall: 'after' };
/** Roles in plain words, as the Introduction names them. */
export const homeRoleLabel: Record<HouseRole, string> = {
  chimney: "the old word's earlier entry, the chimney",
  triplet: 'roof',
  wall: "a new word's later entry, a wall",
};

export interface HomeLogLine {
  /** Stable key: the entry id, or a placeholder key when the entry is not written yet. */
  key: string;
  /** The entry id, or null when the dictionary does not have this entry yet. */
  id: string | null;
  headword: string;
  role: HouseRole;
  group: HomeGroup;
  roleLabel: string;
  /** Position in the house drawing, from houseSlots(). */
  col: number;
  row: number;
  /** The exact string as parts (headword occurrences marked), or null when not written yet. */
  parts: HousePart[] | null;
  /** Place in the dictionary's append log, or Infinity when not written yet. */
  order: number;
}

/** The house's six entries, grouped Before, The law, After, and in append order within each group. */
export function homeLog(dictionary: Dictionary, houseIndex: number): HomeLogLine[] {
  const house = dictionary.houses?.[houseIndex];
  if (!house) return [];
  const order = new Map((dictionary.structure?.definitions ?? []).map((definition, index) => [definition.id, index]));
  const lines = houseSlots(house).map(slot => ({
    key: slot.id ?? `${slot.role}-${slot.headword}`,
    id: slot.id,
    headword: slot.headword,
    role: slot.role,
    group: groupOf[slot.role],
    roleLabel: homeRoleLabel[slot.role],
    col: slot.col,
    row: slot.row,
    parts: slot.id === null ? null : house.entries[slot.id] ?? null,
    order: slot.id === null ? Infinity : order.get(slot.id) ?? Infinity,
  }));
  const rank = (group: HomeGroup) => homeGroups.findIndex(item => item.key === group);
  return lines.sort((a, b) => rank(a.group) - rank(b.group) || a.order - b.order);
}

/** The entry the figure opens on: the law entry of the first new word, whose string shows the roof. */
export function homeOpening(dictionary: Dictionary, houseIndex: number): string | null {
  const house = dictionary.houses?.[houseIndex];
  return house ? house.triplet[house.winters[0]] ?? null : null;
}

/** The other two law headwords: inside a law entry these occurrences are the roof. */
export function homeLawWords(dictionary: Dictionary, houseIndex: number, line: Pick<HomeLogLine, 'role' | 'headword'>): string[] {
  const house = dictionary.houses?.[houseIndex];
  if (!house || line.role !== 'triplet') return [];
  return [house.anchor, ...house.winters].filter(headword => headword !== line.headword);
}

const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
/** Another law of the dictionary that still lacks an entry, for the caption's pointer to it. */
export function homeIncompleteLaw(dictionary: Dictionary, houseIndex: number) {
  const houses = dictionary.houses ?? [];
  for (const [index, house] of houses.entries()) {
    if (index === houseIndex) continue;
    const status = houseStatus(house);
    if (!status.missing.length) continue;
    const first = status.missing[0];
    return {
      index,
      ordinal: ordinals[index] ?? `number ${index + 1}`,
      missing: status.missing.length,
      role: first.role,
      headword: first.headword,
      /** The law entry of the headword whose entry is missing: where the gap shows. */
      sourceId: house.triplet[first.headword] ?? '',
    };
  }
  return null;
}
