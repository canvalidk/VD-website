import type { PreparedTrace } from './traces';

export const newtonTrace: PreparedTrace = {
  "id": "newton-ii-recorded",
  "dictionaryId": "newton-operational",
  "title": "Newton II · two forces, one acceleration",
  "kind": "recorded",
  "startEntryId": "inertial-acceleration",
  "question": "At instant t0, p is modelled as a point-particle of inertial mass 2 kg in an inertial frame R, with +x to the right. Two independently verified actuator contacts i_A and i_B supply forces (10,0,0) N and (-4,0,0) N to p. These are stipulated to be all and only the relevant interactions in this idealised example. What is p's acceleration?",
  "provenance": "Condensed playback of the executed 7 September 2026 VD-Newton trace (39 recorded events). It uses the 45-entry operational dictionary. Mass, frame, interaction membership, completeness, and force values are supplied; arithmetic reductions are interpreter-provided.",
  "occurrences": [
    {
      "id": "e21-self-label",
      "entryId": "inertial-acceleration",
      "parentEntryId": "inertial-acceleration",
      "label": "E21 · self-label",
      "appearsAt": "expand-law",
      "flattenedAt": "flatten-acceleration"
    },
    {
      "id": "e24-self-label",
      "entryId": "net-force",
      "parentEntryId": "net-force",
      "label": "E24 · self-label",
      "appearsAt": "expand-net-force",
      "flattenedAt": "flatten-net-force"
    }
  ],
  "steps": [
    {
      "id": "start",
      "title": "Ask for inertial acceleration",
      "operation": "Start",
      "description": "At t0, the question supplies a point-particle and an inertial frame. E20 and E18 are inspected; E21 is selected for the acceleration law.",
      "context": "root",
      "relatedEntryIds": [
        "inertial-acceleration",
        "inertial-frame"
      ],
      "fragment": [
        {
          "entryId": "inertial-acceleration"
        }
      ]
    },
    {
      "id": "expand-law",
      "title": "Open Newton II · E21",
      "operation": "Expand",
      "description": "Choose the orientation a = F/m. Its definition opens the particle idealisation, a self-label, net force, and inertial mass.",
      "context": "E21 · inertial-acceleration",
      "relatedEntryIds": [
        "inertial-acceleration",
        "point-particle",
        "net-force",
        "inertial-mass"
      ],
      "fragment": [
        {
          "text": "For a "
        },
        {
          "entryId": "point-particle"
        },
        {
          "text": ", "
        },
        {
          "entryId": "inertial-acceleration"
        },
        {
          "text": " equals "
        },
        {
          "entryId": "net-force"
        },
        {
          "text": " divided by "
        },
        {
          "entryId": "inertial-mass"
        },
        {
          "text": ": a = F/m."
        }
      ]
    },
    {
      "id": "recall-particle",
      "title": "Recall the particle idealisation · E3",
      "operation": "Recall",
      "description": "Follow the point-particle reference and insert E3 literally. The question stipulates this modelling choice.",
      "context": "E21 · inertial-acceleration",
      "relatedEntryIds": [
        "point-particle",
        "inertial-acceleration"
      ],
      "fragment": [
        {
          "text": "For a "
        },
        {
          "text": "An idealised object whose spatial extent and internal structure are neglected."
        },
        {
          "text": ", "
        },
        {
          "entryId": "inertial-acceleration"
        },
        {
          "text": " equals "
        },
        {
          "entryId": "net-force"
        },
        {
          "text": " divided by "
        },
        {
          "entryId": "inertial-mass"
        },
        {
          "text": ": a = F/m."
        }
      ],
      "traversedEdges": [
        {
          "from": "inertial-acceleration",
          "to": "point-particle"
        }
      ]
    },
    {
      "id": "flatten-acceleration",
      "title": "Flatten the acceleration label",
      "operation": "Flatten",
      "description": "The self-named occurrence on E21’s left side labels the goal. Only this occurrence is flattened; the starting headword remains available.",
      "context": "E21 · position 1",
      "relatedEntryIds": [
        "inertial-acceleration"
      ],
      "fragment": [
        {
          "text": "For a "
        },
        {
          "text": "An idealised object whose spatial extent and internal structure are neglected."
        },
        {
          "text": ", "
        },
        {
          "text": "inertial-acceleration"
        },
        {
          "text": " equals "
        },
        {
          "entryId": "net-force"
        },
        {
          "text": " divided by "
        },
        {
          "entryId": "inertial-mass"
        },
        {
          "text": ": a = F/m."
        }
      ]
    },
    {
      "id": "supply-mass",
      "title": "Supply the given mass · 2 kg",
      "operation": "Input",
      "description": "E23’s positive-scalar condition is inspected. The mass comes from the question and is injected into the demanded quantity, then focus returns to E21.",
      "context": "E21 · inertial-mass demand",
      "relatedEntryIds": [
        "inertial-mass",
        "inertial-acceleration"
      ],
      "fragment": [
        {
          "text": "For a "
        },
        {
          "text": "An idealised object whose spatial extent and internal structure are neglected."
        },
        {
          "text": ", "
        },
        {
          "text": "inertial-acceleration"
        },
        {
          "text": " equals "
        },
        {
          "entryId": "net-force"
        },
        {
          "text": " divided by "
        },
        {
          "text": "2 kg"
        },
        {
          "text": ": a = F/m."
        }
      ]
    },
    {
      "id": "expand-net-force",
      "title": "Follow the vector-sum definition · E24",
      "operation": "Expand",
      "description": "Follow net-force to E24, the vector-sum definition. The inverse F = ma orientation would require the unknown acceleration.",
      "context": "E24 · net-force",
      "relatedEntryIds": [
        "net-force",
        "impressed-force",
        "interaction-set",
        "time"
      ],
      "fragment": [
        {
          "entryId": "net-force"
        },
        {
          "text": " on particle p at "
        },
        {
          "entryId": "time"
        },
        {
          "text": " t is the vector sum of the "
        },
        {
          "entryId": "impressed-force"
        },
        {
          "text": " contribution supplied to p by every interaction in the closed "
        },
        {
          "entryId": "interaction-set"
        },
        {
          "text": " for p at t."
        }
      ],
      "traversedEdges": [
        {
          "from": "inertial-acceleration",
          "to": "net-force"
        }
      ]
    },
    {
      "id": "flatten-net-force",
      "title": "Flatten the net-force label",
      "operation": "Flatten",
      "description": "The self-reference at E24 position 0 is a label for the quantity being computed. Its separate occurrence fades in the network.",
      "context": "E24 · position 0",
      "relatedEntryIds": [
        "net-force"
      ],
      "fragment": [
        {
          "text": "net-force"
        },
        {
          "text": " on particle p at "
        },
        {
          "entryId": "time"
        },
        {
          "text": " t is the vector sum of the "
        },
        {
          "entryId": "impressed-force"
        },
        {
          "text": " contribution supplied to p by every interaction in the closed "
        },
        {
          "entryId": "interaction-set"
        },
        {
          "text": " for p at t."
        }
      ]
    },
    {
      "id": "supply-time",
      "title": "Fix the instant · t0",
      "operation": "Input",
      "description": "Inject the question’s instant t0 into the time demand and return to E24. An input is distinct from following a dictionary reference.",
      "context": "E24 · time demand",
      "relatedEntryIds": [
        "time",
        "net-force"
      ],
      "fragment": [
        {
          "text": "net-force"
        },
        {
          "text": " on particle p at "
        },
        {
          "text": "instant t0"
        },
        {
          "text": " t is the vector sum of the "
        },
        {
          "entryId": "impressed-force"
        },
        {
          "text": " contribution supplied to p by every interaction in the closed "
        },
        {
          "entryId": "interaction-set"
        },
        {
          "text": " for p at t."
        }
      ]
    },
    {
      "id": "recall-impressed-force",
      "title": "Recall the force contribution · E26",
      "operation": "Recall",
      "description": "Follow impressed-force to E26. The target-directed force contribution is recalled as literal text; references inside that text remain inert.",
      "context": "E24 · impressed-force demand",
      "relatedEntryIds": [
        "impressed-force",
        "net-force"
      ],
      "fragment": [
        {
          "text": "net-force"
        },
        {
          "text": " on particle p at "
        },
        {
          "text": "instant t0"
        },
        {
          "text": " t is the vector sum of the "
        },
        {
          "text": "The target-directed vector force-action that an interaction in a particle's interaction-set supplies to that particle in a fixed context; it is the contribution summed to obtain the particle's net-force."
        },
        {
          "text": " contribution supplied to p by every interaction in the closed "
        },
        {
          "entryId": "interaction-set"
        },
        {
          "text": " for p at t."
        }
      ],
      "traversedEdges": [
        {
          "from": "net-force",
          "to": "impressed-force"
        }
      ]
    },
    {
      "id": "expand-interaction-set",
      "title": "Demand the closed interaction set · E25",
      "operation": "Expand",
      "description": "Follow interaction-set to E25. Its membership must be independently warranted, rather than selected to fit an intended net force.",
      "context": "E25 · interaction-set",
      "relatedEntryIds": [
        "interaction-set",
        "impressed-force",
        "time"
      ],
      "fragment": [
        {
          "text": "The closed set of all and only the independently warranted interaction|s relevant to particle p at "
        },
        {
          "entryId": "time"
        },
        {
          "text": " t; each member interaction supplies a target-directed "
        },
        {
          "entryId": "impressed-force"
        },
        {
          "text": " on p."
        }
      ],
      "traversedEdges": [
        {
          "from": "net-force",
          "to": "interaction-set"
        }
      ]
    },
    {
      "id": "supply-interactions",
      "title": "Supply both contacts and forces",
      "operation": "Input",
      "description": "The question supplies all and only i_A and i_B. At t0 they contribute (10, 0, 0) N and (−4, 0, 0) N. Both values are injected into the demanded context.",
      "context": "E25 · interaction-set",
      "relatedEntryIds": [
        "interaction-set",
        "impressed-force",
        "time"
      ],
      "fragment": [
        {
          "text": "The closed set of all and only the independently warranted interaction|s relevant to particle p at "
        },
        {
          "text": "instant t0"
        },
        {
          "text": " t; each member interaction supplies a target-directed "
        },
        {
          "text": "i_A -> p: (10,0,0) N; i_B -> p: (-4,0,0) N"
        },
        {
          "text": " on p."
        }
      ],
      "settled": true
    },
    {
      "id": "reduce-membership",
      "title": "Record the supplied membership",
      "operation": "Reduce",
      "description": "The interpreter records the two distinct interaction identities and their supplied contributions, then returns to the net-force frame.",
      "context": "E25 → E24",
      "relatedEntryIds": [
        "interaction-set",
        "net-force"
      ],
      "fragment": [
        {
          "text": "{i_A, i_B}; i_A -> p: (10, 0, 0) N; i_B -> p: (-4, 0, 0) N"
        }
      ],
      "settled": true
    },
    {
      "id": "sum-forces",
      "title": "Add the contributions · 6 N",
      "operation": "Reduce",
      "description": "The interpreter applies E24’s vector-sum instruction: (10, 0, 0) + (−4, 0, 0) = (6, 0, 0) N. The REPL records this supplied reduction.",
      "context": "E24 → E21",
      "relatedEntryIds": [
        "net-force",
        "impressed-force",
        "interaction-set"
      ],
      "fragment": [
        {
          "text": "(6, 0, 0) N"
        }
      ],
      "settled": true
    },
    {
      "id": "acceleration-result",
      "title": "Return the acceleration · 3 m/s²",
      "operation": "Reduce",
      "description": "Using E21, the interpreter divides (6, 0, 0) N by 2 kg and submits the result. The recorded run ends at the root with no open holes. The interpreter performed the arithmetic; the engine recorded the reduction.",
      "context": "root",
      "relatedEntryIds": [
        "inertial-acceleration",
        "net-force",
        "inertial-mass"
      ],
      "fragment": [
        {
          "text": "(3, 0, 0) m/s^2"
        }
      ],
      "settled": true
    }
  ]
};
