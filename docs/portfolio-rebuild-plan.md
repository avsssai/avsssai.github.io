# Build the illustrated portfolio plan

Replace the portfolio for visitors who want to understand Siva's work and explore his design skills.
Build an original 2D SVG character, a monochrome editorial layout, coloured WebGL stack objects, and accessible interactions.
Keep Astro, static hosting, existing routes, and readable content without JavaScript.
Run tickets P01, P02, P03, P04, P05, and P06 in that order.
Treat these identifiers as local ticket IDs, not GitHub PR numbers. Matching GitHub issues are linked in Appendix D.
Do not deploy or merge as part of this plan.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-stack.md` from the installed poteto-pi package. Build one sequential PR per ticket. The operator reviews and lands P01 through P06. No owner merges or deploys. Review the prototype before starting production interaction work.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

Treat all new paths below as proposed until their ticket creates them. Use the current working tree only after preserving its existing changes. Keep evidence under `artifacts/portfolio/<ticket>/<sha>/` outside published site assets. Do not commit large recordings.

## Program checklist

### Arm the program

- [ ] State this plan and the protocol to the operator. Start execution only on explicit go. Save the approval in the decision log.
- [ ] Adopt this run objective on go. "Execute docs/portfolio-rebuild-plan.md in order P01, P02, P03, P04, P05, P06. Require unit, live, and perf evidence at every head. The operator merges. Finish with a verified linear stack and no deployment."
- [ ] Resolve the installed skill root and model configuration. Record available role models in the decision log. Do not invent missing selectors.
- [ ] Read the execution playbook, swarm, opening-a-pr, how, architect, animate, no-comments, and unslop skills before their matching work. Use installed copies because this repository does not contain `skills/`.
- [ ] Record `git show origin/main:package.json` and the trunk SHA. Read the current files separately because the working tree contains uncommitted work.
- [ ] Re-read the run objective and installed execution playbook on each audit tick.
- [ ] Arm a 30-minute audit tick through a bash polling loop with a cap of 16 iterations. Log each tick. Stop the loop at completion.
- [ ] Use this tick prompt. "Re-read the execution playbook from trunk and the run objective. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then send the operator a status message, whether or not anything changed, with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers."
- [ ] Substitute the installed playbook for the trunk playbook in that prompt until the repository has its own copy. Log that substitution. On hold, send every owner a zero-writes order.

### Run owner passes

- [ ] Preserve the dirty working tree before creating isolated writer worktrees. Record each original path and its disposition. Do not reset or delete existing work.
- [ ] Run one owner pass per ticket under the execution playbook. Record its model, branch, head SHA, parent, and evidence paths.
- [ ] Follow the chain P01 then P02 then P03 then P04 then P05 then P06. Base each child on its verified parent branch.
- [ ] Hold each ticket's file boundaries. Read shared files freely, but assign a single writer to each shared file.
- [ ] Hold the review gate for P01 through P06. Post screenshots and a video before accepting each link into the stack.
- [ ] Stop if the prototype disproves the mixed SVG and WebGL approach. Revise P03 through P05 before installing production dependencies.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Use `gh` unless an installed Origin CLI resolves this repository. Record the choice.
- [ ] Open each PR ready, never draft. Target the verified parent branch. Only P01 targets `main`.
- [ ] Run `pnpm check`, `pnpm build`, and formatting checks on touched files before the PR-facing push. Preserve unrelated changes.
- [ ] Run unslop over prose and no-comments over the diff before review. Keep comments only when the reason is not clear from code.
- [ ] Triage Bugbot and security-review comments on their merits. Record fixes and concrete dismissals.
- [ ] Do not force-push shared branches without approval. Do not merge, enable auto-merge, or push to `main`.

### Verdict and merge, for every PR

- [ ] At the exact review head, run independent gates, the ten live scenarios, the perf probe, and a receipts-and-diff audit through swarm.
- [ ] Use fresh subagents with explicit configured models when available. Otherwise record the tooling limitation and run numbered sequential passes without claiming model diversity.
- [ ] Return findings to the owner. Re-verify changed behaviour at each new head SHA.
- [ ] Append only a clean head to the verified linear stack. Preserve a verdict through topology changes only when stable patch-id is unchanged. Re-run CI and mergeability after any rebase.
- [ ] Leave landing to the operator. Ask separately before any deployment action.

### Boot recipe, for every live lane

Each live lane runs in an isolated worktree at the ticket head. Drive the browser with Playwright launched from bash. The repository has a browser script but no dedicated verify skill.

- [ ] Fetch the head branch and check out the recorded head SHA in the lane worktree. Install with `pnpm install --frozen-lockfile`.
- [ ] Build with `pnpm build`. Start `pnpm preview --host 127.0.0.1 --port 4322` on a free lane-specific port. Wait for HTTP 200.
- [ ] Set `BASE_URL` to that server. Drive input through `scripts/verify-portfolio.cjs`, created in P01. Use read-only page diagnostics for geometry, console errors, resource timing, and interaction state.
- [ ] Compare trunk on its own port and worktree. Before P01 adds the new driver, run the head driver externally against trunk. Do not copy code into trunk.
- [ ] Save the lane screenshots named below under `artifacts/portfolio/<ticket>/<sha>/worker-<n>/`. Return paths and assertions with the report.
- [ ] Save recordings, perf JSON, baseline SHA, head SHA, browser version, viewport, and device information beside the screenshots. Stop owned servers after each pass.

## Prototype the SVG character and scene alignment (P01)

**Depends on.** None.

**Files.**

- [ ] Create `src/pages/lab/portfolio.astro` and `src/components/portfolio-prototype/` as a temporary prototype route and component folder.
- [ ] Create `scripts/verify-portfolio.cjs` and `scripts/measure-portfolio.cjs` as reusable Playwright drivers.
- [ ] Create `docs/portfolio-prototype-results.md` with measured findings and screenshot paths.

**Build.**

- [ ] Name the prototype data first. Use one target record with an ID, DOM anchor, and scene position. Use a character state with idle, anticipation, travel, kick, impact, and return phases.
- [ ] Sketch an original SVG character with separate head, torso, arms, and legs. Use a neutral placeholder likeness, not an invented portrait of Siva.
- [ ] Compare two small compositions on the lab route. Candidate A uses sculptural objects around central serif type. Candidate B keeps objects in a lower stage away from the heading.
- [ ] Test one simple live Three.js object through a dynamic import. Animate the SVG character toward its projected screen position. Do not require React for this experiment.
- [ ] Compare a CSS peel and a minimal curved-mesh peel. Record whether the extra WebGL work improves the reveal enough to keep.
- [ ] Test a 150 ms hover dwell, an approximately 900 ms kick sequence, tap activation, and reduced motion. Treat those timings as hypotheses.
- [ ] Add driver scenarios, screenshot output, video capture, interaction-state assertions, and JSON perf output. Make runs repeatable through environment variables.
- [ ] Record the chosen composition and peel approach after visual review. Keep losing experiments out of the production homepage.

**You see.**

- [ ] On the lab route, a 2D character kicks one 3D object and returns to its perch. The title and primary link remain usable throughout.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add assertions for target projection, character completion, and duplicate-trigger suppression to the driver. Run `BASE_URL=http://127.0.0.1:4322 node scripts/verify-portfolio.cjs` and `pnpm build`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Open home and activate the work link at trunk and head. Record that trunk lacks the lab feature if confirmed. Save `regression.png`. Pass when existing navigation works and the new lab kick finishes at head.
- [ ] Lane 2. Hover the object at 1440 px. Save `kick.png`. Pass when exactly one kick completes and the character returns.
- [ ] Lane 3. Compare both compositions at 390 px. Save `mobile.png`. Pass when neither layout clips text or controls.
- [ ] Lane 4. Activate the target by keyboard. Save `keyboard.png`. Pass when focus stays visible and activation completes.
- [ ] Lane 5. Tap with touch emulation. Save `touch.png`. Pass when hover is unnecessary.
- [ ] Lane 6. Enable reduced motion. Save `reduced.png`. Pass when the static target and headline remain usable without travel or peel motion.
- [ ] Lane 7. Disable JavaScript. Save `no-js.png`. Pass when the headline and work link remain present and usable.
- [ ] Lane 8. Block the scene import. Save `failure.png`. Pass when fallback artwork appears and no cover blocks content.
- [ ] Lane 9. Resize during a kick. Save `resize.png`. Pass when the character recovers without leaving the viewport.
- [ ] Lane 10. Sweep the pointer over the target twenty times. Save `repeat.png`. Pass when sequences do not overlap and the final state is idle.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure homepage navigation-to-visible-heading at trunk and head. At head also measure lab transfer bytes, active frame intervals, and activation-to-idle duration.
- [ ] Probe. Run `node scripts/measure-portfolio.cjs` against trunk and head in five interleaved cold runs each. Use the same Chromium version, 1440 by 900 viewport, and 4x CPU throttle. Record network settings.
- [ ] Baseline. Save trunk measurements and SHA before head runs. Record that the lab route has no comparable trunk animation if confirmed.
- [ ] Rule. Fail if median homepage heading time increases by more than 200 ms. For the new lab, fail if scene resources exceed 1 MB transferred, active p95 frame interval exceeds 33.4 ms on the test machine, or activation-to-idle exceeds 2 seconds. These are proposed gates, not measured results.

