# P03 scene preview

[PR #9](https://github.com/avsssai/avsssai.github.io/pull/9) adds the shared stack scene on top of [P02 PR #8](https://github.com/avsssai/avsssai.github.io/pull/8). Neither PR is merged.

These captures use application commit `8e8170b12e3337c7a24cbb1a36567c9cbe69cedf`. Seven original abstract technology objects share one canvas. Labels and selection controls stay in HTML. The character kick and paper reveal are later work.

## Desktop

![Desktop shared scene](desktop.png)

## Mobile

![Mobile scene at 390 CSS pixels](mobile.png)

## Dark theme

![Dark desktop scene](dark.png)

## WebGL failure

This image follows real WebGL context loss. SVG artwork replaces the canvas without removing labels or navigation.

![Static fallback after context loss](fallback.png)

## Reduced motion

Reduced motion uses static artwork and does not download the React/Three scene.

![Reduced-motion static artwork](reduced.png)

## Walkthrough

[Download or open the 35-second walkthrough](https://raw.githubusercontent.com/avsssai/avsssai.github.io/poteto/portfolio-p03/docs/portfolio-review/p03/review.webm).

The video shows desktop light and dark, HTML keyboard selection, the mobile layout, context-loss fallback and reduced motion. Encoded duration is 34.76 seconds; the recorder measured 35.063 seconds wall-clock. The coordinator inspected six decoded frames rather than claiming a continuous watch. Recording metadata is in [recording.json](recording.json).

## Checks and limits

Build/type checks and four pure tests passed. The initial browser run passed the scene, mobile, keyboard, fallback and resize scenarios. The existing landing driver passed 19 scenarios, including no JavaScript and real Chrome 200% zoom. Focused independent review checks the final application checkpoint separately.

Five interleaved P02/head cold loads at 4x CPU measured a -20.3 ms median heading delta, at most 312,231 deferred transferred bytes and a 1.866-second maximum first usable scene frame. Maximum observed CLS was .02465. These are local automation proxies, not field Web Vitals.

The scene renders on demand. A ten-second resize workload measured 17 ms browser p95 frame intervals. This is not continuous WebGL animation FPS. A genuine hidden Chrome tab recorded zero draw calls for five seconds after settling and resumed rendering afterward.

The first idle measurement included pending final-resize frames and failed. A targeted rerun after 500 ms settling recorded zero idle draws. The original failed receipt remains in the local evidence directory.

Operator visual approval, actual-device testing and non-Chromium release checks remain open. No game tests ran. These screenshots are evidence for review, not permission to merge or deploy.
