import type { Dictionary } from './dictionaries';

export const newtonDictionaries: Dictionary[] = [
  {
    "id": "newton-current",
    "name": "Newtonian mechanics · current draft",
    "shortName": "Newton mechanics",
    "status": "DESIGN 2.1 / CURRENT DRAFT",
    "description": "The current authored draft: 26 definitions. The mass-input wall and force-sum section remain unfinished.",
    "source": "VD-Newton · 07_design_2_1/DESIGN_2_1_DRAFT_1_ENTRIES.md",
    "definitionCount": 26,
    "entries": [
      {
        "id": "time",
        "sourceId": "K1",
        "definition": "A background ordering value, usually modelled by t ∈ R; a time-value selects\nan instant, and the difference between two time-values is a duration.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "reference-frame",
        "sourceId": "K2",
        "definition": "A coordinate-and-clock convention for events: an origin, basis vectors, and a\nclock, supplying the coordinates in which displacement and trajectory values\nare expressed.",
        "references": [
          "displacement",
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "displacement",
        "sourceId": "K3",
        "definition": "A spatial vector with units of length, expressed in a chosen reference-frame.",
        "references": [
          "reference-frame"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "straight-line",
        "sourceId": "K4",
        "definition": "A geometric locus in a reference-frame whose displacement-vectors have the form\nr0 + λu, with r0 fixed, u nonzero, and λ real.",
        "references": [
          "reference-frame"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "path",
        "sourceId": "K5",
        "definition": "A timeless spatial locus or form in a reference-frame, such as a point, straight\nline, or curve; it does not yet include particle identity, time, traversal rate,\nor a time-indexed map.",
        "references": [
          "reference-frame",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "time-interval",
        "sourceId": "K6",
        "definition": "A selected span of time from a start-time to an end-time over which a motion\ndescription is considered; it selects a span, not merely a duration.",
        "references": [
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "point-particle",
        "sourceId": "K7",
        "definition": "An idealised object whose spatial extent and internal structure are neglected\nfor the motion description.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "trajectory",
        "sourceId": "K8",
        "definition": "For a point-particle in a reference-frame over a time-interval, a time-indexed\nmap from selected time-values to displacement-vectors in that frame; this is the\nkinematic object from which instant-values and derivatives are read.",
        "references": [
          "point-particle",
          "reference-frame",
          "time-interval"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "position",
        "sourceId": "K9",
        "definition": "For a point-particle with a trajectory, the displacement-vector returned by that\ntrajectory at a selected time in the chosen reference-frame.",
        "references": [
          "point-particle",
          "reference-frame",
          "time",
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "velocity",
        "sourceId": "K10",
        "definition": "For a point-particle with a trajectory in a reference-frame, the derivative of\nthat trajectory with respect to time at a selected time, when that derivative\nexists.",
        "references": [
          "point-particle",
          "reference-frame",
          "time",
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "speed",
        "sourceId": "K11",
        "definition": "For a point-particle at a selected time in a reference-frame, the scalar\nmagnitude of its velocity.",
        "references": [
          "point-particle",
          "reference-frame",
          "time",
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "acceleration",
        "sourceId": "K12",
        "definition": "For a point-particle in a reference-frame, the derivative of velocity with\nrespect to time at a selected time; equivalently, the second derivative of the\ntrajectory, when defined.",
        "references": [
          "point-particle",
          "reference-frame",
          "time",
          "trajectory",
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "relative-position",
        "sourceId": "K13",
        "definition": "For two point-particles in the same reference-frame at the same selected time,\nthe displacement-vector r2 - r1 obtained by subtracting the first position from\nthe second.",
        "references": [
          "position",
          "reference-frame",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "relative-velocity",
        "sourceId": "K14",
        "definition": "For two point-particles in the same reference-frame at the same selected time,\nthe derivative of relative-position with respect to time; equivalently, the\nsecond velocity minus the first, when defined.",
        "references": [
          "reference-frame",
          "relative-position",
          "time",
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "path-length",
        "sourceId": "K15",
        "definition": "A derived scalar length assigned to a supplied path or to a trajectory over a\ntime-interval; for a differentiable trajectory, it is the integral of speed over\nthat interval.",
        "references": [
          "path",
          "speed",
          "time-interval",
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "uniform-motion",
        "sourceId": "K16 / E1",
        "definition": "A frame-indexed interval property of a point-particle: over the selected\ntime-interval, its trajectory either stays at one position in the chosen frame,\nor traces a straight path with constant velocity, i.e. constant speed with\nunchanged direction. It is a kinematic path-pattern, not yet a claim about why\nthe motion occurs.",
        "references": [
          "free-particle",
          "inertial-frame",
          "path",
          "point-particle",
          "position",
          "speed",
          "time-interval",
          "trajectory",
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E2",
            "definition": "Uniform-motion is the motion a free-particle must exhibit when described in an\ninertial-frame.",
            "references": [
              "free-particle",
              "inertial-frame"
            ]
          }
        ]
      },
      {
        "id": "inertial-frame",
        "sourceId": "E3",
        "definition": "An inertial-frame is a reference-frame in which every free-particle must exhibit\nuniform-motion.",
        "references": [
          "free-particle",
          "reference-frame",
          "uniform-motion"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E5",
            "definition": "An inertial-frame is the standard reference-frame for Newtonian mechanical\nanalysis. It is the frame of an observer treated as non-accelerating and\nnon-rotating. It is sometimes called a Galilean frame or the lab frame. Earth\ncan be treated as an inertial reference-frame in ordinary circumstances, to the\nneeded approximation.",
            "references": [
              "reference-frame"
            ]
          }
        ]
      },
      {
        "id": "free-particle",
        "sourceId": "E4",
        "definition": "A free-particle is a point-particle that must exhibit uniform-motion when\ndescribed in an inertial-frame. But a point-particle can exhibit uniform-motion\nwithout being a free-particle.",
        "references": [
          "inertial-frame",
          "point-particle",
          "trajectory",
          "uniform-motion"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E6",
            "definition": "A free-particle or free body is a point-particle whose trajectory is not being\ninfluenced by any other object, i.e. is free from influence. This may be a\nmaterial-object represented as a point-particle, or a massless point-particle\nlike a photon.",
            "references": [
              "point-particle",
              "trajectory"
            ]
          }
        ]
      },
      {
        "id": "inertial-acceleration-material-object",
        "sourceId": "E7",
        "definition": "For a material-object with a trajectory described in an inertial-frame,\nthe acceleration read from that trajectory at a selected time.",
        "references": [
          "acceleration",
          "inertial-frame",
          "inertial-mass-material-object",
          "net-force-material-object",
          "time",
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E8",
            "definition": "For one material-object, its net-force-material-object divided by\nits inertial-mass-material-object.",
            "references": [
              "inertial-mass-material-object",
              "net-force-material-object"
            ]
          }
        ]
      },
      {
        "id": "net-force-material-object",
        "sourceId": "E9",
        "definition": "For one material-object, its inertial-mass-material-object times\nits inertial-acceleration-material-object.",
        "references": [
          "inertial-acceleration-material-object",
          "inertial-frame",
          "inertial-mass-material-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E11",
            "definition": "For a material-object in an inertial-frame, its vector in newtons. There are\nexactly two ways to obtain this vector.",
            "references": [
              "inertial-frame"
            ]
          }
        ]
      },
      {
        "id": "inertial-mass-material-object",
        "sourceId": "E10",
        "definition": "For one material-object, the positive scalar that multiplies its\ninertial-acceleration-material-object to give its net-force-material-object.\nIf both are exact, check that they are codirectional and then divide the\nnet-force magnitude by the inertial-acceleration magnitude; a zero-zero pair\nleaves the scalar undetermined. If either is measured, estimate two underlying\ncodirectional vectors and then recover the positive scalar relating them.",
        "references": [
          "inertial-acceleration-material-object",
          "net-force-material-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      }
    ]
  },
  {
    "id": "newton-operational",
    "name": "Newtonian mechanics · Newton II snapshot",
    "shortName": "Newton mechanics",
    "status": "OPERATIONAL / 45 DEFINITIONS",
    "description": "The complete operational dictionary used by the recorded Newton II example, with updated impressed-force terminology.",
    "source": "VD-Newton · 02_engine/newton.py",
    "definitionCount": 45,
    "entries": [
      {
        "id": "time",
        "sourceId": "E1",
        "definition": "A real parameter t in R used to order events; differences delta t = t2 - t1 are durations.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "reference-frame",
        "sourceId": "E2",
        "definition": "A convention for assigning spatial coordinates and a time coordinate to events: an origin, a set of basis vectors, and a clock.",
        "references": [
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "point-particle",
        "sourceId": "E3",
        "definition": "An idealised object whose spatial extent and internal structure are neglected.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "position",
        "sourceId": "E4",
        "definition": "The location of a point-particle at time t in a reference-frame, represented by a vector r(t) in R^3.",
        "references": [
          "point-particle",
          "reference-frame",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "displacement",
        "sourceId": "E5",
        "definition": "The change in position: delta r = r(t2) - r(t1).",
        "references": [
          "position"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "velocity",
        "sourceId": "E6",
        "definition": "v(t) = dr/dt.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "speed",
        "sourceId": "E7",
        "definition": "The scalar magnitude of velocity: speed(t) = ||v(t)||.",
        "references": [
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "acceleration",
        "sourceId": "E8",
        "definition": "a(t) = dv/dt = d^2 r/dt^2.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "trajectory",
        "sourceId": "E9",
        "definition": "The map t -> r(t) giving the position of a point-particle over some interval I subset R.",
        "references": [
          "point-particle",
          "position"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "straight-line",
        "sourceId": "E10",
        "definition": "A set of points {r0 + lambda u : lambda in R} for fixed r0 in R^3 and nonzero direction u in R^3.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "path-length",
        "sourceId": "E11",
        "definition": "For a differentiable trajectory from t1 to t2, the arc length is s = integral of ||v(t)|| dt.",
        "references": [
          "trajectory"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "relative-position",
        "sourceId": "E12",
        "definition": "For two point-particle|s in the same reference-frame, the relative-position is r12(t) = r2(t) - r1(t).",
        "references": [
          "point-particle",
          "reference-frame"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "relative-velocity",
        "sourceId": "E13",
        "definition": "For two point-particle|s in the same reference-frame, the relative-velocity is v12(t) = v2(t) - v1(t) = dr12/dt.",
        "references": [
          "point-particle",
          "reference-frame"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "uniform-motion",
        "sourceId": "E14",
        "definition": "The state of being either stationary or moving along a straight-line with constant speed. Equivalently, a point-particle is in uniform-motion on an interval I if its velocity is constant throughout I; i.e. for all t1, t2 in I, v(t1) = v(t2). A point-particle is in uniform-motion at time t0 if there exists epsilon > 0 such that it is in uniform-motion on (t0 - epsilon, t0 + epsilon).",
        "references": [
          "free-particle",
          "inertial-frame",
          "point-particle",
          "speed",
          "straight-line",
          "time",
          "velocity"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E15",
            "definition": "The state of motion exhibited by a free-particle when described in an inertial-frame.",
            "references": [
              "free-particle",
              "inertial-frame"
            ]
          }
        ]
      },
      {
        "id": "inertial-frame",
        "sourceId": "E16",
        "definition": "A reference-frame in which every free-particle exhibits uniform-motion.",
        "references": [
          "free-particle",
          "reference-frame",
          "uniform-motion"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E18",
            "definition": "A reference-frame standard for Newtonian analysis of motion; historically, a Galilean reference frame.",
            "references": [
              "reference-frame"
            ]
          }
        ]
      },
      {
        "id": "free-particle",
        "sourceId": "E17",
        "definition": "A point-particle that, when described in an inertial-frame, exhibits uniform-motion.",
        "references": [
          "inertial-frame",
          "point-particle",
          "uniform-motion"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E19",
            "definition": "A point-particle not subject to external influence relevant to its motion.",
            "references": [
              "point-particle"
            ]
          }
        ]
      },
      {
        "id": "inertial-acceleration",
        "sourceId": "E20",
        "definition": "The acceleration of a point-particle as measured in an inertial-frame.",
        "references": [
          "acceleration",
          "inertial-frame",
          "inertial-mass",
          "net-force",
          "point-particle"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E21",
            "definition": "For a point-particle, inertial-acceleration equals net-force divided by inertial-mass: a = F/m.",
            "references": [
              "inertial-mass",
              "net-force",
              "point-particle"
            ]
          }
        ]
      },
      {
        "id": "net-force",
        "sourceId": "E22",
        "definition": "The vector quantity satisfying net-force = inertial-mass times inertial-acceleration for a point-particle.",
        "references": [
          "impressed-force",
          "inertial-acceleration",
          "inertial-mass",
          "interaction-set",
          "point-particle",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E24",
            "definition": "net-force on particle p at time t is the vector sum of the impressed-force contribution supplied to p by every interaction in the closed interaction-set for p at t.",
            "references": [
              "impressed-force",
              "interaction-set",
              "time"
            ]
          }
        ]
      },
      {
        "id": "inertial-mass",
        "sourceId": "E23",
        "definition": "The positive scalar coefficient m such that net-force = m times inertial-acceleration for a point-particle.",
        "references": [
          "inertial-acceleration",
          "net-force",
          "point-particle"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "interaction-set",
        "sourceId": "E25",
        "definition": "The closed set of all and only the independently warranted interaction|s relevant to particle p at time t; each member interaction supplies a target-directed impressed-force on p.",
        "references": [
          "impressed-force",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "impressed-force",
        "sourceId": "E26",
        "definition": "The target-directed vector force-action that an interaction in a particle's interaction-set supplies to that particle in a fixed context; it is the contribution summed to obtain the particle's net-force.",
        "references": [
          "canonical-force_acting-object",
          "interaction-set",
          "net-force",
          "reaction-force_acting-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E31",
            "definition": "An impressed-force is a force-contribution that is either a canonical-force_acting-object or a reaction-force_acting-object.",
            "references": [
              "canonical-force_acting-object",
              "reaction-force_acting-object"
            ]
          }
        ]
      },
      {
        "id": "raw-class",
        "sourceId": "E27",
        "definition": "An abstract object-type.",
        "references": [
          "class-specific-features",
          "instance-of"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E28",
            "definition": "An abstract object-type specified by class-specific-features; an object x is treated as an instance-of the raw-class when it is recognized as possessing the class-specific-features.",
            "references": [
              "class-specific-features",
              "instance-of"
            ]
          }
        ]
      },
      {
        "id": "class-specific-features",
        "sourceId": "E29",
        "definition": "The set of features that specify a raw-class C; these features are whatever a modeler must recognize x as having in order to treat x as an instance-of C.",
        "references": [
          "instance-of",
          "raw-class"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "instance-of",
        "sourceId": "E30",
        "definition": "x is treated as an instance of a raw-class C when x is recognized as possessing the class-specific-features of C.",
        "references": [
          "class-specific-features",
          "raw-class"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "canonical-force_acting-object",
        "sourceId": "E32",
        "definition": "A canonical-force_acting-object is an impressed-force designated as canonical; the corresponding reaction-force_acting-object is the impressed-force defined as the negative of it.",
        "references": [
          "acting-object",
          "activation-condition_acting-object",
          "impressed-force",
          "point-particle",
          "reaction-force_acting-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E36",
            "definition": "The canonical-force_acting-object is the impressed-force that an acting-object exerts on a point-particle that fulfills the activation-condition_acting-object.",
            "references": [
              "acting-object",
              "activation-condition_acting-object",
              "impressed-force",
              "point-particle"
            ]
          }
        ]
      },
      {
        "id": "reaction-force_acting-object",
        "sourceId": "E33",
        "definition": "A reaction-force_acting-object is an impressed-force defined as the negative of canonical-force_acting-object.",
        "references": [
          "canonical-force_acting-object",
          "impressed-force"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "acting-object",
        "sourceId": "E34",
        "definition": "An acting-object is an object equipped with both an activation-condition_acting-object and a corresponding canonical-force_acting-object.",
        "references": [
          "activation-condition_acting-object",
          "canonical-force_acting-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "activation-condition_acting-object",
        "sourceId": "E35",
        "definition": "If a point-particle fulfills the activation-condition_acting-object of an acting-object, the canonical-force_acting-object of that acting-object will be an impressed-force on the point-particle.",
        "references": [
          "acting-object",
          "canonical-force_acting-object",
          "impressed-force",
          "point-particle"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "mechanical-composition_point-particle",
        "sourceId": "E37",
        "definition": "The mechanical-composition_point-particle of a point-particle is the set of acting-object|s that the point-particle has. When a point-particle serves as the representative, or centre of mass, of a body, all acting-object|s of that body are included in the mechanical-composition_point-particle of that point-particle.",
        "references": [
          "acting-object",
          "point-particle"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "paired-particle_acting-object",
        "sourceId": "E38",
        "definition": "The paired-particle_acting-object of an acting-object is the point-particle whose mechanical-composition_point-particle includes that acting-object. The acting-object is modelled as located at the position of its paired-particle_acting-object.",
        "references": [
          "acting-object",
          "mechanical-composition_point-particle",
          "point-particle",
          "position"
        ],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "mechanical-system",
        "sourceId": "E39",
        "definition": "An arbitrary subset of particles selected by the observer for analysis.",
        "references": [],
        "x": 50,
        "y": 50,
        "alternatives": []
      },
      {
        "id": "interaction-candidate",
        "sourceId": "E40",
        "definition": "For a particle p in a mechanical-system S at time t, an interaction-candidate is any interaction in the interaction-set for p at t.",
        "references": [
          "interaction-pair",
          "interaction-set",
          "mechanical-system",
          "mechanically-closed-system",
          "time"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E41",
            "definition": "An interaction-candidate is an elementary force-unit, every one of which must be able to be placed in an interaction-pair for the mechanical-system to be a mechanically-closed-system.",
            "references": [
              "interaction-pair",
              "mechanical-system",
              "mechanically-closed-system"
            ]
          }
        ]
      },
      {
        "id": "interaction-pair",
        "sourceId": "E42",
        "definition": "An interaction-pair is the form into which each interaction-candidate is placed in a mechanically-closed-system.",
        "references": [
          "acting-object",
          "canonical-force_acting-object",
          "interaction-candidate",
          "mechanically-closed-system",
          "paired-particle_acting-object",
          "reaction-force_acting-object"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E44",
            "definition": "Two interaction-candidate|s form an interaction-pair when they correspond to the same acting-object, one being the canonical-force_acting-object associated with that acting-object and the other being the reaction-force_acting-object associated with that acting-object, the latter exerted on the paired-particle_acting-object.",
            "references": [
              "acting-object",
              "canonical-force_acting-object",
              "interaction-candidate",
              "paired-particle_acting-object",
              "reaction-force_acting-object"
            ]
          }
        ]
      },
      {
        "id": "mechanically-closed-system",
        "sourceId": "E43",
        "definition": "A mechanically-closed-system is a mechanical-system in which every interaction-candidate can be placed in an interaction-pair.",
        "references": [
          "interaction-candidate",
          "interaction-pair",
          "mechanical-system"
        ],
        "x": 50,
        "y": 50,
        "alternatives": [
          {
            "sourceId": "E45",
            "definition": "A mechanically-closed-system is a mechanical-system whose future behaviour is determined by the equations produced from the interactions internal to it.",
            "references": [
              "mechanical-system"
            ]
          }
        ]
      }
    ]
  }
];