**Review gate.** The operator reviews before merge.

- [ ] Post both composition screenshots and the peel comparison to the operator. Save a 30 to 60 second video as `artifacts/portfolio/P01/review.webm`. Record the selected direction before P02.

**Merge.**

- [ ] Record the root verdict and exact head SHA. Append P01 only after review and clean verification. The operator lands the stack.

## Replace the site design with an accessible static foundation (P02)

**Depends on.** P01.

**Files.**

- [ ] Edit `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`, and `src/components/SiteFooter.astro`.
- [ ] Edit `src/components/ImaginationHero.astro`, `src/components/HeroArtwork.astro`, and shared card components.
- [ ] Edit `src/pages/index.astro`, `src/pages/work.astro`, and blog layouts where the approved design needs shared changes.
- [ ] Create original SVG artwork under `public/art/portfolio/` and record font and artwork provenance in `docs/portfolio-assets.md`.

**Build.**

- [ ] Use shared semantic theme tokens and one documented type scale. Remove terminal-specific presentation only after checking its callers.
- [ ] Build the selected black-and-white composition with coloured decorative objects, layered shadows, and a grand serif heading.
- [ ] Use existing licensed fonts where suitable. Verify font provenance before adding another family. Limit the normal page to two families.
- [ ] Keep the current theme switch functional. Use a deliberate inverted monochrome dark palette rather than leaving half the page in terminal colours.
- [ ] Keep a complete static hero, a character perch beside the name, visible work and contact navigation, and readable fallback artwork.
- [ ] Restyle work, blog, header, footer, and the game launcher consistently. Preserve route addresses, RSS, metadata, game behaviour, and article content.
- [ ] Update existing landing assertions to match approved semantic copy without weakening overflow, keyboard, or no-JavaScript checks.

