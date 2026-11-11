/**
 * The explanation section's text. Each idea is drawn from a note in VD-docs, linked at a fixed
 * commit so the link keeps showing the text the summary was written from. Examples are taken
 * from those notes; nothing here is a new theory claim.
 */
const VD_DOCS = 'https://github.com/canvalidk/VD-docs/blob/543df65d3cd81a5890416c6cba73ef5296d1fd80/';

export type ExplanationAction =
  | { kind: 'dictionary'; label: string; dictionaryId: string }
  | { kind: 'trace'; label: string; dictionaryId: string; traceId: string }
  | { kind: 'correction'; label: string };

export interface Idea {
  id: string;
  title: string;
  paragraphs: string[];
  source: { title: string; url: string };
  action?: ExplanationAction;
}

export const lead = 'Write a scientific theory as a dictionary, and you can see exactly what it says, what accepting it commits you to, and when a failed prediction really counts against it.';

export const ideas: Idea[] = [
  {
    id: 'meaning',
    title: 'Meaning is what words do',
    paragraphs: [
      'A person who wants to leave sees an exit sign and walks towards it. That effect, on the people who notice the sign, is its meaning. Whether the exit is really there is its accuracy.',
      'Bolt the door and the sign means just the same. The dictionary is built on keeping the two apart.',
    ],
    source: { title: 'Definition and meaning in the Valid Dictionary', url: `${VD_DOCS}Theory/definition_and_meaning/definition_and_meaning_in_the_valid_dictionary_2026-11-10.md` },
  },
  {
    id: 'authority',
    title: 'Every claim names its dictionary',
    paragraphs: [
      'An Authority Dictionary is a named list of entries. Each entry pairs a headword with an exact string. Entries are added and never changed.',
      'A definition is simply the string the named dictionary gives, so every claim made with it ends “according to” that dictionary. Ordinary usage is a dictionary too. Its name is “convention”.',
    ],
    source: { title: 'Definition and meaning in the Valid Dictionary', url: `${VD_DOCS}Theory/definition_and_meaning/definition_and_meaning_in_the_valid_dictionary_2026-11-10.md` },
    action: { kind: 'dictionary', label: 'Browse a Newton draft', dictionaryId: 'newton-current' },
  },
  {
    id: 'commitments',
    title: 'Accepting a statement commits you to more',
    paragraphs: [
      'Accept that B exerts a gravitational force on A, and you have also accepted that both have mass and that A pulls back on B. Nobody had to ask.',
      'Following the entries from a starting statement is called a trace, and a trace should find commitments like these. When a physicist names one that no trace reaches, that is where the dictionary needs work. The Newton drafts here have no gravity entry yet, so their traces cannot reach these.',
    ],
    source: { title: 'Theory logical structure', url: `${VD_DOCS}Theory/theory_logical_structure/THEORY_LOGICAL_STRUCTURE_2026-11-05.md` },
    action: { kind: 'trace', label: 'Watch a recorded trace', dictionaryId: 'newton-operational', traceId: 'newton-ii-recorded' },
  },
  {
    id: 'law',
    title: 'A law is three words that define each other',
    paragraphs: [
      'In the dictionary, a physical law is three headwords, each defined by the other two. One of the three already had a definition. The other two are born in the law.',
      'Three more entries tie the law to the rest of the dictionary, six in all: a law-house. The current Newton draft has two. The first has all six entries. The second is still missing one.',
    ],
    source: { title: 'The VD law-house foundation', url: `${VD_DOCS}Core/VD_LAW_HOUSE_FOUNDATION.md` },
    action: { kind: 'dictionary', label: 'See the two laws', dictionaryId: 'newton-current' },
  },
  {
    id: 'hypothesis-set',
    title: 'A theory never predicts a bare outcome',
    paragraphs: [
      'A derivation rests on commitments: the inputs were right, no force was left out, every step was done correctly. So what a theory says is “this answer, or one of those commitments failed”. That list is the derivation’s hypothesis set.',
      'When Uranus strayed from its predicted path, one member was “an unseen planet is pulling on it”. Le Verrier worked out where that planet had to be, and in 1846 Neptune was found close to the place he gave.',
      'The theory is acquitted as soon as one member holds, and convicted only when every member has been ruled out. Acquittal is not support. A found mistake is a member too, so correcting it makes a new derivation; it does not rewrite the old one.',
    ],
    source: { title: 'Where does the theory say to look? (draft paper)', url: `${VD_DOCS}Theory/_note_hypothesis_set_paper/hypothesis_set_paper_d4.md` },
    action: { kind: 'correction', label: 'Try the correction example' },
  },
];

export const explorerNotes = [
  'Pick a dictionary to browse its entries. A headword can have more than one definition.',
  'Where a dictionary has laws, the network draws each one as a house and arranges everything by degree. Lines are references between entries, not physical causes.',
  'Traces replay step by step, at your pace. Recorded runs and prepared demonstrations are labelled. The site never runs the engine itself.',
];
export const status = 'Work in progress. The dictionaries shown are drafts.';
