# Character-driven letter physics

## Grounding and decision

The deployed word is a single decorative SVG above an unchanged accessible text node. The grid controller currently treats the entire heading as a solid obstacle; walking emits no per-step contact data. Both must change: making letters wiggle while routes still avoid them would not satisfy walking through the word.

Numbered local design passes (configured model mapping is absent, no native subagent/model-switch tool):

1. Candidate A: rebuild glyphs as extruded Three.js meshes with 3D rigid bodies. Rejected for this direction: it changes the approved flat comic artwork, requires matching projections/mesh colliders, and adds GPU rendering work just for lettering.
2. Candidate B (selected): preserve the actual coloured SVG paths, group each glyph independently, and drive their transforms with a 2D rigid-body engine. A kinematic, character-sized contact body pushes dynamic letter bodies; those collide with each other and static page boundaries/protected text. No canned all-word shake, no new lettering canvas.

The public surface is one mounted letter-physics handle: step the character pose, stop contact, reset/reflow, and dispose. The grid controller continues owning destinations, cancellation and accessibility. The walking view only emits its existing physical position/time, with an optional callback so historical controllers need no changes.

## Original letter-only interaction and motion contract

- Occasional marketing interaction; feedback and spatial consistency justify physics, not idle decoration.
- Only Imagination and its punctuation become movable. The other heading words, work link and native controls remain protected.
- Preserve original coloured face paths and ink shadow. Collider boxes approximate each glyph's ink bounds; this is planar rigid-body physics, not exact concave outline collision or 3D extrusion.
- Use a character-sized kinematic contact shape, capped linear/angular letter speeds relative to character scale, low restitution and damping. Only contacted/nearby bodies wake. Neighbour collisions can propagate a smaller reaction.
- Displaced letters remain where they settle. Reset word returns the original layout immediately; there is no unsolicited full-word reset animation.
- Keyboard/reduced-motion actions do not impart animated collisions. A static accessible word remains available without JS, when physics fails, and with reduced motion. Static fallback letters remain an obstacle.
- Resize/scroll/font reflow resets letter coordinates. Hiding/disposal cancels owned frames. No idle simulation or extra WebGL context.

## Release scope

Implement and show the physical interaction locally before replacing the public site. Previous deployment authorization covered the white-grid version, not this unseen physics addition. Preserve the original dirty workspace and deployed grid branch.

## Initial letter-only preview (`633c6fe`)

- Twelve independent SVG groups: eleven original coloured letters and the period. The second i's sparkle remains attached. One shared colour SVG is used across saved themes, preventing a theme change from swapping the solver onto hidden artwork.
- `letter-world.ts` hides Matter.js behind fixed-step poses/contact/settling. Glyph mass follows collider area; speed is capped at twelve character radii per second and spin at 2.5 radians per second, including coasting after contact ends.
- `letter-physics.ts` owns demand-driven frames, viewport/SVG coordinate conversion, interpolation, settling, reflow and teardown. Instant keyboard placement releases the old contact collider rather than leaving a physical ghost or generating teleport impulses.
- `copy-obstacles.ts` shares painted-prose/control geometry between routing and physics. Canvas font metrics avoid treating invisible font descent padding as solid text. The planner also connects legal edge destinations to a nearby visible free grid cell when rounding would otherwise snap into an occupied cell.
- Original geometry and interactions remain the static/failure/reduced-motion fallback. Reset word immediately restores the original composition. Other lettering variants retain their existing light/dark artwork.

## Initial letter-only verification and limits

- **60 pure tests pass**, including direct character contact, neighbour transfer, an unaffected remote glyph, proportional normalized encounters, speed/spin caps, settling, protected-wall contact, artwork grouping and near-obstacle route quantization.
- **Production build/typecheck pass:** zero errors/warnings; four non-blocking hints. Existing Three.js bundle-size warning remains.
- **Five focused Chrome browser cases pass:** desktop and touch-emulated phone contact while walking, neighbour displacement, settling/no idle frames, native keyboard reset, saved-theme change, initial and live reduced motion, import failure/native navigation, keyboard relocation without new impacts, and synthetic pagehide/pageshow teardown/remount.
- **Thirteen existing Chrome/Firefox grid cases pass** against the final production preview. One earlier Windows Firefox Work-link click timed out; its log is retained in `letter-physics-grid-regression-first.log`, and the isolated retry plus final full regression passed.
- Formatting passes with `--end-of-line auto` to accommodate the inherited Windows checkout; Git stores the changed source as LF. Frozen offline installation accepts the lockfile; its semantic diff is only the two added Matter packages.
- A fresh same-family CLI reader inspected source, real screenshots and supplied logs, finding no established blocker. Its theme-switch note was fixed with shared artwork; protected-wall and live-preference/synthetic-lifecycle checks were then added. This is not a configured multi-family panel or independent execution of the browser suite.
- Desktop/phone H.264 clips were decoded and sampled at 0.5, 1.5, 2.5, 3.5, 4.5 and 5 seconds. They show the actual local build, not keyframed mockups. Recordings do not capture the native custom cursor.
- Letter colliders are approximate inset rectangles, not exact concave outlines; a strict all-angle pixel-ink clearance guarantee is not claimed. Physical-phone, Safari/WebKit, assistive-technology and native BFCache/background-tab checks remain unperformed. Synthetic lifecycle dispatch is not evidence of those browser/platform behaviours.
- Detailed logs, source review and original recordings remain outside the repository in `../portfolio-evidence/letter-physics-*` and `letter-physics-final/`. Gallery-only media will be published separately; no application deployment is authorized by this preview.