**You see.**

- [ ] The whole portfolio has a coherent editorial design before any animation or WebGL runs. Work and contact destinations remain reachable.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Extend `scripts/verify-portfolio.cjs` with semantic heading, focus, route, and asset assertions. Run it, `pnpm check`, `pnpm build`, and `node scripts/verify-landing.cjs` against preview.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Navigate home to work to blog on both. Save `regression.png`. Pass when the same routes and content remain reachable.
- [ ] Lane 2. Inspect the desktop hero at 1440 px. Save `desktop.png`. Pass when the headline, avatar perch, and CTA do not overlap.
- [ ] Lane 3. Inspect at 360 and 390 px. Save `mobile.png`. Pass when there is no horizontal scroll or clipped headline.
- [ ] Lane 4. Inspect at 768 and 1024 px. Save `tablet.png`. Pass when artwork leaves controls unobstructed.
- [ ] Lane 5. Tab through navigation and activate the work link. Save `keyboard.png`. Pass when order is logical and focus visible.
- [ ] Lane 6. Disable JavaScript. Save `no-js.png`. Pass when home, work, and blog navigation still work.
- [ ] Lane 7. Switch theme and reload. Save `themes.png`. Pass when the choice persists and both palettes remain legible.
- [ ] Lane 8. Use 200 percent zoom and a short landscape viewport. Save `zoom.png`. Pass when copy and controls remain available without horizontal page scroll.
- [ ] Lane 9. Open a blog article and the game launcher. Save `interior.png`. Pass when shared styles do not break article layout or launcher controls.
- [ ] Lane 10. Block custom fonts. Save `fonts.png`. Pass when fallback fonts keep the headline and CTA within the viewport.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure navigation-to-visible-heading, CLS through five seconds, and initial transferred bytes on home, work, and one blog page at trunk and head.
- [ ] Probe. Run `node scripts/measure-portfolio.cjs` in five alternating trunk and head runs with cold cache, identical viewport, and 4x CPU throttle.
- [ ] Baseline. Save the trunk metrics and route list before head measurements.
- [ ] Rule. Fail if median heading time regresses by more than 200 ms, CLS exceeds 0.1, or the static homepage transfer exceeds 800 KB. Investigate any interior-route transfer growth above 100 KB.

**Review gate.** The operator reviews before merge.

- [ ] Post desktop, mobile, dark theme, and interior-page screenshots to the operator. Save a 30 to 60 second walkthrough video as `artifacts/portfolio/P02/review.webm`.

**Merge.**

- [ ] Record a clean verdict at the exact head and unchanged patch-id after topology updates. Append P02 after P01. The operator lands the stack.

## Add the shared WebGL stack scene and fallback (P03)

**Depends on.** P02.

**Files.**

- [ ] Edit `package.json`, `pnpm-lock.yaml`, and `astro.config.mjs` only for approved production dependencies.
- [ ] Create `src/components/portfolio/StackExperience.tsx`, `src/components/portfolio/StackScene.tsx`, and `src/components/portfolio/stack-items.ts`.
- [ ] Create `src/components/portfolio/StackFallback.astro` and integrate it in `src/components/ImaginationHero.astro`.
- [ ] Create scene tests and extend `scripts/verify-portfolio.cjs` and `scripts/measure-portfolio.cjs`.

