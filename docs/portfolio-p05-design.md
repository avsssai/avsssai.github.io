# P05 static comic lettering and paper reveal

## Current visual revision: all three paper details implemented

Operator requested “do all3” after the dotted border, subtle grain and blind-embossed initials suggestions. All three are now implemented locally on the cream sheet, preserving the dangling tab and existing interaction. Not final visual approval or publishing authority.

New `peel-paper.ts` bakes deterministic low-contrast grain, a fine rounded dotted seal (20pxdesktop/12pxphone inset) and original vector “SA” initials at lower left into bounded canvases. No font/image/network dependency. Colour texture carries ink/grain and slight opposing highlight/shade edges on the initials; a height texture adds micro-relief and the blind emboss via the front material's bump map. Both share the deforming mesh UVs, not viewport overlays; the folded-back underside is unprinted. Two textures are generated once per owned renderer, capped at1536px on the longest edge, and explicitly disposed with its other resources. No extra animation loop or geometry change.

Passed38puretests (including responsive detail placement/texture bounds), build/typecheck0errors/0warnings/3inheritedhints and12affectedbrowsercases with no page errors. Actual ready/partial/reverse desktop1440/390/320/dark screenshots inspected; touch/cancel, hold, full removal, keyboard/Skip, reduced and context-loss passed. Receipts outside repo `portfolio-evidence/P05/paper-detail-{unit.log,build.log}`, `paper-details/results.json` and captures.

Fresh six-gesture4xCPU/local/Chrome156 smoke passed6gates:426draw callbacks, callbackp9511.8ms, active-rAFp9516.9ms, idle draws0, DOM287→287, Skip.4ms, retained cover nodes0, CLS.02774. `paper-detail-performance/performance.json`. Submission/cadence proxies, not hardware FPS/GPU timing/cold benchmark or heap-leak certification. No independent review or refreshed video. Earlier recordings predate both tab and texture changes. Preview4331 rebuilt/current; local/uncommitted/unpushed on base`f1622a6`, no merge/deploy/P06. Next: operator review of all three restrained details.

## Previous visual revision: cream sheet and dangling pull-tab

Operator likes the interactive peel. Requested a nice cream shade, removal of the arrow, a dangling peel indicator, and suggestions such as an inset dotted border. Implemented the explicit cream/tab changes locally; border/grain/monogram remain suggestions awaiting choice, not implemented or approved.

Front material is now warm cream`#fff0cc`, underside`#f1dbad`; the WebGL lighting/tone mapping affects displayed shades. Pending-load CSS cover matches the front colour. Replaced the floating circular arrow with a narrow cream paper tab, hinged at the actual corner, with a shaded attachment, rounded end and small embossed grip lines. Its transparent native button preserves a56x76px hit area, pointer capture and keyboard/AT activation. One1400ms transform-only settling swing ends at−9degrees, no perpetual idle animation. Intro reduced-motion omission still applies. Instructions now read “Pull the tab. Release to hold.” Geometry, spring physics and partial hold are unchanged.

36puretests, build/typecheck0errors/0warnings/3inheritedhints and11affectedbrowsercases passed. Checks include no arrow text, tab markup,44px+hit area, no running tab animation after the settling swing, desktop/390/320/dark partial+reverse, touch/cancel, full removal, keyboard/Skip, reduced and hold beyond8seconds. Desktop/phone/dark screenshots inspected. Receipts outside repo `portfolio-evidence/P05/cream-{unit.log,build.log,tab/results.json}`. No performance rerun or fresh independent review for this material/affordance revision; metrics below predate it. Earlier corner videos still show the circular arrow, not the new tab. Preview4331 rebuilt; local/uncommitted/unpushed, no merge/deploy/P06.

Recommended next detail: a fine warm-taupe dotted border, inset roughly20px on desktop/12px on phones, printed on the sheet so it bends with the peel rather than staying fixed over the page. Optional low-contrast grain or blind-embossed monogram should stay secondary; avoid adding all decorations at once. These are suggestions only.

## Interactive corner peel implementation (before cream/tab styling)

Operator approved the proposed deformable Three.js sheet and lightweight spring physics after asking to grab a corner, stop partway, leave it attached and resume/reverse. This supersedes the automatic4200ms peel below and its prohibition on a WebGL reveal. No new dependency: reuses existing Three.js. Changes remain local/uncommitted on top of`f1622a6`; no push/merge/deploy/P06. Preview4331 rebuilt/current; public gallery/video still historical. Private window or clear`portfolio-reveal-v1` to replay.

