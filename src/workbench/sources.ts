import newtonCurrent from '../../docs/newton-current-source.json' with { type: 'json' };
import newtonOperational from '../../docs/newton-operational-source.json' with { type: 'json' };
import correction from '../data/correction-source.json' with { type: 'json' };
import { entryId } from './record.ts';
import type { BridgeDictionary, TraceRecord } from './record.ts';

/**
 * Dictionaries the Workshop can start a trace from: the exact text the site's other pages show,
 * in the order the engine added the entries. Writing and changing entries come later.
 */
export interface DoerSource {
  id: string;
  label: string;
  dictionary: BridgeDictionary;
  /** The source's own entry ids (K1, E7 ...), by engine index; the engine numbers entries from 0. */
  sourceIds: string[];
  /** A demand to start from when the source is chosen. */
  demand: string;
  context: string;
}

interface SourceExport { entries: { id: string; code_index: number; headword: string; definition: string }[] }
function fromExport(id: string, label: string, name: string, data: SourceExport, demand: string): DoerSource {
  const entries = [...data.entries].sort((a, b) => a.code_index - b.code_index);
  return {
    id, label, demand, context: '',
    dictionary: { name, entries: entries.map(entry => [entry.headword, entry.definition]) },
    sourceIds: entries.map(entry => entry.id),
  };
}

export const doerSources: DoerSource[] = [
  {
    id: 'correction', label: 'Force: mistake and correction (3 entries)', demand: 'force_cart_0',
    context: 'For cart at time 0: mass 2 kg, acceleration 5 m/s^2.',
    dictionary: { name: correction.dictionary.name, entries: correction.dictionary.entries.map(([headword, definition]) => [headword, definition]) },
    sourceIds: correction.dictionary.entries.map((_, index) => `E${index}`),
  },
  fromExport('newton-current', 'Newton, current draft (26 entries)', 'Newton current draft', newtonCurrent as SourceExport, 'net-force-material-object'),
  fromExport('newton-operational', 'Newton, operational snapshot (45 entries)', 'Newton operational snapshot', newtonOperational as SourceExport, 'net-force'),
];

const sameEntries = (source: DoerSource, record: TraceRecord) =>
  source.dictionary.entries.length === record.dictionary.entries.length
  && source.dictionary.entries.every(([headword, definition], i) =>
    record.dictionary.entries[i].headword === headword && record.dictionary.entries[i].definition === definition);

/** The bundled source a record was started from, if its dictionary is the same text in the same order. */
export const sourceOf = (record: TraceRecord) => doerSources.find(source => sameEntries(source, record));

/**
 * The doer names entries as the engine does (E0, E1, ...), because the engine's statements and errors
 * name them so. Where the record's dictionary is a bundled source, the source's own id is given beside it.
 */
export function sourceIdOf(record: TraceRecord): (index: number) => string | null {
  const source = sourceOf(record);
  return index => {
    const id = source?.sourceIds[index];
    return id && id !== entryId(index) ? id : null;
  };
}

/** Headwords of a source, for suggestions while typing a demand. Parameterised ones are listed as written. */
export const headwordsOf = (source: DoerSource) => [...new Set(source.dictionary.entries.map(([headword]) => headword))].sort();
