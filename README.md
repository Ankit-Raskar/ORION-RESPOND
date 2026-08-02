# ORION-RESPOND

AI-augmented stochastic optimization platform for disaster response pre-positioning and dynamic resource allocation.

Built for the Orion Global Hackathon 2026 (INFORMS · GDG · UnsaidTalks).

## Quick Start

```bash
# Install dependencies
bun install

# Start the dev server
bun run dev

# Open http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. Vercel auto-detects Next.js — just click **Deploy**
4. (Optional) Add `ZAI_API_KEY` in Vercel → Settings → Environment Variables to enable the AI briefing feature

No other configuration needed. The app is fully client-side — all optimization runs in the browser.

## What It Does

A judge can open the app, pick a disaster scenario, click **Run Optimizer**, and watch a live map populate with:

- **Optimal warehouse placements** (two-stage stochastic MIP)
- **Relief routes** (CVRPTW with carbon dimension)
- **KPI deltas** vs. a static baseline
- **AI tactical briefing** (LLM-powered explanation of decisions)

## Three Optimization Models

| # | Model | What it decides |
|---|---|---|
| 01 | **Two-stage stochastic MIP** | Which warehouses to open, how much inventory to pre-position — hedging across all demand scenarios |
| 02 | **CVRPTW Routing** | Relief routes with capacity, time-windows, and carbon-aware lexicographic objective |
| 03 | **PPO Re-Optimization Policy** | WHEN to re-plan over a 72h episode — beating static and periodic baselines |

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **Leaflet** for live maps
- **Recharts** for data visualization
- **Zustand** for state management
- **Framer Motion** for animations
- **z-ai-web-dev-sdk** for LLM-powered AI briefings

## Bundled Scenarios

The app ships with 3 self-contained disaster scenarios — no external data downloads needed:

1. **Gulf Hurricane** — Category 4 threat, Texas/Louisiana coast (7 zones, 5 warehouses)
2. **Cascadia Megathrust** — M8.0 earthquake, Pacific Northwest (5 zones, 4 warehouses)
3. **Sierra Wildfire** — Diablo wind event, California foothills (5 zones, 3 warehouses)

## Architecture

```
src/
├── app/
│   ├── api/orion/explain/    # LLM briefing endpoint (z-ai-web-dev-sdk)
│   ├── globals.css           # "Field Report" editorial design system
│   ├── layout.tsx            # Fonts: Fraunces + Inter + JetBrains Mono
│   └── page.tsx              # Single-route app, view-switched
├── components/orion/
│   ├── shell.tsx             # Masthead nav + status ticker + footer
│   ├── hero-view.tsx         # Landing page with threat board
│   ├── map-view.tsx          # Live Leaflet map + KPIs + solver log
│   ├── compare-view.tsx      # Static vs stochastic comparison + RL scoreboard
│   ├── scenarios-view.tsx    # Scenario explorer with k-means generation
│   ├── threat-board.tsx      # SVG coordinate-grid disaster map
│   ├── solver-log.tsx        # Streaming optimization log
│   ├── ai-assistant.tsx      # Floating LLM briefing panel
│   └── ...                   # KPI cards, controls, animations
├── lib/
│   ├── optim/
│   │   ├── types.ts          # Domain model
│   │   ├── sample-data.ts    # 3 bundled scenarios
│   │   ├── preposition.ts    # Two-stage stochastic MIP solver
│   │   ├── routing.ts        # CVRPTW solver (Clarke-Wright + 2-opt)
│   │   ├── rl-policy.ts      # PPO policy evaluation (72h episode)
│   │   ├── scenarios.ts      # Bootstrap + k-means scenario generation
│   │   └── geo.ts            # Haversine distance, formatters
│   └── store.ts              # Zustand global state
```

## License

MIT © 2026 ORION-RESPOND
