# Developer site

An Astro-based personal site with a neon terminal theme, developer blog, work index, an on-demand game launcher, RSS, sitemap, and CI foundation.

## Requirements

- Node.js 22.23.4 or newer
- Corepack and pnpm 10

Use the pinned Node version with `nvm`:

```sh
nvm install
nvm use
corepack enable pnpm
pnpm install
pnpm dev
```

## First edits

1. Update `src/config/site.ts` with your name, contact details, and social profiles.
2. Replace the placeholder projects in `src/pages/work.astro`.
3. Replace the sample post in `src/content/blog/` with your writing.
4. Read `FOUNDATIONS.md` for the architecture and roadmap.
5. Read `GAME_PLAN.md` for the Agent Runner mechanics and delivery plan.

## Commands

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Start the local development server           |
| `pnpm check`        | Check Astro and TypeScript                   |
| `pnpm build`        | Check and create the static production build |
| `pnpm preview`      | Preview the production build                 |
| `pnpm format`       | Format supported files                       |
| `pnpm format:check` | Verify formatting without changing files     |

## GitHub Actions

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`. It installs the pinned pnpm version, restores the pnpm cache, installs from the lockfile, verifies formatting, type-checks content and components, and builds the site.

`.github/workflows/deploy.yml` publishes successful pushes to `main` at `https://avsssai.github.io` through GitHub Pages.

Commit `pnpm-lock.yaml` so local and CI installs resolve exactly the same dependency versions.
