import source from './correction-source.json' with { type: 'json' };
import type { Dictionary } from './dictionaries.ts';
import type { PreparedTrace } from './traces.ts';
import type { PredictionSnapshot } from '../predictions.ts';

export const correctionSource = source;
export const correctionDictionary: Dictionary = {
  id: 'parameterized-correction', name: 'Force · mistake and correction', shortName: 'Correction',
  status: 'VDfirst · SCRIPTED RESPONSES',
  description: 'Three parameterized definitions. One derivation with a mistake in it, and a new derivation that corrects it.',
  source: 'VDfirst · correction_demo.py · 0f1a89d',
  entries: source.dictionary.entries.map(([id, definition], index) => ({
    id, definition, sourceId: `E${index}`, x: 50, y: 25 + index * 25,
    // Explicit references supplied by the producer, never parsed from result text.
    references: index === 0 ? ['mass_p', 'acceleration_p_t'] : [],
  })),
};
/**
 * Display labels and narration written by this site. The export's own stage titles and
 * descriptions stay unchanged in correction-source.json.
 *
 * Reading (hypothesis-set paper d4, section 3): a derivation as issued is fixed. A found
 * mistake is a held member of its hypothesis set, so that derivation cannot count against
 * the dictionary. The corrected derivation is a new one with its own commitments. The 12 N
 * mistake is declared by the script; the site does not check it.
 */
const stages = [
  { id: 'inputs', derivationId: 'issued', label: 'Inputs', title: 'Inputs supplied', operation: 'Input',
    description: 'Derivation 1 starts. The call supplies cart and time 0 to both demands, and the interpreter supplies 2 kg and 5 m/s^2. Each supplied input is a commitment of the derivation (P2, P3).' },
  { id: 'calculation', derivationId: 'issued', label: 'Calculation', title: 'Calculation recorded: 12 N', operation: 'Reduce',
    description: 'The scripted interpreter reduces 2 kg times 5 m/s^2 to 12 N. That substitution is a further commitment (P4).' },
  { id: 'issued', derivationId: 'issued', label: 'Answer', title: 'Derivation 1 issued', operation: 'Reduce',
    description: 'The report rewords 12 N as Prediction: 12 N (P5). Derivation 1 is issued, resting on P2 to P5. Its record is now fixed.' },
  { id: 'reopened', derivationId: 'corrected', label: 'Reopened', title: 'Reopened as derivation 2', operation: 'Reopen',
    description: 'The script reports P4 as a mistake: 2 kg times 5 m/s^2 is not 12 N. A found mistake is a held member of derivation 1\'s hypothesis set, so derivation 1 cannot count against the dictionary: it never linked the dictionary to 12 N. Its record stays as issued. Derivation 2 starts from the same inputs, with the calculation open again.' },
  { id: 'corrected', derivationId: 'corrected', label: 'Answer', title: 'Derivation 2 issued', operation: 'Reduce',
    description: 'Derivation 2 reduces the product to 10 N and reports Prediction: 10 N. It is a new derivation with its own commitments (P2, P3, P7, P8), not derivation 1 repaired.' },
] as const;
export const correctionTrace: PreparedTrace = {
  id: 'force-correction', dictionaryId: correctionDictionary.id,
  title: 'Force · a mistake and its correction', kind: 'recorded', scriptedResponses: source.scripted_responses,
  startEntryId: 'force_p_t',
  question: 'For cart at time 0, supply mass 2 kg and acceleration 5 m/s². Follow the derivation that reached 12 N, then the new derivation that reached 10 N.',
  provenance: 'Five frozen snapshots exported by VDfirst correction_demo.py at 0f1a89d. Real trace operations with scripted interpreter responses, including the deliberate 12 N mistake. Playback does not execute or check the calculation. Stage labels and narration are written by this site; the derivation grouping is its reading of the export.',
  derivations: [
    { id: 'issued', label: 'Derivation 1',
      outcome: 'The script reports P4 as a mistake. A found mistake is a held member of the hypothesis set, so this derivation cannot count against the dictionary. Its record stays as issued.' },
    { id: 'corrected', label: 'Derivation 2' },
  ],
  steps: source.stages.map((stage, index) => ({
    id: stages[index].id, title: stages[index].title, derivationId: stages[index].derivationId,
    snapshotLabel: stages[index].label,
    operation: stages[index].operation,
    description: stages[index].description, context: 'force_cart_0 · root',
    relatedEntryIds: ['force_p_t', 'mass_p', 'acceleration_p_t'],
    fragment: [{ text: stage.prediction_set.result }], settled: stage.prediction_set.trace_complete,
    predictionSet: stage.prediction_set as PredictionSnapshot,
    ...(index === 0 ? { boundInputs: [
      { from: 'force_p_t', to: 'mass_p', value: '2 kg' },
      { from: 'force_p_t', to: 'acceleration_p_t', value: '5 m/s^2' },
    ] } : {}),
  })),
};
