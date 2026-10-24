import source from './correction-source.json' with { type: 'json' };
import type { Dictionary } from './dictionaries.ts';
import type { PreparedTrace } from './traces.ts';
import type { PredictionSnapshot } from '../predictions.ts';

export const correctionSource = source;
export const correctionDictionary: Dictionary = {
  id: 'parameterized-correction', name: 'Force · mistake and correction', shortName: 'Correction',
  status: 'VDfirst · SCRIPTED RESPONSES',
  description: 'Three parameterized definitions. One calculation reopened, with its history retained.',
  source: 'VDfirst · correction_demo.py · 0f1a89d',
  entries: source.dictionary.entries.map(([id, definition], index) => ({
    id, definition, sourceId: `E${index}`, x: 50, y: 25 + index * 25,
    // Explicit references supplied by the producer, never parsed from result text.
    references: index === 0 ? ['mass_p', 'acceleration_p_t'] : [],
  })),
};
const stepIds = ['inputs', 'mistake', 'report', 'reopened', 'corrected'];
export const correctionTrace: PreparedTrace = {
  id: 'force-correction', dictionaryId: correctionDictionary.id,
  title: 'Force · a mistake and its correction', kind: 'recorded', scriptedResponses: source.scripted_responses,
  startEntryId: 'force_p_t',
  question: 'For cart at time 0, supply mass 2 kg and acceleration 5 m/s². Follow the recorded calculation and its correction.',
  provenance: 'Five frozen snapshots exported by VDfirst correction_demo.py at 0f1a89d. Real trace operations with scripted interpreter responses, including the deliberate 12 N mistake. Playback does not execute or check the calculation.',
  steps: source.stages.map((stage, index) => ({
    id: stepIds[index], title: stage.title,
    snapshotLabel: ['Inputs', 'Mistake', 'Report', 'Reopen', 'Correction'][index],
    operation: index === 0 ? 'Input' : index === 3 ? 'Reopen' : 'Reduce',
    description: stage.description, context: 'force_cart_0 · root',
    relatedEntryIds: ['force_p_t', 'mass_p', 'acceleration_p_t'],
    fragment: [{ text: stage.prediction_set.result }], settled: stage.prediction_set.trace_complete,
    predictionSet: stage.prediction_set as PredictionSnapshot,
    ...(index === 0 ? { boundInputs: [
      { from: 'force_p_t', to: 'mass_p', value: '2 kg' },
      { from: 'force_p_t', to: 'acceleration_p_t', value: '5 m/s^2' },
    ] } : {}),
  })),
};
