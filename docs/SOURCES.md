# Example provenance

Selected on 9 September 2026 from the local VDfirst checkout at commit `11bfd8df1d27a5c7f2190aade2470a8a8801dc1f`. These small examples are suitable for the viewer's first demonstration; they do not reproduce the full research dictionaries.

## Newton kinematics excerpt

Exact definitions for E1 time, E2 reference-frame, E3 point-particle, E4 position, E5 displacement, and E9 trajectory are copied from [VDfirst/newton.py](https://github.com/canvalidk/VDfirst/blob/11bfd8df1d27a5c7f2190aade2470a8a8801dc1f/newton.py). The same six definitions were cross-checked against the local VD-Newton operational dictionary (`02_engine/newton.py`). No force terminology from those differing dictionary versions is combined here.

The seven explicit reference edges follow literal headword occurrences in those definitions. Source entry numbering is preserved. Diagram positions are hand-arranged display choices.

**Follow displacement** and **Inside position** are prepared, illustrative routes derived from these definitions and the current operation semantics. They are not exported engine runs. Recalled literal definitions retain their punctuation; the accumulated wording is intentionally not polished into a paraphrase.

## Toy force

The three definitions and IDs come from the fixture in [VDfirst/test_repl_trace.py](https://github.com/canvalidk/VDfirst/blob/11bfd8df1d27a5c7f2190aade2470a8a8801dc1f/test_repl_trace.py): E0 mass → `2 kg`; E1 acceleration → `5 m/s^2`; E2 force → `mass times acceleration`.

The prepared sequence follows the tested force expansion and two literal recalls. The final displayed residual is `2 kg times 5 m/s^2`. It is not replaced by `10 N`; the viewer does no arithmetic.

The older `docs/examples/toy-force-trace.md` is labeled a sketch and contains stale return commentary. It was not used as the current return specification.

## Semantic references

- [Recall is composed](https://github.com/canvalidk/VDfirst/blob/11bfd8df1d27a5c7f2190aade2470a8a8801dc1f/docs/adr/0002-recall-is-composed.md): recall inserts literal entry text rather than recursively analyzing it.
- [Function-call model decision](https://github.com/canvalidk/VDfirst/blob/11bfd8df1d27a5c7f2190aade2470a8a8801dc1f/docs/decision-history/2026-09-01-function-call-model.md): no built-in arithmetic; reductions are recorded human responses, not certified equivalence.
- [Degree-0 return](https://github.com/canvalidk/VDfirst/blob/11bfd8df1d27a5c7f2190aade2470a8a8801dc1f/specs/2026-06-11-vd-degree0-return.md): settlement can propagate while focus remains parked; navigation is human-paced.

Website previous-step and restart controls navigate prepared playback only. They do not imply that a running VD trace supports destructive undo. Selected nodes and step highlights are visual conventions, and graph edges denote headword references, not physical causes.
