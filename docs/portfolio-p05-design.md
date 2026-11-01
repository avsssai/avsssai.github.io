# P05 static comic lettering and paper reveal

## Next-session priority: replace the rejected reveal

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