**Build.**

- [ ] Name the data shape before implementation. Define a typed stack registry with ID, label, colour, geometry, desktop anchor, mobile anchor, and fallback asset.
- [ ] Register TypeScript, Python, Astro, GCP, React, FastAPI, and GitHub once. Keep visible labels in HTML. Do not imply endorsements.
- [ ] Install compatible Astro React integration, React, React DOM, Three.js, React Three Fiber, and only the Drei helpers needed. Verify package compatibility rather than assuming versions.
- [ ] Render one shared canvas with procedural or SVG-derived geometry. Require no Blender files, GLB character, paid editor, or remote model service.
- [ ] Apply a consistent matte material, common light direction, restrained contact shadows, capped pixel ratio, and responsive object placement.
- [ ] Keep DOM controls as the source of accessible target activation. Project 3D target positions into shared hero coordinates for the later character ticket.
- [ ] Dynamically load the scene after the static page is usable. Keep fallback artwork until the first usable frame. Stop rendering while offscreen or hidden.
- [ ] Handle unavailable WebGL, import failure, and context loss without blocking content. Show static objects under reduced motion.

**You see.**

- [ ] Seven coloured, sculptural stack objects surround readable HTML text. Static artwork replaces the scene when WebGL cannot run.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test unique registry IDs, complete fallback records, projection after resize, and scene cleanup through the driver and pure helper tests. Run `pnpm check`, `pnpm build`, and the browser driver.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Read the heading and follow the work link on both. Record the missing scene at trunk if confirmed. Save `regression.png`. Pass when navigation is unchanged and the head scene reaches ready.
- [ ] Lane 2. Load the desktop scene. Save `scene.png`. Pass when there is exactly one canvas and all seven labelled targets exist.
- [ ] Lane 3. Load at 390 px with touch emulation. Save `mobile.png`. Pass when targets are usable and do not obscure the heading.
- [ ] Lane 4. Navigate targets with the keyboard. Save `keyboard.png`. Pass when labels and focus remain in HTML and visible.
- [ ] Lane 5. Disable WebGL before navigation. Save `no-webgl.png`. Pass when fallback artwork and navigation work.
- [ ] Lane 6. Block the scene chunk. Save `chunk-failure.png`. Pass when static content remains visible without an endless loading state.
- [ ] Lane 7. Trigger WebGL context loss through read-only test instrumentation. Save `context-loss.png`. Pass when the fallback appears and controls work.
- [ ] Lane 8. Resize repeatedly and rotate the emulated device. Save `resize.png`. Pass when projected target positions remain aligned.
- [ ] Lane 9. Enable reduced motion. Save `reduced.png`. Pass when no continuous decorative movement runs.
- [ ] Lane 10. Scroll the scene offscreen and hide the tab. Save `paused.png`. Pass when frame counters stop until the scene is visible again.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure heading readiness and initial bytes on both revisions. At head also measure scene transfer, ready time, active frame intervals, and hidden frame count.
- [ ] Probe. Run `node scripts/measure-portfolio.cjs` on five interleaved trunk and head cold loads with 4x CPU throttle. Add a ten-second active trace and a five-second hidden interval.
- [ ] Baseline. Record trunk heading readiness and bytes first. Record that trunk has no equivalent scene if confirmed. Compare scene costs to absolute budgets only.
- [ ] Rule. Fail if median heading readiness regresses by over 200 ms, deferred scene resources exceed 1 MB transferred, ready takes over 5 seconds on the recorded local profile, active p95 frame interval exceeds 33.4 ms, or hidden frame count increases after a 500 ms settling period.

**Review gate.** The operator reviews before merge.

- [ ] Post desktop, mobile, fallback, and reduced-motion screenshots to the operator. Save a 30 to 60 second scene walkthrough video as `artifacts/portfolio/P03/review.webm`.

**Merge.**

- [ ] Record the clean head verdict and append P03 after P02. The operator lands the stack.

## Animate the original SVG character and kick interaction (P04)

**Depends on.** P03.

**Files.**

- [ ] Create `src/components/portfolio/Avatar.tsx`, `src/components/portfolio/interaction.ts`, and original character SVG parts under `public/art/portfolio/`.
- [ ] Edit `src/components/portfolio/StackExperience.tsx`, `src/components/portfolio/StackScene.tsx`, and header perch markup if required.
- [ ] Create transition tests and extend `scripts/verify-portfolio.cjs`.
- [ ] Add GSAP in `package.json` and `pnpm-lock.yaml` if the prototype justifies it. Do not add a second animation library.

**Build.**

