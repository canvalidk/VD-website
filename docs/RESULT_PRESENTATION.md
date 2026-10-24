# Result and prediction-set presentation study

24 October 2026. An implemented exploration, not a settled interface specification or a user study.

## Working direction

Start with the root result, then let the reader ask what it relies on. The dictionary network and active fragment answer different questions and remain available in a separate workspace view. Switching views preserves trace position. Browsing a dictionary entry opens its definition; selecting a claim opens claim evidence.

The correction example opens on `Prediction: 10 N`. Five named snapshots let the reader revisit the supplied inputs, deliberate mistake, dependent report, reopening and correction. Each stage has its own frozen result and prediction set. A short change line explains which claims entered support or moved to history since the preceding snapshot.

The default claim list is grouped by **Used now** and **History only**, with an **Unknown** group when coverage cannot establish relevance. Each row shows its original ID, reader category, recorded response, stimulus and verification state. Selecting one opens the exact claim, before/after frame text, operation and event index. Recorded source entry indexes link back to the dictionary. Parameterized calls remain literal; the browser does not infer references from them.

An alternative **Dependencies** view lets the reader inspect one claim's recorded support. This is a flat set, since the producer exports transitive support. No direct dependency graph, minimal proof tree or physical causal graph is inferred.

## Iterations and observations

- Putting claims only beside the active fragment would obscure which root result they support. The new root-result panel is distinct from the existing fragment player.
- The first browser version opened above the result. The example action now brings the result into view, initially selects the calculation, and resets the study's filters.
- Dictionary selection originally left the claim inspector visible. Entry selection now opens the dictionary view; returning to the result preserves the trace position.
- Long desktop claim details initially extended below the viewport while sticky. The inspector now scrolls internally, keeping its source and evidence controls reachable.
- On desktop the evidence inspector sits alongside the list. On narrow screens it follows the list; selecting a claim brings its evidence into view and offers **Back to claims**. Filtering alone keeps the reader at the list.
- A claim list works as the starting view: the support/history difference is visible without learning a graph convention. The support-set view is useful for tracing a consumer, and remains secondary.

These observations come from implementation and browser checks. They need testing with other readers and larger traces before being treated as usability findings.

## States that must stay separate

| State | What the interface can say |
| --- | --- |
| Trace complete | No open demands; arithmetic may still be expressed as an instruction |
| Current support | Recorded response lineage used by this root result |
| History only | Retained claim excluded from current support when selection is complete |
| Support unknown | Missing evidence prevents that exclusion |
| Category | A reader's classification, such as calculation; no verdict |
| Verification | The export's verification field; all demo claims are unchecked |
| Prediction coverage | Partial; no full VD disjunction or theory verdict |

The deliberate `12 N` response is labelled a mistake by the scripted demonstration. The website does not discover the error. `10 N` is another recorded interpreter response. Neither response gains certification from appearance, colour, settlement or inclusion in support.

## Data boundary and next experiments

The included VDfirst schema-2 snapshots are real exports from `correction_demo.py`; the website adapter supplies only display labels and explicit dictionary links. The interface neither runs VDfirst nor reconstructs claim evidence from the older condensed Newton playbacks. Those playbacks show **No prediction-set export for this step** if the reader opens the result view.

Before extending this beyond the example:

1. Export authoritative root snapshots and event/frame identities for other traces, alongside active fragments.
2. Try a larger claim collection: grouping by frame/category, search, and a compact summary without hiding individual claims.
3. Add a producer-supplied direct dependency relation before drawing direct arrows.
4. Design alternative items and checking outcomes once their engine representation exists. Do not turn the present support list into the full prediction disjunction by changing its label.
5. Test whether readers understand used/history/unchecked independently, including a settled but uncalculated residual.

## Validation

`pnpm test` exercises source fidelity, support changes, historical evidence retention, unknown coverage, transitive support and compatibility with existing graph/playback behavior. `pnpm build` checks TypeScript and the production bundle. Browser checks cover stage seeking, historical selection, dependency inspection, dictionary links, return navigation, missing exports and narrow-screen layout. See the pull request for the actual run results.
