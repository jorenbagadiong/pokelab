# Pokémon Nexus

An interactive, production-ready Pokédex built on real [PokéAPI](https://pokeapi.co/docs/v2) data.

- **Pokédex explorer**: all 1,025 National Pokédex species, with debounced search by name or number, type filter, sorting, pagination, a favorites filter and shareable URL state.
- **Detail pages** (`/pokemon/[name]`): artwork plus shiny artwork, a sprite gallery, types, metric height and weight, base experience, abilities (hidden ones marked), animated base stats, branching evolution chains, selected level-up moves, game appearances, the Pokédex entry, and previous/next navigation.
- **Favorites**: stored in `localStorage`, kept in sync across components and tabs, and shown on a dedicated page.
- **3D showcase**: a React Three Fiber viewer with orbit controls, zoom limits, a studio lighting environment, idle rotation, camera reset, loading and error states, and reduced-motion support.
- **Dark and light themes** with no flash on load, responsive layouts, and accessible focus and keyboard behaviour.

## Stack

| | Version |
| --- | --- |
| Next.js (App Router, Turbopack, Cache Components) | 16.4.2 |
| React | 19.3 |
| TypeScript (strict) | 5.9 |
| Tailwind CSS | 4.3 |
| three / @react-three/fiber / @react-three/drei | 0.186 / 9.8 / 10.7 |
| Anime.js | 4.5 |
| Vitest + React Testing Library (jsdom) | 5.0 / 16.3 |

Package manager: **npm**. Requires **Node.js ≥ 20.9** (developed on Node 22).

## Commands

```bash
npm install          # install dependencies
npm run dev          # development server on http://localhost:3000
npm run lint         # ESLint (next/core-web-vitals + TypeScript)
npm run typecheck    # generate route types, then tsc --noEmit
npm test             # Vitest unit and component tests
npm run build        # production build (prerenders the home page, Pokédex, and the first 24 detail pages)
npm start            # serve the production build
```

The build fetches from PokéAPI, so it needs network access.

Opening the dev server through its "Network" URL (e.g. from a phone) works because `next.config.ts` adds this machine's private LAN addresses to `allowedDevOrigins`. Without that, Next.js blocks the dev HMR socket for non-localhost origins and the page renders but doesn't respond to clicks. For other hosts, such as a tunnel, add them to `allowedDevOrigins`.

## Deployment

- **Vercel**: import the repository. No environment variables are needed.
- **Self-hosted Node**: run `npm ci && npm run build && npm start`. Set `PORT` if needed.
- **Docker / other platforms**: anything that runs `next start` on Node.js works.

Cache Components needs a Node.js server runtime. **Static export (`output: "export"`) is not supported.**

## Architecture

```
src/
  app/                      routes: /, /pokemon, /pokemon/[name], /favorites, plus error and not-found boundaries
  proxy.ts                  400 for malformed /pokemon/* URLs; 308 redirect from mixed-case slugs
  components/
    layout/                 header, nav, theme toggle, mobile menu, footer
    ui/                     button, badge, input/select, surface, skeleton, reveal group
    feedback/               error and empty states, shared route error
    pokemon/                card, favorite button, image with fallback
    three/                  R3F model viewer (lazy-loaded) and its error boundary
  features/
    pokedex/                query logic (pure), explorer, pagination
    pokemon-detail/         page loader, detail view, stats, evolution, moves, sprites, 3D showcase
    favorites/              store and page view
    home/                   hero search
  lib/
    api/                    client (HTTP), parse/schemas (validation), transform (pure), pokeapi (cached server fetchers)
    animations/             Anime.js helpers and timing tokens
    storage/                safe localStorage external store
  hooks/  constants/  types/  test/
```

### Data flow

- **Server-first.** Pages are Server Components. Cached leaf fetchers in `lib/api/pokeapi.ts` use `'use cache'` with `cacheLife('days')`, which also deduplicates concurrent identical requests.
- **Errors are never cached.** Leaf fetchers return `null` only for a definite 404. Network and 5xx errors are thrown, so a temporary outage is never stored as "missing data". Optional data (species, evolution, abilities, moves) degrades gracefully in the uncached composition layer.
- **The listing makes no per-card detail requests.** The Pokédex index is built from `/pokemon-species` plus the 18 `/type/{name}` resources, which list every Pokémon's type slots. That is 19 requests in total, cached and shared across pages. Card artwork uses the PokeAPI sprite-repository URL, with a visible fallback if it fails to load.
- **Validated parsing.** Responses are validated for the fields the app consumes. A missing required field throws `ApiParseError`. Optional fields become `null` and are shown as "Unknown" or "unavailable", never invented.
- **The URL is the explorer's source of truth.** Filter state is read with `useSearchParams` and written with the History API. Back/forward navigation and shared links work, and no server round-trip is needed.
- **Detail routes.** The first 24 Pokémon are prerendered by `generateStaticParams` (kept small so builds make few PokéAPI requests). Other Pokémon serve an instant shell, are rendered on first visit, and are then cached. Numeric ids and form names (`/pokemon/133`, `/pokemon/deoxys-normal`) redirect to the species slug. Unknown names render the not-found page.

### Units

PokéAPI reports height in decimetres and weight in hectograms. They are converted to metres (÷ 10) and kilograms (÷ 10) in `lib/utils/format.ts`.

### Animation (Anime.js v4)

`lib/animations` animates only `opacity` and `transform`, caps stagger delays, and returns cleanup functions that cancel animations on unmount. Reduced motion skips animations entirely. Uses: hero entrance, card reveal on every result change, stat bars, favorite "pop", press feedback, and the mobile menu.

Server-rendered elements opt into a hidden pre-hydration state with `data-reveal` and `data-grow`. This only applies when motion is allowed, and a CSS failsafe reveals them after 2.5 s if JavaScript never runs. The hero headline and artwork are never hidden, so they don't delay Largest Contentful Paint.

### 3D showcase

**PokéAPI provides no 3D models, and no properly licensed Pokémon model is available for redistribution.** The viewer therefore runs on Eevee's page with an **explicitly labelled placeholder**: the CC0 / CC BY 4.0 "Fox" model from the Khronos glTF Sample Assets. Its source, licences and SHA-256 are recorded in [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md), and it is credited in the viewer and in the footer. Other Pokémon show a 2D artwork fallback with an explanation.

- three.js (about 295 KB gzipped) loads through `next/dynamic` only when the user clicks **Load 3D viewer**, or automatically if they chose **Always load 3D**. The preference is stored in `localStorage`. Measured: three.js is not part of the detail page's initial JavaScript.
- WebGL is detected first, with a clear message if it is unavailable. Model-load errors are caught by an error boundary that offers a retry.
- Lighting comes from local Lightformers, so no HDR files are fetched. Pan is disabled, zoom and polar angles are limited, and touch is supported. With reduced motion there is no auto-rotation, no idle animation, and the frame loop runs on demand.
- GLTF geometry, materials and textures are disposed when the viewer is finally removed. R3F 9.8 keeps its root alive while Next hides a route with `<Activity>`.

**Home hero:** fan-made Pikachu, Charizard and Gengar modelled procedurally in code (`src/components/three/*-model.tsx`). There are no third-party assets: geometry, shell fur, scale and skin normal maps, ambient-occlusion shading, Charizard's tail flame (with a flickering light), fire-breath particles, Gengar's shadow wisps and Shadow Ball are all generated. Click, tap or Enter makes Pikachu hop, Charizard breathe fire and Gengar throw a Shadow Ball. Without hardware-accelerated WebGL the official artwork is shown instead.

To add a real model, place a licensed `.glb` in `public/models/` and add an entry to `SHOWCASE_MODELS` in `src/constants/showcase.ts` with `isPlaceholder: false`.

## Testing

`npm test` runs 100+ tests covering:

- API parsing and transforms (with real response shapes), the HTTP client (404, retries, network and JSON errors), and data composition with mocked `fetch`
- search, filtering, sorting, pagination, URL state, and the explorer end to end (debounce, reset, back/forward, clamping)
- favorites persistence (reload, corrupted or unavailable storage, cross-tab sync, synced indicators)
- missing artwork, invalid Pokémon routes (not-found and redirects), evolution-chain rendering (branching, linear, single-stage, missing)
- unit conversions, the theme toggle and no-flash bootstrap script, and 3D viewer fallbacks (no model, no WebGL, on-demand loading, saved preference)

Browser-level checks are not part of this repo. If needed, add an end-to-end framework such as Playwright as a separate suite.

## Known limitations

- The only 3D model is a non-Pokémon placeholder (see above).
- The index covers default National Pokédex species. Alternate forms (Mega, regional and so on) are not listed, and their URLs return not-found.
- Moves show the first 12 level-up moves from the newest version group that has level-up data.
- "Game appearances" uses PokéAPI's `game_indices`, which is empty for many recent Pokémon. The page says so.
- The **first** request for an unknown name or alias URL streams the page shell, so it returns HTTP 200. Next.js then renders the not-found page with `noindex`, or performs a 308 meta-refresh redirect. Next stores the resolved result, so later requests to the same URL return a real 404 or 308. Malformed and mixed-case URLs always get real 400/308 responses from `proxy.ts`.
- `@react-three/fiber` logs a `THREE.Clock` deprecation warning from its own internals with three r186.

## Credits

Data and sprites: [PokéAPI](https://pokeapi.co/). Pokémon and character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. This is an unofficial fan project. The 3D placeholder model credits are in [`public/models/ATTRIBUTION.md`](public/models/ATTRIBUTION.md).