- [ ] Name the domain first. Use a discriminated interaction state with idle, anticipation, travel, kick, impact, and return phases. Store one active target ID.
- [ ] Read architect and animate before selecting controller boundaries and timing. Keep one controller responsible for the full sequence and cleanup.
- [ ] Draw an original monochrome character with editable hair, face, clothes, and proportions. Mark the initial likeness as provisional until Siva reviews it.
- [ ] Perch the SVG character beside the name. Animate independent limbs and squash through transforms, not per-frame framework state updates.
- [ ] Use scene-projected target coordinates in the same container coordinate system. Recalculate on resize, scroll, and camera changes.
- [ ] Trigger after the prototype's measured dwell. Support tap and keyboard activation. Ignore new attack requests until the active sequence returns to idle.
- [ ] Coordinate kick contact, object recoil, a short local SVG crack, and fragment cleanup. Avoid flashing and full-screen camera shake.
- [ ] On resize, route change, reduced-motion change, or scene failure, cancel cleanly and restore the perch. Keep stack controls functional.

**You see.**

- [ ] The small character leaves the name, kicks the selected stack object, creates a brief local crack, and returns. The page remains usable.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test all legal state transitions, busy-trigger suppression, cancellation, target disappearance, and return to idle. Run transition tests, `pnpm check`, `pnpm build`, and the browser driver.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Activate the same stack control where present and navigate to work on both. Record absent interaction honestly. Save `regression.png`. Pass when head completes a kick and navigation remains usable.
- [ ] Lane 2. Hover one target past the dwell. Save `impact.png`. Pass when the kick contacts that target once and returns to idle.
- [ ] Lane 3. Sweep across all targets repeatedly. Save `busy.png`. Pass when no attack overlaps and no queue grows.
- [ ] Lane 4. Tap at 390 px. Save `touch.png`. Pass when the selected target receives one kick without hover.
- [ ] Lane 5. Activate by keyboard. Save `keyboard.png`. Pass when focus stays on the control and the kick completes.
- [ ] Lane 6. Enable reduced motion before load. Save `reduced.png`. Pass when travel, crack, and recoil are suppressed while labels remain usable.
- [ ] Lane 7. Resize and scroll during travel. Save `cancel.png`. Pass when the character recovers to the perch without a stuck state.
- [ ] Lane 8. Navigate away during impact and return. Save `navigation.png`. Pass when no animation, listener, or overlay leaks across routes.
- [ ] Lane 9. Lose the WebGL context during travel. Save `failure.png`. Pass when fallback content appears and the avatar recovers.
- [ ] Lane 10. Repeat twenty completed kicks. Save `repeat.png`. Pass when no fragments remain and the final state is idle with one character.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure heading readiness on trunk and head. At head measure activation latency, active frame intervals, and twenty-kick DOM-node growth.
- [ ] Probe. Run five alternating trunk and head cold loads, then twenty activations through `node scripts/measure-portfolio.cjs` at the same viewport and 4x CPU throttle.
- [ ] Baseline. Record trunk heading timing and idle node count first. If trunk lacks kicks, record that fact and apply absolute kick budgets.
- [ ] Rule. Fail if median heading time regresses by over 200 ms, activation acknowledgment exceeds 100 ms after dwell, active p95 frame interval exceeds 33.4 ms, or DOM nodes grow by more than five after cleanup and settling.

**Review gate.** The operator reviews before merge.

- [ ] Post perch, contact, mobile, and fallback screenshots to the operator. Save a 30 to 60 second video as `artifacts/portfolio/P04/review.webm`. Record likeness and timing approval separately.

**Merge.**

- [ ] Record a clean verdict and append P04 after P03. The operator lands the stack.

## Add the letter playground and skippable peel reveal (P05)

**Depends on.** P04 and the P01 peel decision.

**Files.**

- [ ] Create `src/components/portfolio/ImaginationLetters.astro`, `src/components/portfolio/letters.ts`, and `src/components/portfolio/reveal.ts`.
- [ ] Edit `src/components/ImaginationHero.astro` and `src/components/portfolio/StackExperience.tsx`.
- [ ] Create reveal and letter tests. Extend `scripts/verify-portfolio.cjs` and `scripts/measure-portfolio.cjs`.

**Build.**

- [ ] Name the data first. Use a letter-effect registry with letter index and effect kind. Use reveal states loading, ready, revealing, complete, and failed.
- [ ] Keep one natural accessible heading. Hide decorative duplicated letter visuals from assistive technology. Preserve the complete word in the accessible name.
- [ ] Assign a few deliberate effects across Imagination. Prototype stretch, ink offset, outline, and a small colour burst. Keep the text baseline and surrounding layout stable.
- [ ] Support pointer exploration and one labelled touch and keyboard action to demonstrate the word. Do not create eleven mandatory tab stops in a heading.
- [ ] Implement the peel method selected in P01. Keep the cover absent by default in server HTML. Activate it only after the reveal controller can guarantee dismissal.
- [ ] Drive loading from real scene readiness. Show an indeterminate state when progress cannot be measured. Never fabricate percentages.
- [ ] Provide skip immediately, a five-second loading deadline, and a shorter repeat-visit path. Catch storage failures. Use the operator-requested 1400 ms paper peel. Verify ready-to-dismiss stays within 1800 ms. Keep skip immediate.
- [ ] Under reduced motion, errors, disabled JavaScript, or unavailable WebGL, show content without the peel. Never make reading or navigation depend on the scene.
- [ ] Clean up letter timelines, reveal listeners, and cover elements on route changes.

