import { newtonDictionaries } from './newton-dictionaries.ts';

export interface Definition {
  sourceId: string;
  definition: string;
  references: string[];
}

export interface Entry {
  id: string;
  sourceId: string;
  definition: string;
  references: string[];
  x: number;
  y: number;
  alternatives?: Definition[];
}

export interface Dictionary {
  id: string;
  name: string;
  shortName: string;
  description: string;
  source: string;
  status?: string;
  definitionCount?: number;
  entries: Entry[];
}

export const dictionaries: Dictionary[] = [
  ...newtonDictionaries,
  {
    id: 'kinematics', name: 'Newton kinematics', shortName: 'Kinematics',
    description: 'Six entries about position and motion, selected from the Newton dictionary.',
    source: 'VDfirst · newton.py · kinematics excerpt',
    entries: [
      { id: 'time', sourceId: 'E1', definition: 'A real parameter t in R used to order events; differences delta t = t2 - t1 are durations.', references: [], x: 49, y: 85 },
      { id: 'reference-frame', sourceId: 'E2', definition: 'A convention for assigning spatial coordinates and a time coordinate to events: an origin, a set of basis vectors, and a clock.', references: ['time'], x: 80, y: 68 },
      { id: 'point-particle', sourceId: 'E3', definition: 'An idealised object whose spatial extent and internal structure are neglected.', references: [], x: 20, y: 70 },
      { id: 'position', sourceId: 'E4', definition: 'The location of a point-particle at time t in a reference-frame, represented by a vector r(t) in R^3.', references: ['point-particle', 'time', 'reference-frame'], x: 49, y: 43 },
      { id: 'displacement', sourceId: 'E5', definition: 'The change in position: delta r = r(t2) - r(t1).', references: ['position'], x: 23, y: 17 },
      { id: 'trajectory', sourceId: 'E9', definition: 'The map t -> r(t) giving the position of a point-particle over some interval I subset R.', references: ['position', 'point-particle'], x: 77, y: 17 },
    ],
  },
  {
    id: 'toy-force', name: 'Toy force', shortName: 'Toy force',
    description: 'A three-entry example: unfold force into mass and acceleration.',
    source: 'VDfirst · test_repl_trace.py · toy fixture',
    entries: [
      { id: 'mass', sourceId: 'E0', definition: '2 kg', references: [], x: 24, y: 71 },
      { id: 'acceleration', sourceId: 'E1', definition: '5 m/s^2', references: [], x: 76, y: 71 },
      { id: 'force', sourceId: 'E2', definition: 'mass times acceleration', references: ['mass', 'acceleration'], x: 50, y: 25 },
    ],
  },
];
