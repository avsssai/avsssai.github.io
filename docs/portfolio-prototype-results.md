# Review the portfolio interaction prototype

This is a throwaway lab at `/lab/portfolio/`. The production homepage is unchanged. Do not treat the prototype as approved production code.

## Compare the compositions

Use the composition controls below the hero.

- Candidate A places the serif headline in the centre and objects around its edges.
- Candidate B moves the objects into a lower stage and reduces desktop headline size.

The SVG character is an original provisional drawing. It is not a confirmed likeness of Siva. The coloured CSS objects are composition placeholders. Only React is a live 3D object in this ticket.

## Compare the reveal methods

Use Paper peel to run an 800 ms CSS perspective reveal. Use 3D curl to run an 800 ms deformed mesh experiment. Neither runs automatically. Both have a skip control, a 1500 ms safety dismissal, and a reduced-motion alternative.

The paper version includes readable lettering and a folded corner. The mesh version tests curvature and lighting with an untextured sheet. It does not yet provide a text or material parity comparison. The operator chooses the visual direction after reviewing recordings.

## Test the interaction

Hover React for 150 ms on a fine pointer, tap it, or activate its labelled button. The sequence anticipates, travels, kicks, shows a local crack, and returns. It ignores requests while busy. Resizing, scrolling during travel, hiding the tab, or losing the WebGL context resets it.

The sequence uses WAAPI transforms and opacity. The marketing demonstration is an occasional deliberate interaction. The SVG and CSS remain visible without WebGL. JavaScript-disabled visitors can read the heading and follow the work link.

## Inspect the ownership decision

The caller mounts one hero with `mountPrototype(root)`. The hero owns its target record and character state. It dynamically loads `createScene(host, target, onFailure)` and disposes it on page exit.

Candidate A for architecture keeps one hero-owned controller and a small renderer adapter. It shares one DOM target anchor between the character and 3D object. This avoids a second layout model and a global event bus.

Candidate B for architecture gives independent components an event bus and shared registry. It permits later reuse, but spreads cancellation and coordinate rules across components. That extra coordination is not useful for one prototype target.

Select the hero-owned controller for this experiment. Keep geometry and GPU cleanup in `scene.ts`. Revisit the boundary before the seven-object production scene. No competing worktree was merged. Architecture exploration ran as inline passes under the parent model because fresh child launch tooling was unavailable.

## Reproduce the checks

Install with `pnpm install --frozen-lockfile`. Run `pnpm build`, then `pnpm preview --host 127.0.0.1 --port 4322`.

Run `BASE_URL=http://127.0.0.1:4322 node scripts/verify-portfolio.cjs`. Set `CHROME_PATH` if bundled Chromium is unavailable. Set `VERIFY_OUTPUT` to a writable evidence folder. Set `LANE` to run one numbered scenario.

Run `BASE_URL=http://127.0.0.1:4322 node scripts/measure-portfolio.cjs` to record homepage readiness and prototype costs. Set `BASELINE_URL` to an independently served trunk worktree for interleaved measurements.

## Read the evidence status

Browser results, measured budgets, exact head SHA, and review screenshots are pending. Update this section only after running the actual preview build. No independent model review or real-device check has been claimed.

## Read the asset provenance

The character SVG is original code drawn for this prototype. The React-inspired orbital geometry is generated procedurally. It is not a downloaded model.

Instrument Serif and Space Grotesk are copied from the existing local site assets with their OFL license files. Those files are included under `public/fonts/`. No paid font, external avatar service, or Blender project is required.