### Ownership and interaction

- `peel-math.ts`: pure screen-space corner constraints, continuous cylindrical bend and an analytic critically damped0.4s-response spring. The actual top-right mesh corner projects to the requested pointer tip; tangent and position agree at both curve joins. Controlled developable-sheet geometry, NOT a general cloth/material simulation.
- `peel-renderer.ts`: lazily loaded after real underlying scene readiness; one temporary transparent orthographic WebGL canvas over the live DOM. Shared deformed front/back geometry, separate matte materials, directional lighting and a transparent shadow receiver. No screenshot/page texture. Disposes geometries/materials/shadow map/renderer and loses its owned context on completion/skip/error/teardown. The original stack canvas/controller is unchanged.
- `reveal.ts`: native pointer capture with grab-offset preservation and two-axis direct tracking. Release retains the exact partial target; bounded release velocity produces a short settle, not momentum-projected completion. Re-grab continues/reverses, including during settling. A deliberate pull to94%of the viewport diagonal detaches on release; otherwise partial state remains indefinitely. Skip/Escape remove immediately. Native labelled slider and keyboard grip activation provide a non-drag alternative; keyboard changes render immediately rather than forcing decorative motion. Slider percentage is pull progress, not measured visible-page area.
- Raycasts only on pointer-down: covered DOM cannot be clicked invisibly; exposed native links are genuinely live. Only the grip disables native touch scrolling, no global touch/scroll lock. Document focus entering the real page dismisses the cover. Header/hero/footer begin covered.
- Renderer draws on input and spring frames only, then stops. Pending import/renderer admission remains bounded8000ms with CSS backup. Once interactive, those deadlines are cancelled so a held partial peel is never removed by the old autoplay timer. Reduced/noJS/failure/context-loss/resize/hidden/pagehide/route/dispose fail open. Ignore mobile Chrome's initial resize if width/height have not actually changed.

### Evidence and limitations

36puretests passed, build/typecheck0errors/0warnings/3inheritedhints;21currentbrowsercases passed with no page errors plus1focused covered-link test. Desktop1440/390/320/dark partial and reverse captures inspected. Cases include real mouse drag, hold beyond8s without idle draws, resume/reverse, CDP touch + touchcancel (no document scroll), full drag removal, native slider keyboard completion, keyboard Skip/focus, live exposed navigation, hidden-link suppression, real8000ms renderer-import stall with late-import suppression, renderer import/storage denial, owned WebGL context loss, resize during capture, repeat/reduced/noJS and lifecycle cleanup. First full run found a real mobile initial-resize dismissal; fixed before the passing rerun. Initial failure receipts retained. Receipts outside repo: `portfolio-evidence/P05/corner-{unit-final.log,build-final.log,final/results.json,covered-link/results.json}`; earlier failures in`corner-functional`and`corner-touch-retry`.

Focused six-gesture4xCPU smoke, Chrome156/1440x900/local, all6currentgates passed:427draw callbacks, callbackp9511.5ms, active-rAFp9516.9ms, idle draws0, DOM286→286, keyboard Skip.5ms, retained covers0, CLS.03591. `corner-performance/performance.json`. CPU submission/cadence proxies, NOT GPU timings, field FPS, a fresh cold benchmark or certified physical-device60fps. Visibility delay is now user-controlled, so the old automatic heading-delay budget does not apply.

`record-peel.cjs` now captures slow drag, partial hold, reverse and full removal. The legacy `record-presentation.cjs` delegates to it instead of waiting forever for an automatic completion that no longer exists. Desktop/phone-sized videos outside repo at`corner-recording/{desktop,phone}.webm`, metadata`recording.json`and`decoded.json`:13.36s desktop/13.64s phone. Browser metadata and4sdecodedframes inspected. These are real mouse gestures in desktop Chromium, not hardware touch; no continuous-video-viewing claim. Existing public recordings have NOT been replaced.

No independent review/panel launched for this bounded prototype. Actual-device/nonChromium/screenreader and final material/interaction approval remain open. The operator's approval to build is not approval to merge/publish or startP06. Next feel-check: release halfway, wait, resume and reverse the same sheet.

## Superseded local prototype: automatic full-screen top-to-bottom unboxing

Operator explicitly rejected the bottom-up hero curl and requested a full-page, top-to-bottom peel, slow and intentional like removing an Apple-device protective cover. This supersedes the old 1400ms preference and hero-only scope. Implemented locally on top of `f1622a6`; still uncommitted/unpushed, unmerged and undeployed. Existing public gallery/video are not current.