**You see.**

- [ ] A brief peel introduces the site without holding it hostage. Exploring Imagination produces small, distinct effects without making the headline unreadable.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Test readiness, skip, deadline, error, repeat visit, blocked storage, and accessible heading name. Run tests, `pnpm check`, `pnpm build`, and the browser driver.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Load home and activate work on both. Record absent reveal and letter effects at trunk if confirmed. Save `regression.png`. Pass when head reveal finishes and the link works.
- [ ] Lane 2. Load with a cold cache. Save `reveal.png`. Pass when loading reflects readiness and the peel clears completely.
- [ ] Lane 3. Use skip immediately by keyboard. Save `skip.png`. Pass when the cover disappears and focus reaches meaningful content.
- [ ] Lane 4. Delay the scene beyond the deadline. Save `timeout.png`. Pass when content is available within five seconds without waiting for the scene.
- [ ] Lane 5. Block scene assets and storage. Save `failure.png`. Pass when the page opens without uncaught errors or fabricated progress.
- [ ] Lane 6. Reload after a completed visit. Save `repeat.png`. Pass when the full entrance does not repeat.
- [ ] Lane 7. Explore every letter with the pointer. Save `letters.png`. Pass when effects reset without moving surrounding layout.
- [ ] Lane 8. Use touch and the keyboard demo control. Save `touch-keyboard.png`. Pass when both trigger the demonstration without eleven heading tab stops.
- [ ] Lane 9. Enable reduced motion. Save `reduced.png`. Pass when the peel and letter movement do not run.
- [ ] Lane 10. Disable JavaScript and inspect the accessible heading. Save `no-js.png`. Pass when there is one complete headline and working navigation with no cover.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure navigation-to-visible-heading, navigation-to-usable-work-link, and CLS at trunk and head. At head measure skip latency and letter-animation frame intervals.
- [ ] Probe. Run `node scripts/measure-portfolio.cjs` for five interleaved cold loads, a delayed-scene run, and ten letter activations. Keep viewport, network profile, and CPU throttle fixed.
- [ ] Baseline. Record trunk timings before head. Do not compare scene readiness with static heading readiness as though they were the same metric.
- [ ] Rule. Fail if CLS exceeds 0.1, skip acknowledgment exceeds 100 ms, cover dismissal exceeds 5 seconds under a stalled scene, ready-to-dismiss exceeds 1800 ms, or active p95 frame interval exceeds 33.4 ms. Report the visible-heading and usable-link cost of the entrance explicitly.

**Review gate.** The operator reviews before merge.

- [ ] Post first-visit, skipped, mobile, and letter-effect screenshots to the operator. Save a 30 to 60 second video as `artifacts/portfolio/P05/review.webm`.

**Merge.**

- [ ] Record a clean verdict and append P05 after P04. The operator lands the stack.

## Finish real content and verify the complete replacement (P06)

**Depends on.** P05.

**Files.**

- [ ] Edit `src/config/site.ts`, `src/pages/index.astro`, `src/pages/work.astro`, and relevant content files using only supplied facts.
- [ ] Edit `src/layouts/BaseLayout.astro` for final metadata and sharing assets if needed.
- [ ] Update `scripts/verify-portfolio.cjs`, `scripts/measure-portfolio.cjs`, and `.github/workflows/ci.yml`.
- [ ] Delete `src/pages/lab/portfolio.astro` and unused prototype components after approved production equivalents exist.
- [ ] Create `docs/portfolio-release-report.md` with evidence, limitations, rollback instructions, and stack links.

**Build.**

- [ ] Inventory placeholder identity, contact, social, location, and project copy. Use the current name Siva Addanki. Do not publish example addresses or invented experience.
- [ ] Request only the facts no experiment can supply. Keep unavailable information visibly marked in the private release report and omit unsupported public claims.
- [ ] Add genuine project case studies and contact destinations when supplied. If none are available, mark the content ticket blocked for release rather than inventing projects.
- [ ] Verify canonical URLs, titles, descriptions, article routes, RSS, social cards, and the game launcher.
- [ ] Remove superseded prototype code and unused assets. Keep the game lazily loaded. Record asset provenance and dependency choices.
- [ ] Add repeatable browser checks to CI without assuming local Chrome paths. Verify the exact PR head and preserve failure artifacts.
- [ ] Test on an actual touch device and at least one non-Chromium browser. If hardware is unavailable, record that limitation and leave the release gate open.
- [ ] Produce the final linear-stack report. Include rollback by reverting the replacement PRs. Do not deploy from this task.

