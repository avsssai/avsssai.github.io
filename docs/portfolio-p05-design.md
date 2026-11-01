# P05 letter playground and paper reveal

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
