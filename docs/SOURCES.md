# Example provenance

## Newton sources added for Authority Dictionary

The local VD-Newton working surface was inspected on 9 September 2026, on branch `codex/nml2-entry-renumbering`, HEAD `5ae1797dd5ab9a36b1c0ae56ac360ad4bff0d58a`.

- **Current authored version:** `07_design_2_1/DESIGN_2_1_DRAFT_1_ENTRIES.md`, explicitly designated active output by that directory's README and SOURCE_STATUS. Its 26 definitions (21 headwords) are retained verbatim, including K16/E1 and all alternative definitions. It is incomplete: E12 is deferred and the NML3 force-sum cut is open. `material-object` is not a defined headword here and is not invented by the viewer.
- **Trace-matched operational version:** `02_engine/newton.py`, 45 definitions (34 headwords), with the August 26 impressed-force / interaction-set terminology. This is the dictionary used by the saved Newton II run; it is distinct from the current authored draft.
- **Recorded trace:** `03_trace_and_evaluator/newton_second_law_trace.json` and its accompanying explanation, executed 7 September 2026. It was active, untracked local work, so the trace is identified by its content hash rather than falsely attributed to the repository commit. All seven original source hashes still matched at import.

The dictionary reference arrays were extracted with the actual VDfirst tokeniser, using its recorded source version (`5a57790539ad405134b609e562d30490e19550d9`), not a website string-matching heuristic. The viewer groups definitions by headword; the source extracts retain per-definition references, ordered occurrences, and candidate target entries.

Checked-in, path-sanitized source extracts:

- `newton-current-source.json` — source SHA-256 `3bd6758d4cf7d476d87caddf8f9f73ec7d66bd5d4eaf14398a9fc12cd2eb32a8`.
- `newton-operational-source.json` — source SHA-256 `e5771def38b3c90e176bf7908f28487158e185334020391d8670216c18243e2e`.
- `newton-ii-recorded-source.json` — original trace SHA-256 `f1acd72d9d99daf2d97be3d60c5e1dc0cba441024ee40c88a279018d2ce6ee56`, exposures and 39 events.

Newton II is condensed into 14 display stages while preserving event order and exact active fragments. The actual followed entry edges are E21→E3, E21→E24, E24→E26, and E24→E25. E20/E18/E23 inspections and input injections are not counted as traversal. Only E21 position 1 (`inertial-acceleration` self-label) and E24 position 0 (`net-force` self-label) are flattened. The graph represents these as separate occurrence nodes; it does not expend every use of those headwords.

The question supplies 2 kg, the inertial frame, both interaction identities, their completeness, and force values +10 N and −4 N. The interpreter supplied the reductions to 6 N and then 3 m/s². The website replays this record; it does not run or certify the arithmetic. Newer recursive-sum attempts are unaccepted experiments and have not been merged into these versions.

## Original small examples

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
