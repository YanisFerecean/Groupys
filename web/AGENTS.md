# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 app using the App Router. Application entry points live in `src/app/` (`layout.tsx`, `page.tsx`, `globals.css`). Shared UI primitives belong in `src/components/ui/`, and reusable helpers live in `src/lib/` such as `src/lib/utils.ts`. Static assets are served from `public/`. Use the `@/*` TypeScript path alias from `tsconfig.json` for internal imports, for example `@/components/ui/button`.

## Build, Test, and Development Commands
Use npm with the checked-in `package-lock.json`.

- `npm install`: install project dependencies.
- `npm run dev`: start the local dev server at `http://localhost:3000`.
- `npm run build`: create the production build and catch type/config issues.
- `npm run start`: run the built app locally.
- `npm run lint`: run ESLint across the repo.

## Coding Style & Naming Conventions
Write TypeScript with strict mode in mind and keep components as function components. Follow the existing style: 2-space indentation, double quotes, and concise React/Next modules. Route files in `src/app/` must keep Next.js names such as `page.tsx` and `layout.tsx`. Export React components in PascalCase (`Button`), keep utility functions in camelCase (`cn`), and prefer lowercase file names for shared UI modules (`button.tsx`). Favor Tailwind utility classes and shared tokens from `src/app/globals.css` over ad hoc CSS.

## Testing Guidelines
There is no test runner configured yet. Until one is added, treat `npm run lint` and `npm run build` as required checks before opening a PR. When you introduce non-trivial behavior, add tests alongside the feature or under a `src/__tests__/` folder using `*.test.ts` or `*.test.tsx` naming.

## Commit & Pull Request Guidelines
The current Git history uses Conventional Commit prefixes (`feat: initial commit`), so continue with messages like `feat: add landing hero` or `fix: correct button variants`. Keep commits focused and reviewable. PRs should include a short description, linked issue if applicable, the commands you ran for verification, and screenshots or recordings for UI changes.

## Configuration Notes
ESLint is configured through `eslint.config.mjs` with Next.js core-web-vitals and TypeScript rules. Keep secrets out of the repo, use `.env.local` for local configuration, and do not commit generated build output from `.next/`.