`reveal.ts` now mounts a fixed full-viewport decorative cover and controls under `document.body`, outside the hero containing block. Header, hero and footer begin covered. The remaining film stays below a curved separation line while a broad folded-back underside travels downward with a local shadow. Three synchronized WAAPI animations (sheet clipping, underside transform/clipping, shadow transform/opacity), no frame-loop JS or dependency. **4200ms linear pull**, with fold depth growing over the first12% to communicate initial lift rather than a rushed ease-in-out middle. It is a CSS/WAAPI 2D folded-sheet approximation, not a physical film simulation or approved Apple-fidelity result.

Skip is fixed at lower right with safe-area insets, no longer overlapping the uncovered header. It removes everything immediately and transfers focus if appropriate. Document-wide focus dismissal now includes header navigation, because the cover spans the header too. No inert content, scroll lock, blocked native links or input lock. Repeat marker is unchanged (`portfolio-reveal-v1`); use a private window or clear that key to replay. Reduced motion/no-JS omit the cover. Real readiness starts the peel; failed scene dismisses immediately. Ready-relative watchdog is4550ms and absolute cover bound8000ms (CSS safety derives from the same constant). This intentionally replaces the earlier1700/4800 bounds to permit the requested slow motion. Resize/hidden/pagehide/route/dispose still cancel all animation handles immediately.

Verification:28puretests; build/type check0errors/0warnings/3inheritedhints;14focusedbrowsercases, no page errors. Desktop1440/phone390/small320/dark sample400/1800/3400ms, fixed body-owned coverage equals viewport bounds, monotonic top-to-bottom separation, no overflow; readiness duration, resize cancellation, header-focus dismissal, keyboard skip/focus, timeout, error/storage denial, repeat, reduced, noJS and lifecycle passed. Owner inspected actual desktop/390/320/dark phase screenshots, not a claim of continuous video viewing. Receipts outside repo `portfolio-evidence/P05/unboxing-{unit-final.log,build-final.log,final/results.json}`.

Added `scripts/record-peel.cjs` for compact actual-speed desktop and phone-sized browser videos: `portfolio-evidence/P05/unboxing-recording/{desktop,phone}.webm`, metadata `recording.json`. Observed ready-to-dismiss4201.9/4206.1ms. Phone video is desktop Chromium at390x844, not hardware. Earlier public video remains historical.

One-pair smoke only, Chrome156/1440x900/4xCPU/local: all6existinggates passed after explicitly updating timing expectations to the requested slower budget. CLS.03645, ready-dismiss4241.2ms, stalledcover5333.3ms (scene-error path, not exercise of absolute8000ms deadline), keyboardack.5ms, DOM277→277. Full-cover-removal heading proxy5961ms vs original trunk424.9ms, +5536.1ms intentional visibility cost; progressive exposure is not measured separately. `unboxing-smoke/performance.json`. No new five-run benchmark or active-peel frame-pacing claim; animated clipping may paint. No independent reviewer/panel launched. Next: operator feel-check of this full-page downward peel; actual hardware/nonChromium and visual approval remain open. No P06.

## Rejected local prototype: bottom-up hero curl

Implemented locally on top of `f1622a6` in `portfolio-p05`; not committed, pushed, merged or deployed. The selected comic title and P04 choreography are unchanged. Preview `http://127.0.0.1:4331/` has been rebuilt with this prototype.

The sheet no longer rotates or translates as a panel. Its attached area is clipped along a curved bottom edge while a separate shaded underside curls upward. Two synchronized WAAPI animations use the existing 1400ms duration and MOVE curve. The curl has a dark lip, convex highlight and local cast shadow; its depth is bounded by hero width as well as height so it does not become a large pill on phones. No dependency, WebGL reveal or per-frame JS loop. The animated clip-path may incur paint; no compositor-only or frame-budget guarantee is claimed.

The first capture was overly rounded on phones; reduced curl depth and gentler dark-theme highlights were applied before the final captures. Owner inspected final desktop, 390px, 320px and dark samples, including middle/late phases. These are a 2D rolled-edge illusion, not a physically simulated sheet or an operator-approved final design. Existing public gallery/video remain historical and do not show this local prototype.

Essentials passed: 28 pure tests; build/type check (0 errors, 0 warnings, 3 inherited hints); touched formatting and diff check; 13 focused browser cases with no page errors. Four peel cases pause both animations at 250/650/1000ms and check curved clipping, visible underside and no horizontal overflow. Remaining cases cover readiness/duration, resize cancellation, keyboard skip/focus, timeout, failed import/storage denial, repeat, reduced motion, no-JS and lifecycle cleanup. Receipts outside repo: `portfolio-evidence/P05/peeling-{unit.log,build-final.log,final/results.json}` and phase screenshots in `peeling-final/`.

