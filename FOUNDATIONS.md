# Website foundations

## Stack decision

- **Framework:** Astro 7 with strict TypeScript. The site is content-led and mostly static, so Astro ships little browser JavaScript while leaving room for React, Svelte, or other interactive islands later.
- **Content:** Local Markdown/MDX in an Astro content collection. Posts live beside the code, receive schema validation, and work naturally with pull requests.
- **Styling:** Tailwind CSS 4 plus semantic light and dark theme tokens in `src/styles/global.css`. The visual language uses terminal colors, crisp borders, and restrained 8 bit details.
- **Package manager:** pnpm 10, pinned in `package.json` for consistent local and CI installs.
- **Components:** Astro components first. The initial library is intentionally small: layout, navigation, button links, and content cards. Add React and shadcn/ui only when a real interactive feature needs them.
- **Hosting:** Static output, portable across Cloudflare Pages, Vercel, Netlify, or GitHub Pages. Pick the provider after the domain and analytics choice.
- **CI:** GitHub-hosted Ubuntu runner using Node 22. Pull requests and pushes to `main` check formatting, types, content schemas, and the production build.

## Alternatives considered

| Stack                       | Choose it when                                                                                      | Tradeoff for this site                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Next.js                     | The site will soon become a logged-in product, dashboard, or heavily server-rendered application.   | More runtime and framework surface than a portfolio and blog need.                                    |
| SvelteKit                   | You prefer Svelte and expect substantial interactive UI or server routes.                           | Excellent option, but the content-first advantages are less direct than Astro's built-in collections. |
| Nuxt                        | Vue is already your strongest ecosystem or the site will share Vue components with another product. | Strong full-stack choice, with more client framework than the initial site requires.                  |
| Eleventy                    | You want a minimal template-driven static generator and almost no client JavaScript.                | Very lean, but Astro provides stronger typed content and component ergonomics.                        |
| React Router framework mode | You want the modern continuation of Remix's full-stack model.                                       | Best when loaders, actions, and server rendering are central; those are not current requirements.     |

## Information architecture

1. `/` — personal introduction, featured work, recent writing, and primary calls to action.
2. `/work/` — selected case studies focused on problem, contribution, decisions, and outcome.
3. `/blog/` and `/blog/[slug]/` — durable technical writing with tags and RSS.

Astro enforces trailing slashes for page routes. The header exposes only Home, Work, Blog, and the theme switcher.

## Component layers

- `ui/`: low-level visual primitives with no business or page language.
- `components/`: reusable site patterns such as the header and post cards.
- `layouts/`: page chrome, metadata, and long-form article structure.
- `pages/`: route composition. Keep route-specific content here.

## Theme system

- The initial theme follows the operating system preference.
- A header control switches between light and dark modes and stores the choice locally.
- An inline head script applies the saved theme before the body renders to prevent a color flash.
- Both palettes use the same semantic tokens for background, surface, text, muted text, borders, and green, cyan, and magenta accents.
- Body text stays in a readable sans serif. Navigation, labels, metadata, and code use monospace.
- `PixelCompanion.astro` introduces the site on the homepage and stays available as a compact route-aware guide on interior pages.

## Near-term roadmap

### Phase 1 — personalize

- Replace the placeholder identity, email, social links, location, and canonical URL.
- Add two real projects and one real article.
- Choose a display typeface and add self-hosted font files.
- Create a social sharing image and project imagery.

### Phase 2 — publish

- Create the GitHub repository and protect `main` by requiring the CI job.
- Connect the chosen host and custom domain.
- Add the host's deployment workflow or Git integration after choosing Cloudflare Pages, Vercel, Netlify, or GitHub Pages.
- Add privacy-friendly analytics only if the questions it should answer are defined.
- Add deployment previews to pull requests through the hosting provider.

### Phase 3 — deepen

- Add project case-study routes and structured project content.
- Add syntax-enhanced code blocks, a table of contents, and related posts once the blog has enough content.
- Add a contact form only if mailto becomes a real constraint; use a server endpoint with validation and spam protection.
- Add an interactive island only for features that require client state.

## Decisions to avoid early

- A database or headless CMS before repository-authored content becomes painful.
- A full React runtime for navigation and presentational components.
- Search before the blog has enough posts to make browsing difficult.
- A large component dependency whose visual language you will immediately override.
