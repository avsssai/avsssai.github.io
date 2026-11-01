# P04 character interaction

## Problem and traced integration

`StackFallback.astro` mounts `stack-bridge.ts`. That bridge owns HTML selection, layout revisions, lazy scene attachment, projection reports, failure and lifecycle. `StackExperience.tsx` owns the React root and error boundary. `StackScene.tsx` owns camera and meshes. Its reported target centres are hero-local CSS pixels. The header image lives outside the hero. P04 must not introduce a second selection or layout owner.

Grounding pass: source trace of those four files, `SiteHeader.astro`, and the lab controller. The prototype receipt records 150 ms dwell and a 1,088 ms observed sequence; production retains its 110/300/130/160/300 ms phases (1,000 ms nominal plus scheduling), not a new timing claim.

## Usage first

```ts
const character = mountInteraction(root, handle);
// Native bridge click selection emits activation; subscribers observe it.
// Scene/layout invalidation cancels the character.
character.dispose(); // before bridge/scene disposal
```

The bridge exposes `target(id)`, `subscribe(listener)` and `recoil(value | null)`. Selection remains independent of animation eligibility. The scene accepts a transient `{id, amount}` pose, not phases or timing.

## Shape

`interaction-state.ts` has a discriminated idle/active state and a pure reducer. Active states carry exactly one target ID and one move. The operator subsequently requested randomly varied interactions: each accepted activation chooses kick or punch with equal probability, once per sequence. The striking phase matches that move; busy requests cannot replace it. Only activate-from-idle, advance, cancel and target-lost exist. There is no queue and no spontaneous idle attack.

`interaction.ts` owns dwell, all six phases, WAAPI handles, one recoil frame callback, generation guards and environmental cleanup. `Avatar.ts` constructs the original SVG view from the same local source as the static header image. It is a plain DOM view, deliberately not a React component or `.tsx` file: no React dependency is needed for the character. Existing artwork already has separate head, arms, legs and body. Hair, face, clothing and proportions remain editable paths in `public/art/portfolio/character.svg`. Likeness remains provisional.

The view is an absolutely positioned, pointer-transparent hero overlay. Header and projected target coordinates are both converted to hero-local CSS pixels; negative header Y is intentional. The extended foot or fist anchor is derived by rotating its actual SVG endpoint around the matching joint. Contact is offset from the projected centre toward the near edge of the sculpture using the existing target's measured size; the character does not fly into its centre. Only transforms and crack opacity animate; no per-frame React state or layout writes. Recoil moves an inner sculpture group, preserving projection and P03 placement.

## Synthesis decision

Fresh read-only Candidate A proposed imperative bridge-owned SVG; Candidate B proposed a portal in the existing React root. A fresh blind judge scored A 24/25 and B 18/25. A is selected: it keeps cancellation independent of React/WebGL attachment and avoids per-frame external-store renders. From B retain explicit coordinate conversion and frozen flight geometry. A hero-local overlay replaces the suggested body-fixed overlay so projection and actor share the existing coordinate space directly. No application code was delegated or merged from either reader.

Models/config limitation: native subagent and the configured models file were unavailable. Separate fresh CLI readers and judge used explicit `openai/gpt-6.1-sol:medium`; no cross-family diversity is claimed. Candidate artifacts and judge receipt are in `../portfolio-evidence/P04/`.

## Motion and cancellation

Occasional explanatory interaction and feedback; no entrance or idle animation. WAAPI uses the prototype's strong OUT and MOVE curves. Fine-pointer hover waits 150 ms; leaving clears dwell. Native clicks support tap, Enter and Space; keyboard motion is explicitly required by P04, not an added shortcut effect. Busy triggers are dropped. Reduced motion or unavailable scene keeps native selection but suppresses the sequence.

Resize, captured scroll, hidden document, pagehide, reduced-motion change, scene/layout invalidation and disposal cancel the flight and restore the static image. A persisted return starts fresh, never resumes motion. Generation guards prevent old rejected promises from resetting a newer flight. One reusable local crack is hidden after impact; no growing fragment collection, screen shake or flashing layer.

## Tradeoffs and open gates

- Reuse the provisional original rig rather than invent an approved likeness.
- Plain SVG/WAAPI avoids adding GSAP for a single fixed sequence.
- Cancel instead of retargeting across resize/camera changes; controls remain available.
- Operator likeness/timing approval, actual device and non-Chromium checks remain open.