## Headline extension — current proposal

Owner liked the loose-letter preview and explicitly approved the next proposal: **Full stack** and **web developer** are two intact, heavier blocks, while Imagination remains individual loose glyphs. This supersedes the earlier rule that all other heading copy stays immovable. **With an**, navigation, the work link and controls remain fixed/protected. Preview first; no deployment requested.

### Grounding and shape selection

Pass 1 traced the existing contact flow: grid controller owns destination/retarget/reset; walking emits feet/time; the mounted physics handle converts feet to a contact circle and demand-steps one private Matter engine; SVG letter transforms paint its poses. Prose rectangles were previously static walls and click exclusions, so simply styling the headline to wiggle would not allow actual walk-through contact.

Numbered local design passes, with the same unavailable configured mapping/native model-switch limitations:

1. Candidate A (selected): add two high-density constrained bodies to the existing engine. Keep native text in two inline-block spans, preserve kerning and accessible content, paint CSS transforms from their poses, and share collisions with the loose letters. Existing mounted handle remains the sole frame/reset/disposal owner.
2. Candidate B: use a separate spring-driven headline contact layer. Rejected: parallel contact and frame ownership, no shared letter-to-headline collisions, and different reset/failure paths for one physical composition.

Caller usage remains `sample(feet, size, time)`, `stop/releaseCharacter`, `reset`, `pause`, `dispose`. Internally `createLetterWorld(glyphBoxes, bounds, protectedBoxes, headlineBoxes)` exposes separate read-only `poses` and `headlinePoses`; engine objects and material tuning stay private. `readHeadlineBoxes` measures native text ink. Protected geometry takes an explicit static/physical mode rather than knowing engine internals.

### Physical hierarchy and lifecycle

- Whole-line bodies have 40× the glyph density, stronger damping and much lower speed/spin limits. Contact—not arrival, hover or idle animation—causes the nudge.
- Authored local constraints cap horizontal displacement at the smaller of 12px or 18% of ink height, vertical displacement at the smaller of 3px or 2.5% of ink height, and rotation at 0.012 radians (about 0.7°). Speed is at most 1.8 character radii/second versus 12 for loose letters. These bounded bodies deliberately preserve readability; they are not an unbounded scientific simulation.
- Both blocks retain their settled displacement until **Reset text** restores all heading and letter transforms immediately. Standing inside a headline must still allow the solver to sleep; no permanent idle loop.
- Native heading text/order, selection, font and baseline composition remain unchanged. Static, failure and reduced-motion modes protect the complete heading and remove physical text transforms. Instant keyboard placement releases contact without teleport impulses.
- Existing reflow, hidden-page pause, preference changes and disposal apply to all fourteen bodies through the same handle.

Current verification receipts are `../portfolio-evidence/headline-{unit.log,build.log,browser.log,firefox.log,letter-regression.log,grid-regression.log}`, `headline-final/` and `headline-firefox/`.

- **64 pure tests pass**, including untouched sleeping headline blocks, bounded contact, unaffected remote bodies, responsive scaling, and sleeping while the character remains inside a headline.
- **22 browser cases pass:** four headline-specific desktop/phone cases across Chrome/Firefox, five existing Chrome letter-physics cases, and thirteen existing Chrome/Firefox grid cases. Headline checks observe impacts during walking, displacement/tilt limits, no idle loop even when standing inside a block, intact native text, continued loose-letter collisions, complete reset, and no page errors. Existing reduced-motion/live-preference/import-failure tests now explicitly check that native headline transforms and active-state markers are removed.
- Production build/typecheck pass with zero errors/warnings and four non-blocking hints. Formatting passes with the inherited-checkout accommodation `--end-of-line auto`; diff whitespace checks pass.
- Fresh same-family CLI source/real-screenshot review found no established blocker. It did not independently run browser tests; no configured multi-family panel is claimed.
- H.264 preview clips were decoded and six actual frames per clip inspected. Desktop: 11.399233s, 960×600, 471906 bytes. Phone viewport: 8.983633s, 390×844, 178684 bytes. Native cursors are not recorded. Desktop captures originate at 1440×900; phone is desktop Chrome with touch emulation, not physical hardware.
- CI now includes both engines' headline checks and uploads their evidence. This is CI wiring, not a claim that remote CI has already run.

Physical-device, Safari/WebKit, AT and native BFCache/background-tab limitations above still apply. Main remains `5cce6c5`; this extension is preview-only.
