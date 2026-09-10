# VD website — implementation handoff brief

Date: 9 September 2026

Status: Agreed product direction; implementation and hosting have not started.

## Purpose and audience

Create a public website for the VD project that combines light explanations with an attractive, interactive dictionary and trace explorer. Initially, the owner expects to share it mainly with friends, with very little public traffic.

The first version prioritizes visual design, interaction, and the experience of exploring VD. Extensive explanations, scientific significance, and a definitive visualization of VD semantics are not prerequisites. Visual conventions may be experimental. The eventual destination is a useful interface where humans can run real traces and comfortably inspect what happens.

## First version

Build a working visual prototype using prepared dictionary data and trace examples.

1. **Choose and browse a dictionary.** Visitors can switch between dictionaries, view entries, and explore their connections without starting a trace. Provide enough example data to make switching meaningful.
2. **Watch a prepared trace.** Visitors can select a demonstration for the chosen dictionary and watch its steps unfold. Include play, pause, step forward, and restart controls, plus a way to inspect a step's details.
3. **Explore connections between the views.** Where supported by the example data, selecting a trace step should reveal the relevant dictionary entries; selecting an entry should expose useful details. Keep the visitor's place as they explore.
4. **Get brief context.** Include short introductions and labels explaining the project and the components shown. Fuller explanations can follow later.

Clearly identify prepared playback as a demonstration. The first version does not need to execute the VD engine. The site must remain useful and interactive when no trace is playing.

## Visual and interaction direction

- Make interactive graphics central to the experience, supported by polished typography, spacing, color, and motion.
- Let visitors control the pace and inspect details. Keep selection and playback state easy to recognize.
- Use graphics to explore entries, relationships, and trace progression. Node graphs, cards, timelines, or other arrangements are candidates, not prescribed representations.
- Keep explanations concise and the main exploration controls easy to reach.
- Make the interface usable at different screen sizes, with readable text, keyboard-accessible controls, and consideration for reduced motion.

The exact style, palette, layout, animation language, and graphic conventions remain open. Choose a coherent direction during implementation and refine it through actual use. Visual experimentation is welcome; it should not imply that an illustrative trace is validated engine output.

## Proposed technical approach

These are starting recommendations, subject to inspecting the website repository and preserving any suitable existing setup.

| Area | Proposed approach |
| --- | --- |
| Application | React and TypeScript for a browser-based interactive interface |
| Graphics | SVG and CSS initially; choose additional libraries when a concrete interaction needs them |
| Development and build | A conventional setup such as Vite if the repository does not already establish one |
| Initial data | Bundled dictionary and trace examples with documented structures |
| Initial hosting | GitHub Pages for a browser-only version, with deployment from GitHub |
| Custom domain | Optional; a hosting-provided address is enough initially |

Keep dictionary data, trace production, and visual presentation separate. Define a small, documented boundary through which a prepared trace supplies steps to the viewer. Later, real execution should be able to supply those steps without replacing the visual interface. Treat this initial format as provisional until the VD engine's actual outputs have been inspected.

Static hosting can serve a highly interactive application because the browser runs its interface code. Real execution may also run in the browser if the engine is compatible and practical there. Otherwise, a backend can be added. That decision depends on the engine and is deferred.

## Future capabilities

Allow the design to grow toward:

- Running real traces against selected dictionaries, with human-friendly progress and inspection controls.
- Saving and reopening traces without rerunning them.
- Importing or uploading traces and dictionaries.

Do not implement these future capabilities merely to complete the first visual prototype. File import/export and shared online storage are different features; whether uploads are local, private, or shared has not been decided. Accounts, a public contribution portal, and an API for other AIs to use VD are outside the agreed initial scope.

## Contribution and portability

The owner wants coding assistants from different companies to help build and maintain the website. GitHub should be the shared source of truth.

- Use standard, portable code and documented dependencies. Essential development, runtime, and deployment steps must not depend on one AI provider's proprietary tools.
- Document installation, local preview, build, project organization, and relevant validation commands in the repository.
- Document example dictionary and trace formats so contributors can work on data, execution, and graphics independently.
- Use branches and pull requests for reviewable contributions; deployment should be reproducible from the repository.
- Keep contribution instructions readable by humans and different coding agents.

The public website does not require a public source repository. Repository visibility is a separate choice.

## Repository context and handoff

The owner has created a new **VD website repository**. Its exact URL and local checkout have not yet been confirmed. Implementation belongs there. This brief was prepared in the existing `codex VD code` workspace for transfer to that repository.

Related repositories are available as references:

- [VD-docs](https://github.com/canvalidk/VD-docs)
- [VD-Newton](https://github.com/canvalidk/VD-Newton)
- [VDfirst](https://github.com/canvalidk/VDfirst)

Their contents have not been reviewed for this website brief. Inspect the relevant examples when selecting initial data; do not assume that the existing dictionaries and traces already share a website-ready format. Choose the examples intended for public display rather than publishing entire reference repositories by default.

The implementation conversation should first locate the website repository, read its instructions and existing setup, and bring this brief into it. Then establish a small visual experience covering dictionary selection, independent browsing, and trace playback. Use that experience to refine the design before expanding it.

## First-version completion criteria

- A visitor can switch dictionaries and inspect entries without running a trace.
- A visitor can play a clearly labeled demonstration, pause, step forward, restart, and inspect relevant details.
- The graphics and controls feel coherent, attractive, and understandable; explanations remain light.
- The project can be run and built using documented, provider-independent commands.
- The source and example data remain separate enough to support later engine integration.
- Once the implementation is ready for publication, friends can open the hosted site without the owner's computer running.

This brief records planning decisions. Writing it does not start implementation or publish the site.