One-pair smoke only, Chrome156/1440x900/4xCPU/local: all six existing gates passed; CLS 0.03253, ready-to-dismiss 1409.8ms, stalled cover 4812.9ms, keyboard skip acknowledgment 1ms, DOM277→277, no lettering animations/demo. Uncovered heading cost +2355.6ms against original trunk7cf8da1 in this single pair, not a fresh benchmark. Receipt `portfolio-evidence/P05/peeling-smoke/performance.json`. That driver does not measure active peel frame pacing; no such performance result is claimed.

Immediate skip and all old cleanup/deadline paths now cancel both animations. No new independent reviewer or panel was launched for this small prototype; configured pstack model file remains absent. Next action: operator feel-check of the bottom-up curl, then refine only if needed. Actual hardware, non-Chromium and final visual approval remain open. No P06.

## Prior handoff: replace the rejected reveal

Latest operator feedback: "I dont like the paper reveal I want it like a peeling efffect". The comic/cartoon lettering remains selected. The current paper motion is **not visually approved**, even though its functional checks pass.

The current implementation rotates/translates a flat rectangular cover, with a static folded-corner decoration. It does not visibly bend or curl as the sheet separates. The next revision should explore a convincing paper peel: a lifting edge/corner, visible curl or folded underside, and local shadow/highlight that communicates separation while revealing the page underneath. This is the working interpretation of "peeling effect", not approval of a particular corner, direction, renderer or implementation. Settle the look in a small real-hero prototype before expanding it. Do not merely slow the existing panel or rename it a peel.

Keep the selected static comic word, P04 character interaction and existing content. Preserve immediate skip, fail-open/no-JS/reduced/error behavior, real readiness, repeat-visit handling, keyboard focus and bounded dismissal. Retain the existing 1400ms preference and safety bounds unless the operator changes them; do not sacrifice usability to achieve the curl. No new library or WebGL reveal is preapproved.

Resume in `reveal.ts`, `presentation.css` and their `reveal-state.ts`/bridge integration; update affected browser/recording drivers only as needed. Keep verification essential-only: touched formatting, pure tests, build/type check, actual desktop/phone peel inspection and focused skip/reduced/failure/cancellation checks. Do not redo P01-P04, redesign the word or begin P06. The current screenshots/video show the rejected flat-panel motion and are historical visual evidence, not the requested finished effect.

This handoff update changes documentation only. No new peel has been implemented or tested. P05 remains unmerged and undeployed.

## Selected direction

The operator rejected the original animated letters, reviewed three static studies and selected the comic/cartoon title. The homepage now defaults to `StaticLettering` with the comic variant: cream/gold letter faces, chunky ink extrusion, uneven letter angles, stars and a small halftone accent. No word animation or demo control remains. The readable source word still forms one complete accessible heading.

`StaticLettering.astro` embeds the local licensed-font-derived SVG outlines at build time. It does not wait for JavaScript, font downloads or an image request to render the artwork. Light/dark gradient IDs are namespaced; an initial dark-theme screenshot exposed duplicate-ID paint failure, fixed before the final captures. The inline vector markup has no animation. Its existing natural text reserve keeps the heading layout stable.

Removed `ImaginationLetters.astro`, `letters.ts`, `letter-effects.ts`, bridge mount/dispose calls, orphaned letter CSS and demo-specific driver code. No dependency was removed. The 1400ms paper reveal, its skip/deadlines and P04 character choreography were deliberately kept unchanged. Prior architecture/design comparisons below describe the original animated version, not current letter ownership.

Current source verification at3819fdf:28puretests,build/typecheck,7affectedP05cases,2additionalpeel/skipcaptures and1inheritedcharactereffectcase passed. No page errors. A one-pair4xCPU smoke probe passed reveal/CLS/skip/static-word gates; it is not a new five-run benchmark. Earlier independent review/performance receipts predate this selected static implementation. Actual-device/non-Chromium/final integrated visual review remain open.

## Earlier animated implementation design

The following is retained as historical rationale. Its letter-controller references are superseded by the selected direction above.

## Problem

The scene bridge already owns scene lifetime, valid first-frame reports and P04 interaction. P05 adds decorative typography and a skippable paper entrance without giving React another controller or making navigation depend on WebGL.

## Grounded ownership

