# P03 scene ownership

## Problem and usage

The home must remain readable without a renderer. Astro owns its heading, work link, seven labelled controls and fallback images. The canvas enhances only those images.

```astro
<StackFallback />
```

The lightweight entry mounts once on the hero. A future character controller can subscribe to activation/layout/mode changes and read a current hero-local target; it never needs a camera or React root.

```ts
const experience = mountStackExperience(hero);
const target = experience.target('react');
const unsubscribe = experience.subscribe((event) => {
  /* P04 consumer */
});
experience.dispose();
```

## Shape

`stack-items.ts` defines seven records with ID, label, colour, geometry, desktop anchor, mobile anchor and local fallback asset. `StackFallback.astro` emits CSS placement from the records. React measures the resulting artwork anchors rather than implementing another responsive layout.

`stack-bridge.ts` owns selection, deferred startup, visibility, motion preference, failure, and DOM-coordinate snapshots. Its one public mount hides that policy. `StackExperience.tsx` owns the React root, error boundary, canvas admission and teardown. `StackScene.tsx` owns R3F meshes, orthographic camera, actual projection, matte materials and one demand-rendered canvas. The bridge is an explicit additional P04 edit point; there must not be a second domain controller in the React attachment.

The scene acknowledges readiness only after an actual render containing seven meshes, on a current measured layout, without an intervening failure. Resizing/resuming restores fallback before changing the canvas. Public positions are CSS pixels from the hero border-box origin, not device pixels. Unavailable results distinguish unmeasured/disposed states; current DOM centres remain usable while scene projections are stale.

## Synthesis decision

Candidate A is the base. The fresh read-only judge scored A 23/25 and B 17/25 against static independence, placement/projection ownership, lifecycle rigor, payload/GPU simplicity and ticket fit. Candidate B's full-hero hydration was rejected: it moves working content into a hydrated tree and drops the planned Astro fallback without a necessary capability gain.

Grafts from B: explicit unavailable target results and separate attachment/renderer transfer reporting, with one aggregate deferred-byte gate. No competing application implementation was merged; both candidates were read-only sketches.

## Placement revision after operator feedback

The operator rejected the two-column arrangement as too simple. Desktop objects now use uneven anchors, different scales and individual tilts around the heading. React is the largest object; TypeScript, Python and Astro support it, while GCP, FastAPI and GitHub are smaller accents. Mobile uses a compact asymmetric arrangement below the copy instead of a uniform icon grid.

Both layouts come from the same registry. CSS controls anchor size and tilt; the scene reads those values and keeps its projected centres aligned. Labels remain horizontal HTML. Build, pure tests and the existing desktop/mobile/resize checks cover this change. No new animation, renderer or dependency is added. The earlier independent review and cold benchmark predate this placement revision.

No continuous decorative motion is added in P03. Demand rendering avoids paying an idle GPU cost without a functional purpose. P04 owns deliberate kick feedback. Reduced motion stays entirely static.

## Tradeoffs accepted

- A private DOM anchor protocol avoids hydrating copy and navigation.
- Compact layouts may scroll vertically to retain all seven controls; no target is hidden to fit one viewport. Heading, CTA and focus must remain reachable and unobstructed.
- Context loss is terminal static fallback, not an automatic retry loop.
- GPU resources are retired on pagehide; persisted pageshow remounts lazily. Server HTML is never removed.
- Original abstract technology motifs identify subjects, not official logos or endorsements.

## Verification contract

Keep the lab drivers available through explicit production mode. Test registry completeness/assets, actual projection after resize, duplicate mount/disposal, static/no-JS/reduced motion, one canvas, touch/keyboard selection, blocked import, WebGL denial, context loss, offscreen/hidden pause and persisted return. Run existing landing reflow checks as well. Measure five interleaved baseline/head cold loads at 4x CPU, all deferred enhancement bytes, first-frame readiness, rendered-frame intervals and five seconds hidden after settling. Demand-rendered idle has no continuous active frame series; do not substitute unrelated RAF samples for renderer frames.

No implementation, visual, runtime or performance PASS follows from the design verdict. Operator review and merge authority remain separate gates.