**You see.**

- [ ] The portfolio has truthful content, working destinations, coherent interior pages, and no prototype routes or loading dead ends. The operator receives a reviewable stack, not an automatic production change.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Run content validation, `pnpm check`, `pnpm build`, touched-file formatting checks, both browser drivers, and a link audit. Save commands and output in the release report.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `fast mechanical model (setup default)` at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Follow home, work, blog, article, RSS, and game paths on both. Save `regression.png`. Pass when preserved routes work and the new home reaches usable content.
- [ ] Lane 2. Complete the desktop first-visit journey. Save `desktop.png`. Pass when reveal, letters, kick, work, and contact actions behave as specified.
- [ ] Lane 3. Complete the journey on an actual touch device. Save `device.png`. Pass when tap controls, scrolling, orientation, and return-to-page work. Do not substitute emulation without recording an open gate.
- [ ] Lane 4. Run in Firefox or WebKit through the browser driver. Save `cross-browser.png`. Pass when content, fallback, and target activation work without console errors.
- [ ] Lane 5. Use keyboard navigation with reduced motion. Save `keyboard.png`. Pass when content and destinations remain accessible without decorative travel.
- [ ] Lane 6. Disable JavaScript and block custom fonts. Save `static.png`. Pass when every primary route and heading remains usable.
- [ ] Lane 7. Disable WebGL and slow the scene request. Save `fallback.png`. Pass when content opens within the deadline and navigation never depends on 3D.
- [ ] Lane 8. Repeat kicks, route navigation, and theme changes twenty times. Save `lifecycle.png`. Pass when no duplicate canvas, avatar, overlay, or listener-driven actions remain.
- [ ] Lane 9. Inspect 360, 390, 768, 1024, and 1440 px plus 200 percent zoom. Save `responsive.png`. Pass when no text clips and controls remain unobstructed.
- [ ] Lane 10. Audit published copy and links against supplied facts. Save `content.png`. Pass when no example contact details, invented projects, or temporary lab routes ship.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Measure heading readiness, usable-link readiness, CLS, initial transfer, scene transfer, active p95 frame interval, and hidden frame count at trunk and head where available.
- [ ] Probe. Run `node scripts/measure-portfolio.cjs` for five alternating cold loads per revision at the recorded desktop profile and a mobile profile. Trace a kick and letter sequence. Save device measurements separately.
- [ ] Baseline. Record original trunk results first and retain the parent-ticket results. Mark absent trunk interactions instead of claiming a ratio between unlike work.
- [ ] Rule. Fail if CLS exceeds 0.1, static homepage transfer exceeds 800 KB, deferred scene transfer exceeds 1 MB, stalled cover persists over 5 seconds, active p95 frame interval exceeds 33.4 ms on the recorded reference device, or hidden rendering continues after settling. Report all readiness regressions above 200 ms for operator review.

**Review gate.** The operator reviews before merge.

- [ ] Post final desktop, mobile, interior, and fallback screenshots to the operator. Save a 30 to 60 second video as `artifacts/portfolio/P06/review.webm`. Require content approval and explicit landing authority separately.

**Merge.**

- [ ] Record all clean head verdicts, CI results, dependency order, content approval, and remaining limitations. Deliver P01 through P06 as a verified stack. The operator lands it bottom-up.

## Close the program

- [ ] Check each completed box only with its evidence. Leave blocked content, hardware, and review gates unchecked.
- [ ] Deliver the stack root and tip, each head SHA and verdict, screenshots, recordings, perf results, and parked items.
- [ ] Stop owned servers and audit loops. Keep the current site unchanged until the operator authorizes landing and deployment.

## Appendix A. Prototype evidence

No new prototype ran during this planning task. No layout, timing, peel-quality, alignment, or performance claim is proven by this plan. P01 is the required experiment before production work. It must record its branch, SHA, screenshot paths, recordings, measured timings, and rejected candidate.

The planning baseline is commit `7cf8da1f5eaa3fc5696545c28d190852a3a844b6` plus an existing dirty working tree. Do not confuse the baseline commit with the current hero implementation.

The operator approved Candidate A and the paper peel after reviewing P01. The operator then reported that the 800 ms paper peel was too fast. The revised paper duration is 1400 ms. The timing and safety checks must pass before P02 resumes.

The user permits a 2D character and has no Blender access. That is a product constraint, not an empirical question. SVG is the proposed authoring format. P01 must verify its alignment with the WebGL objects.