`StackFallback.astro` bootstraps `mountStackExperience(root)`. The bridge measures HTML anchors, waits for intersection, schedules the heavy import after 200 ms and accepts a ready report only for the current generation/layout, seven points and at least seven draws. Import completion alone is not readiness. Static mode can mean initial fallback, reduced motion, failure or temporary suspension. The scene's five-second import timer starts too late to bound cover lifetime.

`ImaginationHero.astro` owns the natural h1 and CTA. The header is outside the hero. P01 selected a 1400 ms CSS/WAAPI paper peel, with clipping on the decoration alone. No prototype text or mesh is copied into production.

## Usage

```ts
const letters = mountLetters(root);
const reveal = mountReveal(root, handle.subscribeReadiness);
// Bridge teardown:
reveal.dispose();
letters.dispose();
```

The bridge exposes one replaying subscription, `subscribeReadiness(listener)`, returning an unsubscribe function. Its typed values are pending, ready, failed and reduced. No public snapshot getter, DOM polling or React renderer types are needed by the reveal.

## Shape

- `reveal-state.ts` owns loading/ready/revealing/complete/failed transitions, the 1400 ms peel, absolute 4800 ms cover cap and caught versioned storage access.
- `reveal.ts` owns cover admission, real readiness subscription, timers, skip, focus, WAAPI and teardown. The cover is absent from server HTML. Escape paths are armed before insertion. It is hero-local and pointer-transparent; no inert content, scroll lock, modal or intercepted navigation. Skip removes synchronously. A focused skip transfers focus to the work CTA. Focus entering covered content also skips.
- `ImaginationLetters.astro` retains the full natural word in one text node. Empty aria-hidden decoration markup does not alter its accessible name. Runtime glyphs use Range measurements, not layout-affecting character wrappers.
- `letter-effects.ts` maps six deliberate indexes to stretch, ink offset, outline and a small colour burst. The source word always remains readable. `letters.ts` owns reusable glyphs, one animation at a time, pointer exploration and a single labelled touch/keyboard demo. Unassigned letters remain still; punctuation is untouched.
- `presentation.css` owns decorative clipping, a static folded corner, effect colours and CSS deadline hiding as a backup. It never clips actual hero content.

One replay subscription hides readiness derivation and same-mode failure notifications. The bridge composes and disposes both DOM modules alongside P04. React/StackExperience.tsx needs no change: it already supplies the valid first frame.

## Synthesis decision

Two fresh read-only CLI candidates and a fresh blind judge compared bridge composition with a typed readiness subscription against an Astro presentation coordinator with a MutationObserver adapter. Candidate A won 22/25 over B's20/25. A owns composition in the bridge. From B retain ready-relative watchdog, focus/visibility dismissal, bounded glyph geometry and cancellation. Reject the extra coordinator and DOM attribute protocol, which duplicate knowledge the bridge already owns. Remove A's redundant readiness getter and unused revision payload.

Native subagent tool and model configuration were absent. All three fresh CLI passes explicitly used `openai/gpt-6.1-sol:medium`. This is fresh-session review, not model-family diversity. Candidate/judge and grounding receipts remain in `portfolio-evidence/P05` outside the repository.

## Motion and failure policy

Purpose is occasional explanation and feedback, not an idle animation. Existing OUT/MOVE curves are reused exactly. Letter transforms/opacity run for480ms; the explicit demo sequences the six effects. Pointer motion requires hover/fine pointer. Reduced motion suppresses glyph motion and the peel, with the natural heading and selection intact.

Real first-frame readiness starts the1400ms peel immediately. A1700ms ready-relative watchdog and independent4800ms insertion-relative deadline remove it even if animation completion fails. The absolute cap can truncate a peel begun near the deadline. Skip, failure, reduced motion, resize, hidden document, pagehide or route swap remove it immediately. CSS hides residual decoration at4800ms as defense in depth, not a hard real-time guarantee during a blocked browser thread.

Repeat visits omit the cover. Storage denial behaves as a first visit and never throws. No percentages are invented. Pagehide cancels glyphs; bfcache return does not replay the entrance. Normal teardown removes elements/listeners and cancels animations. Astro route events are supported without adding a router.

## Accepted tradeoffs and open gates

The entrance intentionally costs first-visit heading visibility; the performance receipt must report that cost separately from static heading readiness. Header navigation remains outside the cover. A short descriptive demo label is functional UI, not new portfolio content. Actual hardware, non-Chromium, final typography/peel approval and likeness remain open. No game work or P06 content changes.
