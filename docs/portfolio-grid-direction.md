# White grid direction

## Problem and ground trace

The owner rejected the paper-cut/technology composition after its WIP deployment. Replace it with a white grid, colourful original comic lettering, a custom pointing-finger cursor, and click-to-place red X destinations. The character walks to the selected destination and stays there, not home. A new click retargets from the current feet position.

Ground pass 1 (homepage/runtime): `index.astro` → `ImaginationHero.astro` → `StackFallback.astro` → `mountStackExperience`. The bridge requires seven technology buttons and anchors, loads the R3F scene, owns lifecycle/readiness, and mounts both the interaction controller and peel. Removing just the artwork would leave invalid required anchor queries. The old interaction state machine always returns home; it cannot represent persistent destinations cleanly.

Ground pass 2 (visual/lifecycle): `walking-route.ts` already owns feet-space obstacle routing; `mountWalking` owns stepping pose and an interruptible rAF loop. `mountReveal` only requires a readiness subscription, not technology state. Its cover and peel can remain unchanged. `Avatar.ts` contains now-unwanted kick/punch machinery; do not mount it on the new homepage.

## Usage (caller's view)

`ImaginationHero` renders `GridPlayground` instead of `StackFallback`. Its initializer calls `mountGrid(root)` once. That controller handles pointer/touch/keyboard input, persistent character/marker position, route planning and cleanup. It dynamically calls `createGridRenderer(host, onFailure)`; the renderer returns only `resize()` and `dispose()`. The existing peel receives the controller's renderer-readiness subscription.

## Numbered design passes and synthesis

1. **Candidate A:** keep the shared R3F bridge, generalize technology targets into destinations, and replace stack scene meshes with a grid. Rejected: public APIs would still expose stack IDs, projected anchors, recoil, selection and return-trip phases. Hidden dummy targets would be information leakage, not reuse.
2. **Candidate B (selected):** a small independent grid controller and demand-rendered vanilla Three.js line grid. Reuse only the route planner, walking view and peel. The caller gets one mount/dispose capability; renderer internals and movement policy stay private. This removes the technology runtime from the homepage import graph rather than hiding it.

The selected shape is screened against shallow modules, temporal decomposition and pass-through APIs. No route/controller state is exposed to Three.js, and no Three.js objects are exposed to the interaction caller. Keep the grid planar and pixel-aligned so pointer and feet coordinates have one meaning.

The configured model mapping is absent (`~/.pi/agent/pstack/models.md`), no native subagent/model-switch tool or peers are available. These are numbered local design passes, not an independent configured multi-family panel. No competing writer output is merged. Implementation is isolated in `portfolio-grid`, branch `poteto/portfolio-grid`, based on deployed `b519d84`.

## Motion and interaction contract

- Occasional marketing interaction; purpose: feedback and spatial consistency. Dynamic route/stride needs the existing rAF walking view. Grid itself has no idle animation or camera movement.
- White homepage in both stored themes; document pages retain existing themes. Original comic silhouettes and drawn ink shadow, with bright flat per-letter colours, not new extrusion or embossing.
- Fine-pointer devices get a local SVG finger cursor with an explicit fingertip hotspot; no fake DOM cursor and no touch-device cursor tracking.
- A valid empty-grid click immediately replaces the single red X and shows the dotted planned path. A subsequent click cancels the old trip and plans from the current character position. Arrival leaves the character, X and route at rest. Native navigation, controls and text are not grid destinations.
- Routes avoid the heading/CTA in feet space. Invalid or unreachable destinations are rejected without placing a false destination. Header labels remain above the character and preserve native hit targets.
- Keyboard arrows choose a destination; Enter/Space commits without travel animation. Reduced motion also commits instantly. Touch taps use the same destination logic; scrolling must not count as a tap.
- Resize/scroll invalidate viewport geometry and reset the scene; visibility/page lifecycle cancels motion and releases owned resources. No idle frame loop.
- CSS grid and native content survive missing JS/WebGL; SVG walking can continue without the renderer. The peel still fails open if WebGL is unavailable.

## Tradeoffs and risks

- Accept a DOM/SVG actor and X over a Three.js line grid for crisp ink and reuse of the approved character; the grid itself really is WebGL, not CSS presented as Three.js.
- Accept a bounded viewport playground rather than a scrollable world. Resize/scroll resets are lifecycle invalidation, not the normal automatic return behavior the owner rejected.
- Keep historical paper/technology modules for lab/history for now, but do not import or render them on the new homepage.
- Physical-device feel still needs actual hardware; desktop touch emulation cannot establish it.

## Release scope

The owner reviewed the published screenshots and explicitly authorized deployment of this direction ("okay deploy"). This replaces the previous paper-cut homepage; P06 content remains outside scope.

Verification before landing: 52 pure tests, production build/typecheck, and 13 focused Chrome/Firefox browser cases passed. Coverage includes retarget-and-stop, touch-emulated destinations, 320px routing, keyboard/reduced motion, no JavaScript, the preserved peel, renderer import failure, and actual WebGL context loss. Fresh same-family read-only review found no blocker; its practical drag-away-and-back observation was fixed by tracking maximum gesture excursion and checked in the browser rerun. No configured multi-family panel is claimed.

Firefox on this Windows/Playwright installation hangs when live-resizing even a blank page from 390×844 to 320×568. The test therefore uses a fresh 320px Firefox context on Windows; Chrome still checks same-page resizing. Firefox input coordinates at that width may round by one pixel, accounted for in the browser assertions. Physical-phone, Safari/WebKit and screen-reader validation remain unperformed.

Evidence is outside the repository in `../portfolio-evidence/grid-{unit.log,build.log,browser-final.log,fresh-review.txt}` and `grid-final/`. The gallery at `docs/portfolio-review/grid/` on the gallery-only branch is a historical pre-deployment capture, not that branch's application source.
