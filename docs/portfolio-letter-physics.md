# Character-driven letter physics

## Grounding and decision

The deployed word is a single decorative SVG above an unchanged accessible text node. The grid controller currently treats the entire heading as a solid obstacle; walking emits no per-step contact data. Both must change: making letters wiggle while routes still avoid them would not satisfy walking through the word.

Numbered local design passes (configured model mapping is absent, no native subagent/model-switch tool):

1. Candidate A: rebuild glyphs as extruded Three.js meshes with 3D rigid bodies. Rejected for this direction: it changes the approved flat comic artwork, requires matching projections/mesh colliders, and adds GPU rendering work just for lettering.
2. Candidate B (selected): preserve the actual coloured SVG paths, group each glyph independently, and drive their transforms with a 2D rigid-body engine. A kinematic, character-sized contact body pushes dynamic letter bodies; those collide with each other and static page boundaries/protected text. No canned all-word shake, no new lettering canvas.

The public surface is one mounted letter-physics handle: step the character pose, stop contact, reset/reflow, and dispose. The grid controller continues owning destinations, cancellation and accessibility. The walking view only emits its existing physical position/time, with an optional callback so historical controllers need no changes.

## Interaction and motion contract

- Occasional marketing interaction; feedback and spatial consistency justify physics, not idle decoration.
- Only Imagination and its punctuation become movable. The other heading words, work link and native controls remain protected.
- Preserve original coloured face paths and ink shadow. Collider boxes approximate each glyph's ink bounds; this is planar rigid-body physics, not exact concave outline collision or 3D extrusion.
- Use a character-sized kinematic contact shape, capped linear/angular letter speeds relative to character scale, low restitution and damping. Only contacted/nearby bodies wake. Neighbour collisions can propagate a smaller reaction.
- Displaced letters remain where they settle. Reset word returns the original layout immediately; there is no unsolicited full-word reset animation.
- Keyboard/reduced-motion actions do not impart animated collisions. A static accessible word remains available without JS, when physics fails, and with reduced motion. Static fallback letters remain an obstacle.
- Resize/scroll/font reflow resets letter coordinates. Hiding/disposal cancels owned frames. No idle simulation or extra WebGL context.

## Release scope

Implement and show the physical interaction locally before replacing the public site. Previous deployment authorization covered the white-grid version, not this unseen physics addition. Preserve the original dirty workspace and deployed grid branch.

## Implemented preview

- Twelve independent SVG groups: eleven original coloured letters and the period. The second i's sparkle remains attached. One shared colour SVG is used across saved themes, preventing a theme change from swapping the solver onto hidden artwork.
- `letter-world.ts` hides Matter.js behind fixed-step poses/contact/settling. Glyph mass follows collider area; speed is capped at twelve character radii per second and spin at 2.5 radians per second, including coasting after contact ends.
- `letter-physics.ts` owns demand-driven frames, viewport/SVG coordinate conversion, interpolation, settling, reflow and teardown. Instant keyboard placement releases the old contact collider rather than leaving a physical ghost or generating teleport impulses.
- `copy-obstacles.ts` shares painted-prose/control geometry between routing and physics. Canvas font metrics avoid treating invisible font descent padding as solid text. The planner also connects legal edge destinations to a nearby visible free grid cell when rounding would otherwise snap into an occupied cell.
- Original geometry and interactions remain the static/failure/reduced-motion fallback. Reset word immediately restores the original composition. Other lettering variants retain their existing light/dark artwork.

## Verification and limits

- **60 pure tests pass**, including direct character contact, neighbour transfer, an unaffected remote glyph, proportional normalized encounters, speed/spin caps, settling, protected-wall contact, artwork grouping and near-obstacle route quantization.
- **Production build/typecheck pass:** zero errors/warnings; four non-blocking hints. Existing Three.js bundle-size warning remains.
- **Five focused Chrome browser cases pass:** desktop and touch-emulated phone contact while walking, neighbour displacement, settling/no idle frames, native keyboard reset, saved-theme change, initial and live reduced motion, import failure/native navigation, keyboard relocation without new impacts, and synthetic pagehide/pageshow teardown/remount.
- **Thirteen existing Chrome/Firefox grid cases pass** against the final production preview. One earlier Windows Firefox Work-link click timed out; its log is retained in `letter-physics-grid-regression-first.log`, and the isolated retry plus final full regression passed.
- Formatting passes with `--end-of-line auto` to accommodate the inherited Windows checkout; Git stores the changed source as LF. Frozen offline installation accepts the lockfile; its semantic diff is only the two added Matter packages.
- A fresh same-family CLI reader inspected source, real screenshots and supplied logs, finding no established blocker. Its theme-switch note was fixed with shared artwork; protected-wall and live-preference/synthetic-lifecycle checks were then added. This is not a configured multi-family panel or independent execution of the browser suite.
- Desktop/phone H.264 clips were decoded and sampled at 0.5, 1.5, 2.5, 3.5, 4.5 and 5 seconds. They show the actual local build, not keyframed mockups. Recordings do not capture the native custom cursor.
- Letter colliders are approximate inset rectangles, not exact concave outlines; a strict all-angle pixel-ink clearance guarantee is not claimed. Physical-phone, Safari/WebKit, assistive-technology and native BFCache/background-tab checks remain unperformed. Synthetic lifecycle dispatch is not evidence of those browser/platform behaviours.
- Detailed logs, source review and original recordings remain outside the repository in `../portfolio-evidence/letter-physics-*` and `letter-physics-final/`. Gallery-only media will be published separately; no application deployment is authorized by this preview.
