# Authority Dictionary

**by Can Valid Kohen**

A browser-based dictionary and trace explorer with a local VDfirst workbench. Prepared and recorded playback stay separate from live operations. The workbench can start a small problem, record interpreter responses, inspect support, and download or reopen its complete JSON record.

## Run locally

Install Node.js 22.13 or later and pnpm 11.19.0. From this repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. Playback and reopening saved records need no backend. No API keys, account, or AI-specific tools are required. Fonts use Google Fonts when available, with local system fallbacks.

```sh
pnpm test       # Data integrity and playback behavior
pnpm build      # TypeScript check and production build
pnpm preview    # Serve the production build locally
```

## Live workbench

Use a VDfirst checkout containing `workbench.py` and `workbench_server.py`. In that checkout, run:

```sh
python workbench_server.py --port 8765
```

Keep `pnpm dev` running in this website checkout, then open **03 Workbench**. Vite forwards `/api/workbench` to the bridge on `127.0.0.1:8765`. The bridge allows website origins on localhost/127.0.0.1 ports 5173 and 5174 by default; if Vite selects a different port, restart it on an available default port or pass the corresponding origin with the bridge's `--allow-origin` option. `pnpm preview` is for static playback and does not provide this development proxy.

Start `force_cart_0` with the bundled three-definition dictionary. Select the root's open hole and **Expand definition**. Choose the resulting `F/0` frame, supply `2 kg` and `5 m/s^2`, then use **Reduction** to record a response such as `12 N`. You can reduce the root again to `Prediction: 12 N`, reopen the child reduction, and supply `10 N` to see the old support move to history. All numerical responses come from the user; the engine does no arithmetic verification.

**Download full record** saves the exact dictionary, question/context, engine identity, commands, event evidence, frames and every snapshot. **Open saved record** reads a JSON file locally, without contacting the bridge. Imported records are read-only until **Validate with local engine** reproduces their history and checks consistency. Scientific claims remain unchecked after this validation. Existing records and entered responses survive failed calls; opening or starting another record keeps the former record available for the current visit. Download to preserve work across page reloads or closure.

The workbench can expand or literally recall candidate definitions, supply input, record/reopen reductions, and edit a frame's literal prose without replacing its holes. Earlier snapshots are read-only. See [the workbench contract and limits](docs/WORKBENCH.md).

## Explore

- Choose **Try the correction example** to open a recorded root result and its partial prediction set. Move through Inputs → Mistake → Report → Reopen → Correction. **Used now** and **History only** distinguish support from retained history; every claim remains unchecked.
- Select a claim to inspect its exact stimulus, response, frame evidence and recorded support. **Dependencies** offers a second presentation of the same data. **Dictionary network** preserves the playback position and links back to the original definition. See [the presentation study](docs/RESULT_PRESENTATION.md) for design findings and limits.
- Choose a dictionary: Newtonian mechanics current draft, the Newton II operational snapshot, Newton kinematics, or Toy force. No dictionary is selected initially.
- Select an entry in the list or map to see its definition, references, and incoming references.
- Browse without a trace, or choose an available trace. Play, pause, move between steps, or restart.
- Switch between **Focused view** and **Full dictionary** without losing your trace position. Full dictionary includes every headword; select one to read all its definitions.
- Zoom, drag to pan, or use **Fit all**. **Follow trace** starts enabled and keeps the starting node, highlighted history, current participants, and flattened occurrences in view as you step. Compact playback controls sit directly below the network.
- The starting headword keeps its START badge. Directed traversed edges accumulate as the trace proceeds; reciprocal edges curve separately.
- The recorded Newton II trace shows its two self-label occurrences separately. They dim and receive a FLATTENED label at the corresponding events. Other occurrences of the same headword remain available.
- Choose **Newtonian mechanics · Newton II snapshot** → **Newton II · given inputs** for the new seven-stage run. It binds p1, a net force of (6, 0, 0) N and a mass of 2 kg, flattens the acceleration self-label, then records the supplied result (3, 0, 0) m/s². Cyan dashed connections identify given inputs separately from lime dictionary traversals.
- Select a numbered step or a headword in its active fragment to inspect it.
- Browsing an entry pauses playback. Switching dictionaries preserves each dictionary's step and selection during the current visit. Reloading starts a fresh visit.

The map's lines denote headword references. They do not assert physical causation. Prepared examples and recorded playback have distinct labels. Only explicit Workbench actions contact the local engine; playback never executes it. The website does not perform the recorded arithmetic. The Newton II run's arithmetic reductions were supplied by its interpreter. The kinematics example preserves literal substitution, even where the resulting prose is awkward.

The current Newton Design 2.1 draft has 26 definitions across 21 headwords and is unfinished. The operational snapshot has 45 definitions across 34 headwords and is the exact dictionary used by both saved Newton II runs. These are separate versions; recorded traces are only offered for their matching snapshot. Multiple definitions for a headword are preserved in the inspector.

## Project layout

```text
src/App.tsx               Interface and playback timer
src/Graph.tsx             Headword network and occurrence overlays
src/TracePlayer.tsx       Playback controls and active fragments
src/ResultView.tsx        Root result, claim list and evidence inspector
src/predictions.ts       Pure relevance and recorded-support selectors
src/Workbench.tsx        Local trace controls, saved history and record import/export
src/traceRecord.ts       Structural record validation, API boundary and display adapter
src/workbench.css        Responsive workbench presentation
src/data/correction*     Pinned VDfirst export and explicit display adapter
src/traceGraph.ts         Step-derived start, traversal, input, and flatten state
src/graphScene.ts         Focused/full layouts and trace-following camera geometry
src/graphGeometry.ts      Separated directional paths for reciprocal references
src/styles.css           Responsive visual design and accessibility states
src/player.ts            Pure playback and selection state transitions
src/data/dictionaries.ts Source definitions and explicit references
src/data/traces.ts        Trace contract and prepared examples
src/data/newton-*.ts      Current draft, operational snapshot, and recorded trace
tests/*.test.ts           Data, playback, source fidelity, and visibility checks
docs/DATA_FORMAT.md       Provisional interface for examples and future output
docs/SOURCES.md           Source selection and semantic limitations
docs/WORKBENCH.md         Live protocol, local execution and saved-record boundary
VD_WEBSITE_BRIEF.md       Original agreed product brief
```

## Hosting

The site builds to `dist/` and is portable to any static host. Relative asset paths support both a repository subpath and a custom domain.

`.github/workflows/check.yml` validates pull requests and main-branch changes. `.github/workflows/pages.yml` provides a **manual** GitHub Pages deployment of the main branch. To publish after review:

1. Merge the reviewed prototype into `main`.
2. In repository Settings → Pages, choose GitHub Actions as the source. The account must support Pages for a private repository; repository visibility remains a separate decision.
3. Run **Publish website** from the main branch in Actions.

GitHub Pages can make the built website public even while the source repository remains private. Publication is a deliberate step; opening or merging a pull request does not run this deployment workflow.

The deployment workflow follows the [Vite static deployment guide](https://vite.dev/guide/static-deploy.html#github-pages). No Sites service or proprietary deployment tooling is required.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). The workbench extends the original brief with explicit local engine operations and browser-local record files. Public uploads, accounts, cloud storage and external-agent APIs remain future scope. Existing VD-Newton source extracts are unchanged.
