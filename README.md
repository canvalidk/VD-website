# Authority Dictionary

**by Can Valid Kohen**

A browser-based dictionary and trace explorer. The explanation is a separate first section; the second section starts with one unpicked dictionary selector. The prototype includes four dictionary options, three prepared demonstrations, a condensed recorded Newton II trace, and linked entry inspection.

## Run locally

Install Node.js 22.13 or later and pnpm 11.19.0. From this repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. No API keys, account, backend, or AI-specific tools are required. Fonts use Google Fonts when available, with local system fallbacks.

```sh
pnpm test       # Data integrity and playback behavior
pnpm build      # TypeScript check and production build
pnpm preview    # Serve the production build locally
```

## Explore

- Choose a dictionary: Newtonian mechanics current draft, the Newton II operational snapshot, Newton kinematics, or Toy force. No dictionary is selected initially.
- Select an entry in the list or map to see its definition, references, and incoming references.
- Browse without a trace, or choose an available trace. Play, pause, move between steps, or restart.
- The starting headword keeps its START badge. Directed traversed edges accumulate as the trace proceeds; reciprocal edges curve separately.
- The recorded Newton II trace shows its two self-label occurrences separately. They dim and receive a FLATTENED label at the corresponding events. Other occurrences of the same headword remain available.
- Select a numbered step or a headword in its active fragment to inspect it.
- Browsing an entry pauses playback. Switching dictionaries preserves each dictionary's step and selection during the current visit. Reloading starts a fresh visit.

The map's lines denote headword references. They do not assert physical causation. Prepared examples and recorded playback have distinct labels. The website does not execute the VD engine or perform the recorded arithmetic. The Newton II run's arithmetic reductions were supplied by its interpreter. The kinematics example preserves literal substitution, even where the resulting prose is awkward.

The current Newton Design 2.1 draft has 26 definitions across 21 headwords and is unfinished. The operational snapshot has 45 definitions across 34 headwords and is the exact dictionary used by the saved Newton II run. These are separate versions; the recorded trace is only offered for its matching snapshot. Multiple definitions for a headword are preserved in the inspector.

## Project layout

```text
src/App.tsx               Interface and playback timer
src/Graph.tsx             Headword network and occurrence overlays
src/TracePlayer.tsx       Playback controls and active fragments
src/traceGraph.ts         Step-derived start, traversal, and flatten state
src/graphGeometry.ts      Separated directional paths for reciprocal references
src/styles.css           Responsive visual design and accessibility states
src/player.ts            Pure playback and selection state transitions
src/data/dictionaries.ts Source definitions and explicit references
src/data/traces.ts        Trace contract and prepared examples
src/data/newton-*.ts      Current draft, operational snapshot, and recorded trace
tests/player.test.ts      Cross-dictionary data and playback checks
docs/DATA_FORMAT.md       Provisional interface for examples and future output
docs/SOURCES.md           Source selection and semantic limitations
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

Read [CONTRIBUTING.md](CONTRIBUTING.md). The original brief's engine execution, uploads, saved traces, accounts, and external-agent APIs remain future scope.
