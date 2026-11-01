# P05 WIP deployment

## Authorization and scope

The owner explicitly requested immediate deployment as a work in progress and deferred the remaining complete testing and release review. This supersedes the earlier no-merge/no-deploy holds in the historical P02–P05 review documents. P06 content work remains outside this release.

The paper-cut stage, original flat comic SVG lettering, cream paper peel, and cartoon walking routes were landed through PRs #11, #9, and #8. The final parent-branch tree exactly matched implementation commit `8752f179adeb2372bc381dd9b3409d1b5ebe1547`; the first deployed main commit is `4a46d40e8dffcea159a943d8032f164158293d93`.

- Public site: <https://avsssai.github.io/>
- Successful first deployment: <https://github.com/avsssai/avsssai.github.io/actions/runs/41317307438>
- Landing PR: <https://github.com/avsssai/avsssai.github.io/pull/8>

## Evidence completed

Before landing: 50 pure tests, production build, six local Chrome/Firefox smoke cases, and 96 exact outbound/homeward route comparisons passed. The Windows formatting check failed on inherited CRLF line endings; all 66 flagged files passed read-only in-memory LF normalization. Formatting and the build also passed in the first Linux main CI run.

After the first deployment, a quick actual public-site Chrome check at a 390×844 desktop viewport verified HTTP 200, the original comic lettering, the ready enhanced scene, the paper-stage asset (HTTP 200), the homepage browser-bar color, and native Work navigation, with no page errors. Public intro/homepage screenshots were captured and the homepage screenshot was inspected. This is not physical-phone verification.

Local evidence lives outside the repository in `../portfolio-evidence/p05-live/` and `../portfolio-evidence/p05-release-*`.

## CI follow-up

The new Linux CI smoke check initially rejected the supported WebGL fail-open path in headless Firefox: its admission predicate allowed `ready` and `complete` but omitted the documented terminal `failed` reveal state. The failure screenshot showed the usable static homepage, not a stuck cover. The predicate now includes that state; subsequent checks still require the cover to be removed, native content and theme controls to work, and navigation to succeed. This follow-up changes the test harness only, not the deployed design. Existing automated checks remain enabled.

## Explicitly deferred

- Full final integrated peel/walking regression rerun and post-optimization performance measurement.
- Fresh independent release review.
- Physical touch-device, Safari/WebKit, and screen-reader validation.
- P06 real case studies, additional verified contact/social information, and content polishing. The Work page intentionally states that case studies are not published and links to GitHub; no invented projects or contact addresses were added.

The original dirty workspace was not checked out, reset, cleaned, or merged into during deployment. Only its task-owned handoff may be updated separately.
