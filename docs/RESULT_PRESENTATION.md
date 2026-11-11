# Result and commitment presentation study

24 October 2026, revised 11 November 2026. An implemented exploration, not a settled interface specification or a user study.

## 11 November revision: two derivations, not one result with a history

The first version presented 12 N → reopen → 10 N as one result whose old support "moved to history". That conflicts with the VD reading settled on 1 November and written into the hypothesis-set paper (d4, section 3, in VD-docs `Theory/_note_hypothesis_set_paper/`):

- A derivation as issued is fixed. Finding a mistake in it does not void or recolour it.
- A found mistake is a held member of that derivation's hypothesis set, so the derivation cannot count against the theory: it never linked the theory to its answer.
- The corrected derivation is a new derivation with its own commitments.

The example now shows **Derivation 1** (Inputs, Calculation, Answer: `Prediction: 12 N`) and **Derivation 2** (Reopened, Answer: `Prediction: 10 N`). From derivation 2, a card shows derivation 1 as issued, with **View as issued**. The change line says what the new derivation carried over (P2, P3) and what stayed with the earlier one (P4, P5). Filters read **This derivation** / **Earlier derivation**. Labels say "hypothesis set" (the paper's term) where the export says `prediction_set`.

The data is unchanged: the VDfirst export already keeps snapshots 1 to 3 frozen. Only stage labels, narration and grouping changed, all in `src/data/correction.ts` and `src/derivations.ts`. The script, not the site, declares 12 N a mistake.

## Working direction

Start with the root result, then let the reader ask what it relies on. The dictionary network and active fragment answer different questions and remain available in a separate workspace view. Switching views preserves trace position. Browsing a dictionary entry opens its definition; selecting a claim opens claim evidence.

The correction example opens on `Prediction: 10 N`. Five named snapshots in two derivations let the reader revisit the supplied inputs, the deliberate mistake, derivation 1 as issued, the reopening that starts derivation 2, and its answer. Each stage has its own frozen result and recorded commitments. A short change line says which commitments were added, or carried into a new derivation, since the preceding snapshot.

The default claim list is grouped by **This derivation** and **Earlier derivation**, with an **Unknown** group when coverage cannot establish relevance. Each row shows its original ID, reader category, recorded response, stimulus and verification state. Selecting one opens the exact claim, before/after frame text, operation and event index. Recorded source entry indexes link back to the dictionary. Parameterized calls remain literal; the browser does not infer references from them.

An alternative **Dependencies** view lets the reader inspect one claim's recorded support. This is a flat set, since the producer exports transitive support. No direct dependency graph, minimal proof tree or physical causal graph is inferred.

## Iterations and observations

- Putting claims only beside the active fragment would obscure which root result they support. The new root-result panel is distinct from the existing fragment player.
- The first browser version opened above the result. The example action now brings the result into view, initially selects the calculation, and resets the study's filters.
- Dictionary selection originally left the claim inspector visible. Entry selection now opens the dictionary view; returning to the result preserves the trace position.
- Long desktop claim details initially extended below the viewport while sticky. The inspector now scrolls internally, keeping its source and evidence controls reachable.
- On desktop the evidence inspector sits alongside the list. On narrow screens it follows the list; selecting a claim brings its evidence into view and offers **Back to claims**. Filtering alone keeps the reader at the list.
- A claim list works as the starting view: the difference between this derivation's commitments and an earlier derivation's is visible without learning a graph convention. The support-set view is useful for tracing a consumer, and remains secondary.

These observations come from implementation and browser checks. They need testing with other readers and larger traces before being treated as usability findings.

## States that must stay separate

| State | What the interface can say |
| --- | --- |
| Trace complete | No open demands; arithmetic may still be expressed as an instruction |
| This derivation | Recorded response lineage used by this root result |
| Earlier derivation | Retained claim of an earlier derivation, excluded from this one when selection is complete |
| Support unknown | Missing evidence prevents that exclusion |
| Category | A reader's classification, such as calculation; no verdict |
| Verification | The export's verification field; all demo claims are unchecked |
| Hypothesis-set coverage | Partial; the site computes no verdict |

The deliberate `12 N` response is labelled a mistake by the scripted demonstration. The website does not discover the error. The narration states what follows if it is a mistake (derivation 1 cannot count against the dictionary); it does not check it. `10 N` is another recorded interpreter response. Neither response gains certification from appearance, colour, settlement or inclusion in support.

## Data boundary and next experiments

The included VDfirst schema-2 snapshots are real exports from `correction_demo.py`; the website adapter supplies only display labels, narration, derivation grouping and explicit dictionary links. The interface neither runs VDfirst nor reconstructs claim evidence from the older condensed Newton playbacks. Those playbacks show **No recorded commitments for this step** if the reader opens the result view.

Before extending this beyond the example:

1. Export authoritative root snapshots and event/frame identities for other traces, alongside active fragments.
2. Try a larger claim collection: grouping by frame/category, search, and a compact summary without hiding individual claims.
3. Add a producer-supplied direct dependency relation before drawing direct arrows.
4. Design alternative items and checking outcomes once their engine representation exists. Do not turn the present support list into the full prediction disjunction by changing its label.
5. Test whether readers understand this-derivation/earlier-derivation/unchecked independently, including a settled but uncalculated residual.
6. Ask VDfirst to export derivation boundaries itself, so the grouping is not a display reading.

## Validation

`pnpm test` exercises source fidelity, support changes, historical evidence retention, unknown coverage, transitive support and compatibility with existing graph/playback behavior. `pnpm build` checks TypeScript and the production bundle. Browser checks cover stage seeking, historical selection, dependency inspection, dictionary links, return navigation, missing exports and narrow-screen layout. See the pull request for the actual run results.
