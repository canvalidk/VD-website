import { dictionaries } from './dictionaries.ts';
import { newtonTrace } from './newton-trace.ts';
import { newtonGivenInputsTrace } from './newton-given-inputs-trace.ts';

/** Literal text remains inert. Only explicit entryId parts represent open holes. */
export type FragmentPart = { text: string; entryId?: never } | { entryId: string; text?: never };
export interface TraceStep {
  id: string;
  title: string;
  operation: 'Start' | 'Expand' | 'Recall' | 'Return' | 'Onward' | 'Flatten' | 'Input' | 'Reduce';
  description: string;
  context: string;
  relatedEntryIds: string[];
  fragment: FragmentPart[];
  settled?: boolean;
  traversedEdges?: { from: string; to: string }[];
  boundInputs?: { from: string; to: string; value: string }[];
}
export interface TraceOccurrence {
  id: string;
  entryId: string;
  parentEntryId: string;
  label: string;
  appearsAt: string;
  flattenedAt: string;
}
export interface PreparedTrace {
  id: string;
  dictionaryId: string;
  title: string;
  kind: 'prepared' | 'recorded';
  provenance: string;
  question?: string;
  startEntryId?: string;
  occurrences?: TraceOccurrence[];
  steps: TraceStep[];
}
const text = (value: string): FragmentPart => ({ text: value });
const ref = (entryId: string): FragmentPart => ({ entryId });
const definition = (id: string) => dictionaries.find(item => item.id === 'kinematics')!.entries.find(entry => entry.id === id)!.definition;
const particle = definition('point-particle');
const time = definition('time');
const frame = `A convention for assigning spatial coordinates and a ${time} coordinate to events: an origin, a set of basis vectors, and a clock.`;
const position = `The location of a ${particle} at ${time} t in a ${frame}, represented by a vector r(t) in R^3.`;
const positionParts = (particleResolved: boolean, timeResolved: boolean): FragmentPart[] => [text('The location of a '), particleResolved ? text(particle) : ref('point-particle'), text(' at '), timeResolved ? text(time) : ref('time'), text(' t in a '), ref('reference-frame'), text(', represented by a vector r(t) in R^3.')];
const kinematicsSteps: TraceStep[] = [
  { id: 'start', title: 'Begin with displacement', operation: 'Start', context: 'displacement', description: 'Start with one open headword. Its definition has not been expanded yet.', relatedEntryIds: ['displacement'], fragment: [ref('displacement')] },
  { id: 'expand-displacement', title: 'Open the first reference', operation: 'Expand', context: 'displacement', description: 'The definition of displacement refers to position. That reference becomes the next place to explore.', relatedEntryIds: ['displacement', 'position'], fragment: [text('The change in '), ref('position'), text(': delta r = r(t2) - r(t1).')] },
  { id: 'expand-position', title: 'Three references appear', operation: 'Expand', context: 'displacement › position', description: 'Expanding position reveals point-particle, time, and reference-frame. The fragment below is the active position frame.', relatedEntryIds: ['position', 'point-particle', 'time', 'reference-frame'], fragment: positionParts(false, false) },
  { id: 'recall-particle', title: 'Recall point-particle', operation: 'Recall', context: 'displacement › position', description: 'Recall fills this hole with the literal definition of point-particle.', relatedEntryIds: ['point-particle', 'position'], fragment: positionParts(true, false) },
  { id: 'recall-time', title: 'Recall time', operation: 'Recall', context: 'displacement › position', description: 'The first time occurrence is filled with its literal definition. The reference-frame hole remains open.', relatedEntryIds: ['time', 'position'], fragment: positionParts(true, true) },
  { id: 'expand-frame', title: 'Look inside reference-frame', operation: 'Expand', context: 'displacement › position › reference-frame', description: 'Expanding reference-frame opens another time occurrence. It is separate from the time hole already filled in position.', relatedEntryIds: ['reference-frame', 'time'], fragment: [text('A convention for assigning spatial coordinates and a '), ref('time'), text(' coordinate to events: an origin, a set of basis vectors, and a clock.')] },
  { id: 'recall-frame-time', title: 'Fill the second time occurrence', operation: 'Recall', context: 'displacement › position › reference-frame', description: 'Recall inserts the time definition here too. This frame now has no open holes.', relatedEntryIds: ['time', 'reference-frame'], fragment: [text(frame)], settled: true },
  { id: 'return-position', title: 'Inspect the enclosing position', operation: 'Return', context: 'displacement › position', description: 'The settled reference-frame fragment is visible inside position. Literal substitution preserves the original wording, including awkward grammar.', relatedEntryIds: ['position', 'reference-frame'], fragment: [text(position)], settled: true },
  { id: 'onward-root', title: 'All holes are settled', operation: 'Onward', context: 'displacement', description: 'Return attention to the root. This prepared route illustrates definitional expansion; it does not calculate or validate a physical result.', relatedEntryIds: ['displacement', 'position'], fragment: [text(`The change in ${position}: delta r = r(t2) - r(t1).`)], settled: true },
];
const routes: Record<string, Record<string, [string, string][]>> = {
  displacement: {
    'expand-position': [['displacement', 'position']],
    'recall-particle': [['position', 'point-particle']],
    'recall-time': [['position', 'time']],
    'expand-frame': [['position', 'reference-frame']],
    'recall-frame-time': [['reference-frame', 'time']],
  },
  position: {
    'recall-particle': [['position', 'point-particle']],
    'recall-time': [['position', 'time']],
    'expand-frame': [['position', 'reference-frame']],
    'recall-frame-time': [['reference-frame', 'time']],
  },
  force: { mass: [['force', 'mass']], acceleration: [['force', 'acceleration']] },
};
export const traces: PreparedTrace[] = [
  newtonGivenInputsTrace,
  newtonTrace,
  { id: 'displacement', dictionaryId: 'kinematics', title: 'Follow displacement', kind: 'prepared', provenance: 'Illustrative route derived from the six source definitions and current VD operation semantics; not an exported engine run.', steps: kinematicsSteps },
  { id: 'position', dictionaryId: 'kinematics', title: 'Inside position', kind: 'prepared', provenance: 'Shortened prepared route through position; not an exported engine run.', steps: [
    { id: 'start-position', title: 'Begin with position', operation: 'Start', context: 'position', description: 'A shorter route starts directly with the position headword.', relatedEntryIds: ['position'], fragment: [ref('position')] },
    ...kinematicsSteps.slice(2, 8).map(step => ({ ...step, context: step.context.replace('displacement › ', '') })),
  ] },
  { id: 'force', dictionaryId: 'toy-force', title: 'Unfold force', kind: 'prepared', provenance: 'Prepared playback based on the toy fixture and recall sequence in VDfirst/test_repl_trace.py.', steps: [
    { id: 'start', title: 'Begin with force', operation: 'Start', context: 'force', description: 'The starting expression contains one open headword: force.', relatedEntryIds: ['force'], fragment: [ref('force')] },
    { id: 'expand', title: 'Expose mass and acceleration', operation: 'Expand', context: 'force', description: 'Expanding force reveals two headword references, separated by the literal word “times”.', relatedEntryIds: ['force', 'mass', 'acceleration'], fragment: [ref('mass'), text(' times '), ref('acceleration')] },
    { id: 'mass', title: 'Recall mass', operation: 'Recall', context: 'force', description: 'Recall inserts “2 kg” into the mass hole. Acceleration remains open.', relatedEntryIds: ['mass', 'force'], fragment: [text('2 kg times '), ref('acceleration')] },
    { id: 'acceleration', title: 'All holes are settled', operation: 'Recall', context: 'force', description: 'The residual is “2 kg times 5 m/s^2”. No arithmetic is performed; this demonstration does not claim that VD calculated 10 N.', relatedEntryIds: ['acceleration', 'force'], fragment: [text('2 kg times 5 m/s^2')], settled: true },
  ] },
];
for (const trace of traces) {
  for (const step of trace.steps) {
    const edges = routes[trace.id]?.[step.id];
    if (edges) step.traversedEdges = edges.map(([from, to]) => ({ from, to }));
  }
}
