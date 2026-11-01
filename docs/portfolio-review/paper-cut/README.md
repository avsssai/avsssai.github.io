# C — paper-cut stage with the original comic lettering

**Latest revision:** the operator liked the paper-cut direction but rejected the embossed Imagination treatment. The original illustrated comic lettering is restored, with a little breathing room around it. The terraced/extruded title renderer is removed, not merely hidden. Paper-cut surface, character journeys and peel are unchanged.

## ▶ Watch the updated phone video

**[Play the 16.5-second MP4 — 282 KB](https://raw.githubusercontent.com/avsssai/avsssai.github.io/poteto/portfolio-terrain-preview/docs/portfolio-review/paper-cut/phone.mp4)**

[![Play the paper-cut stage with restored original comic lettering](phone.png)](https://raw.githubusercontent.com/avsssai/avsssai.github.io/poteto/portfolio-terrain-preview/docs/portfolio-review/paper-cut/phone.mp4)

Light stage → React walking journey and different return → dark stage → TypeScript journey and return. Real-time capture, no audio. This clip replaces the earlier C video that still had embossed lettering.

## The combination

- Original flat comic Imagination artwork: cream/gold faces, bold illustrated ink shadow, small star and halftone details. **No stacked terrain contours or WebGL embossing on the word.** The original artwork still has its intentionally drawn comic shadow.
- A cream central sheet over offset blue and peach sheets, on a pale lilac desk.
- Uneven curved cut edges, paper thickness, contact shadows and a lifted triangular corner.
- Separate pastel paper platforms underneath the technologies; full-contrast labels.
- Existing dotted walking journeys, separately planned return routes and impact payoff. The topographic-map background remains removed.

### Desktop

![Current paper-cut stage and flat comic word on desktop](desktop.png)

### Dark

![Original comic word on the dark paper-cut stage](dark.png)

## Evidence and scope

- Source: current local uncommitted P05 work above checkpoint `a2aa474`, at http://127.0.0.1:4331/. This branch publishes **gallery files only**, not application source, a merged PR or a deployment.
- H.264 MP4: **289,113 bytes**, **16.524367 seconds**, **390×844**. Desktop Chrome portrait viewport, **not physical touch hardware**. Repeat-visit state intentionally skips the existing cream peel to show the surface and lettering immediately.
- Capture driver observed complete outbound/return/home trips and no page errors. Playback metadata and decoded frames at3/5/10/13/16seconds inspected; not a continuous-video-watch claim. [Capture events](recording.json) · [Encoded playback metadata](decoded.json).
- Current owner checks: **50 pure tests**, build/typecheck zero errors/warnings and three inherited hints; **seven focused browser cases passed**, no page errors. Checks include original accessible heading/artwork,1440/390/320 fit, dark artwork and unique SVG IDs, no word animations/canvas, walking/busy guard, cancellation/preferences, actual scene-context-loss fallback, preserved peel/Skip and no-JS work navigation. Exactly one persistent canvas remains after the repeat-visit intro is omitted.
- Earlier C checks covered all seven routes at1440/390/320. The surface and route source were not changed in this title-only revision, so those broad route passes were not repeated. Prior title-renderer draw-call metrics no longer apply: that renderer was deleted. The existing first-trip route-planning CPU cost remains a tuning item; no new cold benchmark or field/GPU FPS claim.
- Earlier read-only surface review led to full-ink labels (dark butter-paper contrast about4.84:1) and reduction of surface shadow meshes51→16. Those fixes are retained. No new independent reader was needed for restoring the prior SVG component.
- Final appearance/feel approval, physical-device, non-Chromium and screen-reader checks remain open. No automatic merge, deployment or P06.

[Previous rejected map-surface preview, retained only for comparison](../terrain/README.md).
