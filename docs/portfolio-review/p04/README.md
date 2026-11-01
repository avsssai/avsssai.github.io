# P04 character review

Each accepted hover, tap or keyboard activation randomly selects a kick or punch. Nothing attacks while the page is idle. Both moves return to the header perch, drop busy requests and cancel when the page geometry or scene changes. Reduced motion keeps selection without the travel or impact.

Artwork likeness and timing need Siva's review. The character is an original provisional SVG, not an approved portrait.

## Preview

[Play or download the 34-second walkthrough](https://raw.githubusercontent.com/avsssai/avsssai.github.io/poteto/portfolio-p04/docs/portfolio-review/p04/review.webm)

The recording shows naturally random desktop actions, a narrow viewport, reduced motion and context-loss fallback. The narrow segment uses a resized desktop browser, not a touch device. Phone taps were checked separately in the browser suite. This is a 960×600 compressed preview, 875,772 bytes. The full 1440×900 recording remains outside the repository in `portfolio-evidence/P04/recording/review.webm`. Browser media inspection measured 33.72 seconds for the source and 33.686 seconds for the preview. Video review used decoded frames rather than a continuous watch.

### Header perch

![Character beside the name](perch.png)

### Desktop kick contact

![Kick at the React object](kick.png)

### Phone punch contact

![Punch at 390 px](punch-mobile.png)

### Scene failure

![Static scene and restored character after context loss](fallback.png)

### Reduced motion

![Static artwork and usable controls with reduced motion](reduced.png)

## Checks and limits

Reviewed application `443786e979e9f5dfd315318e1bb3076b044a3c12`, based on P03 `054c9edd7b7d600e37d80226a545576248b85565`. Later gallery/recorder changes do not alter application source.

- 13 pure tests passed. Build/type checks passed with no errors or warnings and one script typing hint.
- The compact browser suite passed 11 cases without page errors. It covers hover contact, busy requests, phone tap/punch contact, keyboard focus, reduced motion, resize/scroll/motion-change cancellation, route return, context loss, missing target and twenty alternating moves. The twenty-action check observed one avatar, one reusable hidden crack, no retained WAAPI animations and no DOM growth.
- Fresh independent read-only review returned PASS+NOTES at the application SHA. The reviewer ran frozen install, 13 tests, type checks and all 11 browser cases. It audited the owner performance receipt rather than rerunning it. Same-model fresh CLI review, not a cross-family panel.
- Five interleaved cold loads per revision used Chrome 156, 1440×900, 4× CPU and an unthrottled local network. Compared with the verified P03 parent, median observed heading readiness changed by +11.7 ms. Maximum activation acknowledgment was 7.3 ms; active rAF p95 was 17 ms; settled DOM growth was zero. These are local automation proxies, not field paint metrics or an original-trunk rerun.
- Native hidden-tab and persisted-pagehide interaction cancellation were source-reviewed, not newly browser-probed. Actual-device, non-Chromium, likeness and timing approval remain open. P03's earlier lifecycle measurements are not claimed as P04 interaction tests.
- No game redesign or dedicated game checks. No merge or deployment.

Receipts remain outside the published site at `portfolio-evidence/P04/verified-live`, `verified-perf`, `review` and the build/unit logs. This gallery is for operator review, not release approval.
