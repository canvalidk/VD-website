import type { Dictionary, Entry } from './data/dictionaries.ts';

/** One piece of a definition: plain residual text, or an occurrence of a headword. */
export interface HousePart { text: string; headword?: string; self?: boolean }
/**
 * A six-entry law-house as the VDfirst engine reports it. Entry ids are the source's own.
 * A null chimney or wall is an entry the dictionary does not have yet.
 */
export interface House {
  anchor: string;
  winters: string[];
  chimney: string | null;
  triplet: Record<string, string>;
  walls: Record<string, string | null>;
  entries: Record<string, HousePart[]>;
}
export type HouseRole = 'chimney' | 'triplet' | 'wall';
/** `undefined` marks a slot the house never has; `null` marks one that is not written yet. */
export interface HouseColumn { headword: string; born: boolean; before?: string | null; law: string; after?: string | null }

export const houseHeadwords = (house: House) => [house.anchor, ...house.winters];

/** Columns are the three headwords, the already-defined one first. */
export function houseColumns(house: House): HouseColumn[] {
  return [
    { headword: house.anchor, born: false, before: house.chimney, law: house.triplet[house.anchor] },
    ...house.winters.map(headword => ({ headword, born: true, law: house.triplet[headword], after: house.walls[headword] })),
  ];
}

export function houseStatus(house: House) {
  const missing = [
    ...(house.chimney === null ? [{ headword: house.anchor, role: 'chimney' as const }] : []),
    ...house.winters.filter(headword => house.walls[headword] === null).map(headword => ({ headword, role: 'wall' as const })),
  ];
  return { present: 6 - missing.length, total: 6, missing };
}

/** Every role a definition plays. One entry can be a wall of one house and a corner of the next. */
export function entryRoles(houses: House[], sourceId: string): { house: number; role: HouseRole }[] {
  return houses.flatMap((house, index) => [
    ...(house.chimney === sourceId ? [{ house: index, role: 'chimney' as const }] : []),
    ...(Object.values(house.triplet).includes(sourceId) ? [{ house: index, role: 'triplet' as const }] : []),
    ...(Object.values(house.walls).includes(sourceId) ? [{ house: index, role: 'wall' as const }] : []),
  ]);
}

/** The dictionary's headwords grouped by structure: groundwork outside every law, then each law. */
export function outline(dictionary: Dictionary): { groundwork: Entry[]; laws: { house: number; entries: Entry[] }[] } {
  const houses = dictionary.houses ?? [];
  const inLaw = new Set(houses.flatMap(houseHeadwords));
  const byId = new Map(dictionary.entries.map(entry => [entry.id, entry]));
  return {
    groundwork: dictionary.entries.filter(entry => !inLaw.has(entry.id)),
    laws: houses.map((house, index) => ({ house: index, entries: houseHeadwords(house).map(id => byId.get(id)!) })),
  };
}

const definitionReferences = (dictionary: Dictionary, sourceId: string) => {
  for (const entry of dictionary.entries) {
    if (entry.sourceId === sourceId) return entry.references;
    const alternative = entry.alternatives?.find(item => item.sourceId === sourceId);
    if (alternative) return alternative.references;
  }
  return [];
};
const houseEntryIds = (house: House) => [house.chimney, ...Object.values(house.triplet), ...Object.values(house.walls)].filter((id): id is string => id !== null);

/** Other laws whose entries use this law's headwords: where houses join. */
export function usedBy(dictionary: Dictionary, index: number): { house: number; headwords: string[] }[] {
  const houses = dictionary.houses ?? [];
  const own = houseHeadwords(houses[index]);
  return houses.flatMap((other, otherIndex) => {
    if (otherIndex === index) return [];
    const used = new Set([...houseHeadwords(other), ...houseEntryIds(other).flatMap(id => definitionReferences(dictionary, id))]);
    const headwords = own.filter(headword => used.has(headword));
    return headwords.length ? [{ house: otherIndex, headwords }] : [];
  });
}

export const lawLabel = (dictionary: Dictionary, index: number) => `Law ${index + 1}${dictionary.lawTitles?.[index] ? ` · ${dictionary.lawTitles[index]}` : ''}`;
