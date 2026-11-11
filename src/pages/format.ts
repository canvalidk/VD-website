import type { Dictionary } from '../data/dictionaries.ts';

const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** Small counts in words at the start of a sentence, digits otherwise. */
export const numberWord = (count: number) => words[count] ?? String(count);

/** Display names use commas, not middle dots: "Newtonian mechanics, current draft". */
export const dictionaryName = (dictionary: Pick<Dictionary, 'name'>) => dictionary.name.replace(/\s*·\s*/g, ', ');
export const traceTitle = (title: string) => title.replace(/\s*·\s*/g, ', ');

/** "26 entries under 21 headwords. Two laws." */
export function countSentence(dictionary: Dictionary): string {
  const entries = dictionary.definitionCount ?? dictionary.entries.reduce((total, entry) => total + 1 + (entry.alternatives?.length ?? 0), 0);
  const headwords = dictionary.entries.length;
  const laws = dictionary.houses?.length ?? 0;
  const first = `${entries} ${entries === 1 ? 'entry' : 'entries'} under ${headwords} ${headwords === 1 ? 'headword' : 'headwords'}.`;
  return dictionary.houses ? `${first} ${numberWord(laws)} ${laws === 1 ? 'law' : 'laws'}.` : first;
}
