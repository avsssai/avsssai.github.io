# Portfolio assets and typography

## Fonts

P02 reuses both local WOFF2 files introduced by P01. It adds no font download service or dependency.

| Family           | File                                  | Source and license                                                                                       |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Instrument Serif | `public/fonts/instrument-serif.woff2` | Instrument Serif Project Authors, copyright 2022. SIL OFL 1.1 in `public/fonts/InstrumentSerif-OFL.txt`. |
| Space Grotesk    | `public/fonts/space-grotesk.woff2`    | Space Grotesk Project Authors, copyright 2020. SIL OFL 1.1 in `public/fonts/SpaceGrotesk-OFL.txt`.       |

The normal interface uses those two families. Body copy and controls use Space Grotesk. The homepage heading uses Instrument Serif. Code retains a system monospace stack. Both downloaded families use `font-display: swap`; blocked-font checks exercise system fallbacks.

## Type scale

| Use                         | Size                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Footer and compact metadata | 11 to 12 px                                                                                |
| Navigation                  | 13 px                                                                                      |
| Body                        | 16 px                                                                                      |
| Article body                | 17.2 px with 1.8 line height                                                               |
| Card title                  | 24 px                                                                                      |
| Interior page title         | 48 px, then 72 px at the existing small-screen breakpoint                                  |
| Desktop hero                | Fluid 48 to 104 px; tablet and short-window rules reserve space for navigation and objects |
| Mobile hero                 | Fluid 32 to 68 px, bounded by viewport width and height                                    |

The supporting words within the approved heading retain their smaller treatment. The main title, work link, and navigation remain selectable or keyboard-accessible as appropriate. Zoom is not disabled. A 200-percent check uses Chrome's actual page-zoom setting in a disposable browser profile, not CSS scaling.

## Artwork

`public/art/portfolio/character.svg` extracts the original provisional SVG drawing from P01's `PortfolioPrototype.astro`. The character is not a confirmed likeness of Siva. No stock portrait, avatar service, external model, or paid artwork is used.

`HeroArtwork.astro` draws the static orbital shape with inline SVG and the Py, TS, and star objects with CSS and text. The orbital geometry comes from the original P01 prototype. Technology labels identify composition subjects and do not imply endorsement. These are decorative static shapes, not fake interactive controls. P03 owns the production shared WebGL scene.

The production homepage does not import the prototype controller, renderer, or peel experiments. No new animation is introduced by P02.

## P03 stack artwork

P03 adds seven original SVG files under `public/art/portfolio/stack/` and matching procedural meshes. They use abstract tile, paired capsule, star, cloud, orbital, bolt and faceted forms. No logo pack, remote model, Blender asset, paid editor or model service is used. Labels identify technology subjects and do not imply endorsement.

The typed registry in `src/components/portfolio/stack-items.ts` owns labels, colours, geometry kinds, placement anchors and fallback paths. Astro owns the HTML controls and images. The deferred scene replaces only the images after a usable frame. The existing P02 `HeroArtwork.astro` is retained but no longer imported by the homepage.

## P04 character rig

P04 reuses the original provisional character source in both the static header image and an inline SVG animation view. A small fist circle was added to the existing front arm. Hair, face, clothes, arms, legs and proportions remain editable SVG paths. The kick and punch use separate joint transforms. This does not establish an approved likeness of Siva.

The local crack, speed strokes and pressure ring are original inline SVG in `src/components/portfolio/Avatar.ts`. The paper-dent illusion uses a low-contrast radial gradient behind the content, not a texture or a capture of the page. Each effect reuses one element and disappears on cancellation. WAAPI and the existing scene renderer handle movement; P04 adds no animation dependency.

## Content limits

The baseline email, location, LinkedIn URL, and project records were placeholders. P02 removes those published claims rather than inventing replacements. The GitHub URL uses this repository's owner, `avsssai`.

The existing starter blog article and its route remain unchanged. Its content is still starter material, not a newly verified case study. Real project case studies, contact details, and article replacement remain content work for P06 and the operator. Do not present P02 as proof that those details are complete.

## Theme and game scope

Light and dark modes use shared semantic paper, ink, surface, muted, and line tokens. Existing game colour aliases and panel selectors remain available. The user explicitly excluded game redesign and dedicated game verification from the current work. Game source and its route are retained; no claim of game-specific verification is made.
