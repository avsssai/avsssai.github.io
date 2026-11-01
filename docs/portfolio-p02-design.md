# Build the static portfolio foundation

P02 starts at landed P01 commit `76ee4e85d3b9f30b128c49ddf788dca0978a32c0`. It does not ship another animation. The user approved Candidate A and rejected invented supporting slogans. Keep the headline and useful navigation. Do not invent projects, employment, availability, location, email, or social accounts.

## Trace the current site

`src/pages/index.astro` calls `BaseLayout.astro`, which owns metadata, the initial theme script, header, main landmark, and footer. Interior routes use the same layout. `ThemeSwitcher.astro` updates `data-theme` and localStorage. Shared Tailwind colours resolve through `src/styles/global.css`. The game launcher also uses those tokens, `.pixel-panel`, and `.terminal-kicker`; changing their styling must preserve game behaviour. Blog content comes from the existing collection and must not be rewritten.

The baseline site configuration contains placeholder email, location, and social URLs. The work page contains invented placeholder projects. They are not evidence of real portfolio content and must not appear as published claims. The repository owner establishes the existing GitHub destination, not other contact details.

## Compare ownership

| Candidate | Caller                                                            | Ownership                                                                                                                | Decision                                                                         |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| A         | `<BaseLayout pageKind="landing"><ImaginationHero /></BaseLayout>` | One layout owns metadata, theme bootstrap, navigation, and viewport budget. The hero owns static typography and artwork. | Select. Interior callers retain their default document layout.                   |
| B         | `<PortfolioLayout><ImaginationHero /></PortfolioLayout>`          | A separate homepage layout duplicates metadata, theme bootstrap, header, and footer.                                     | Reject. It creates two owners for shared behaviour without a second application. |

These are sequential design passes on the parent model because the native subagent tool and configured role model are unavailable. They are not independent model proposals.

## Use the domain shape

`PageKind` is `landing | document`, with `document` as the default. It controls shell composition, not content or animation state. The landing shell budgets header, hero, and footer together within 100dvh where content fits. Accessible reflow and zoom may increase document height; no important content is clipped to force a screenshot fit.

`site` contains verified display identity and the repository-owner GitHub URL. Missing contact fields are omitted rather than rendered as fake links. Static artwork is decorative and has no disabled pseudo-controls. P03 will introduce the shared scene registry and interactive DOM targets.

## Apply the design

Use Space Grotesk and Instrument Serif from the existing OFL-licensed local assets. The normal interface uses those two families. Code keeps a system monospace fallback. Semantic theme tokens provide paper, ink, surface, muted text, and lines in both palettes. Keep existing colour aliases used by the game until its consumers are verified.

Move only the provisional original character drawing into a static SVG asset. Its likeness remains unconfirmed. Do not copy the prototype controller or experimental peel into the production homepage. Reuse the approved composition, not its development controls or slogans.

## Verify before review

Build and check the first shell/hero unit. Inspect desktop, narrow tablet, short landscape, mobile, reduced-motion, and no-JavaScript screenshots. Then complete P02 interior-route, keyboard, theme persistence, 200-percent zoom, font-failure, regression, and performance checks from the plan. P02 requires its own operator visual review and independent verification before merge.
