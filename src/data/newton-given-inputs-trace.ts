import type { FragmentPart, PreparedTrace } from './traces';

const text = (value: string): FragmentPart => ({ text: value });
const ref = (entryId: string): FragmentPart => ({ entryId });
function law(particle: boolean, flattened: boolean, force: boolean, mass: boolean): FragmentPart[] {
  return [text('For a '), particle ? text('p1') : ref('point-particle'), text(', '),
    flattened ? text('inertial-acceleration') : ref('inertial-acceleration'), text(' equals '),
    force ? text('(6,0,0) N') : ref('net-force'), text(' divided by '),
    mass ? text('2 kg') : ref('inertial-mass'), text(': a = F/m.')];
}

export const newtonGivenInputsTrace: PreparedTrace = {
  id: 'newton-ii-given-inputs', dictionaryId: 'newton-operational', title: 'Newton II · given inputs',
  kind: 'recorded', startEntryId: 'inertial-acceleration',
  question: "In an inertial frame R at instant t0, point particle p1 has inertial mass 2 kg and net force (6, 0, 0) N. What is p1's acceleration?",
  provenance: 'Condensed playback of the 9 September 2026 VD-Newton recorded transcript, newton_second_law_given_inputs_trace.txt, using the 45-entry operational dictionary. The question supplies p1, the frame, net force and mass. The interpreter selects E21, binds the inputs and supplies the arithmetic reduction. Source commit: 7e143375dcdaa90c60f8383058d7f24e619292b4.',
  occurrences: [{ id: 'given-e21-self-label', entryId: 'inertial-acceleration', parentEntryId: 'inertial-acceleration', label: 'E21 · self-label', appearsAt: 'expand-law', flattenedAt: 'flatten-acceleration' }],
  steps: [
    { id: 'start', title: 'Start with the given quantities', operation: 'Start', context: 'root', relatedEntryIds: ['inertial-acceleration', 'point-particle', 'inertial-mass'],
      description: 'The question already supplies the particle, inertial frame, net force and mass. Start from inertial-acceleration, then inspect E3, E20 and E23 before expanding the law.', fragment: [ref('inertial-acceleration')] },
    { id: 'expand-law', title: 'Open Newton II · E21', operation: 'Expand', context: 'E21 · inertial-acceleration', relatedEntryIds: ['inertial-acceleration', 'point-particle', 'net-force', 'inertial-mass'],
      description: 'Select the a = F/m definition. It is the only definition expanded in this run.', fragment: law(false, false, false, false) },
    { id: 'supply-particle', title: 'Bind the given particle · p1', operation: 'Input', context: 'E21 · position 0', relatedEntryIds: ['point-particle', 'inertial-acceleration'],
      description: 'Inject p1 into the point-particle demand and return to the law. The cyan connection marks a supplied input; the particle definition is not recalled.',
      fragment: law(true, false, false, false), boundInputs: [{ from: 'inertial-acceleration', to: 'point-particle', value: 'p1' }] },
    { id: 'flatten-acceleration', title: 'Flatten the acceleration label', operation: 'Flatten', context: 'E21 · position 1', relatedEntryIds: ['inertial-acceleration'],
      description: 'Flatten only the left-side self-label. Its occurrence fades, while the starting node and the open force and mass demands remain available.', fragment: law(true, true, false, false) },
    { id: 'supply-net-force', title: 'Bind the given net force · 6 N', operation: 'Input', context: 'E21 · position 2', relatedEntryIds: ['net-force', 'inertial-acceleration'],
      description: 'Inject the supplied vector (6, 0, 0) N and return. No force-sum definition or interaction set is expanded.', fragment: law(true, true, true, false),
      boundInputs: [{ from: 'inertial-acceleration', to: 'net-force', value: '(6, 0, 0) N' }] },
    { id: 'supply-mass', title: 'Bind the given mass · 2 kg', operation: 'Input', context: 'E21 · position 3', relatedEntryIds: ['inertial-mass', 'inertial-acceleration'],
      description: 'Inject 2 kg and return. All holes are settled, with the arithmetic still written as an instruction.', fragment: law(true, true, true, true), settled: true,
      boundInputs: [{ from: 'inertial-acceleration', to: 'inertial-mass', value: '2 kg' }] },
    { id: 'acceleration-result', title: 'Reduce to the acceleration · 3 m/s²', operation: 'Reduce', context: 'root', relatedEntryIds: ['inertial-acceleration', 'net-force', 'inertial-mass'],
      description: 'The interpreter supplies (3, 0, 0) m/s² after dividing the given force by the given mass. The REPL records the reduction and returns to the root with no open work.', fragment: [text('(3, 0, 0) m/s^2')], settled: true },
  ],
};