The earlier research under `docs/hero-research/` describes a hero-only replacement with static artwork. This plan supersedes that scope for the new project. Preserve the research as reference. Do not mark its tickets complete by implication.

## Appendix B. Alternatives rejected

A rigged Blender avatar is out of scope because it introduces an unavailable authoring tool and a custom animation-asset dependency.

A flat character does not require a flat site. Keep live 3D stack objects unless the prototype exposes an unacceptable accessibility or performance cost. If that happens, present the measured result before changing the requested WebGL scope.

Do not add a backend, database, physics engine, full-screen glass simulation, or canvas per object. None is needed for the current portfolio requirements.

Use React Three Fiber for the proposed production scene and plain SVG for the character. P01 can use direct Three.js to test projection cheaply. Delete experiment-only rendering code after production parity is verified.

Use the installed autopilot-stack playbook because these changes are coupled and the user has not granted merge authority. Do not use autopilot-full.

## Appendix C. Risks

P01 owns the unproven visual direction, peel method, and mixed-renderer alignment. Stop production interaction work if the prototype fails.

P02 owns site-wide styling regressions. Existing research protects lower sections, but the current user request replaces the whole visual design. Preserve routes and content while changing presentation.

P03 owns WebGL support, payload, GPU cost, projected coordinates, and context loss. Keep the static fallback independent of scene startup.

P04 owns character likeness, motion quality, interruption, and resize behaviour. Initial art is provisional. Do not claim it resembles Siva without review or references.

P05 owns entrance delay and accessible letter effects. Never make scene readiness a requirement for reading or navigating the page.

P06 owns missing personal facts, truthful project content, cross-browser coverage, and real-device checks. These can block release without blocking earlier reversible work.

There is no project verify skill. The existing `scripts/verify-landing.cjs` is a real browser driver but covers the older hero. P01 must add the new driver before feature work relies on it.

The subagent tool and the expected model configuration were unavailable during planning. No independent model panel ran. At execution, recheck availability and record the actual models. Do not claim independent review from an inline self-review.

The plan's timing and byte limits are initial acceptance budgets, not benchmark results. If a budget needs revision, record evidence and operator approval rather than silently raising it.

GitHub Pages deploys pushes to `main` through `.github/workflows/deploy.yml`. Landing is therefore an external deployment boundary. Do not merge this stack without explicit approval.

## Appendix D. Links and reading list

Track these GitHub issues in order. They are issues, not opened PRs.

- P01. [Prototype the SVG character and scene alignment](https://github.com/avsssai/avsssai.github.io/issues/1).
- P02. [Replace the site design with an accessible static foundation](https://github.com/avsssai/avsssai.github.io/issues/2). Depends on issue 1.
- P03. [Add the shared WebGL stack scene and fallback](https://github.com/avsssai/avsssai.github.io/issues/3). Depends on issue 2.
- P04. [Animate the original SVG character and kick interaction](https://github.com/avsssai/avsssai.github.io/issues/4). Depends on issue 3.
- P05. [Add the letter playground and skippable peel reveal](https://github.com/avsssai/avsssai.github.io/issues/5). Depends on issue 4 and the issue 1 peel decision.
- P06. [Finish real content and verify the complete replacement](https://github.com/avsssai/avsssai.github.io/issues/6). Depends on issue 5.

Read `package.json`, `astro.config.mjs`, `.github/workflows/ci.yml`, and `.github/workflows/deploy.yml` before changing dependencies or delivery.

Read `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `src/components/ImaginationHero.astro`, `src/components/HeroArtwork.astro`, `src/config/site.ts`, and `scripts/verify-landing.cjs` before P02.

Read `FOUNDATIONS.md`, `GAME_PLAN.md`, `docs/hero-research/hero-plan.md`, and `docs/hero-research/05-implementation-tickets.md` for existing decisions. Their older visual scope is not the current acceptance boundary.

Read the installed `skills/how/SKILL.md` for P01 and P03. Read `skills/architect/SKILL.md` before designing production controller boundaries in P03 and P04. Read `skills/animate/SKILL.md` from the installed animation skill location for motion decisions. Resolve real installed locations instead of assuming every skill belongs to poteto-pi.

Use `skills/interrogate/SKILL.md` for a contested design, especially if the prototype cannot settle the rendering split. Use `skills/swarm/SKILL.md` for fresh verification passes at each head.

Keep an uncommitted `decisions.tsv` per owner under the ticket evidence directory through `skills/show-me-your-work/SKILL.md`. Record decisions, measurements, rejected alternatives, and evidence paths.

Planning pass 1 inspected existing research and content scope. Planning pass 2 inspected Astro layout, existing verification, deployment, and placeholders. Both ran inline under the current session model, `gpt-6.1-sol`. Both returned findings. Neither was an independent subagent review.
