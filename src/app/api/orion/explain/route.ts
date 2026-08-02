/**
 * AEGIS-RELIEF — AI briefing endpoint.
 *
 * Uses the z-ai-web-dev-sdk LLM to generate a plain-English explanation of the
 * stochastic optimization results: why certain warehouses were opened, how the
 * plan hedges against scenarios, and what the deltas vs. the static baseline mean.
 *
 * The SDK is used server-side only (per skill guidelines).
 *
 * Auth: the SDK reads from /etc/.z-ai-config or ~/.z-ai-config or ./.z-ai-config.
 * On Vercel (and other serverless platforms) that file doesn't exist, so we
 * build the config from env vars and pass it explicitly.
 */
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ExplainBody {
  instanceName: string;
  disasterType: string;
  zones: { id: string; name: string; priority: string; population: number }[];
  warehouses: { id: string; name: string; capacity: number; fixedCost: number }[];
  openSites: { warehouseId: string; inventory: number }[];
  coverage: number;
  expectedUnmet: number;
  totalCost: number;
  fixedCost: number;
  inventoryCost: number;
  transportCost: number;
  unmetPenalty: number;
  routes: { id: string; warehouseId: string; stops: number; distanceKm: number; carbonKg: number; loadTons: number }[];
  staticCoverage: number;
  staticUnmet: number;
  scenarioCount: number;
}

/**
 * Build ZAI config from multiple sources (fallback chain):
 * 1. /etc/.z-ai-config (sandbox)
 * 2. ~/.z-ai-config (local dev)
 * 3. ./.z-ai-config (project root)
 * 4. ZAI_CONFIG env var (JSON string, for Vercel)
 * 5. ZAI_BASE_URL + ZAI_API_KEY env vars (Vercel)
 */
function loadZaiConfig(): { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string } | null {
  // 1-3: Try config files
  const configPaths = [
    "/etc/.z-ai-config",
    join(process.env.HOME || "/home", ".z-ai-config"),
    join(process.cwd(), ".z-ai-config"),
  ];
  for (const p of configPaths) {
    try {
      if (existsSync(p)) {
        const config = JSON.parse(readFileSync(p, "utf-8"));
        if (config.baseUrl && config.apiKey) return config;
      }
    } catch {
      // continue to next source
    }
  }

  // 4: ZAI_CONFIG env var (JSON string)
  if (process.env.ZAI_CONFIG) {
    try {
      const config = JSON.parse(process.env.ZAI_CONFIG);
      if (config.baseUrl && config.apiKey) return config;
    } catch {
      // fall through
    }
  }

  // 5: Individual env vars
  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    return {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      ...(process.env.ZAI_CHAT_ID && { chatId: process.env.ZAI_CHAT_ID }),
      ...(process.env.ZAI_USER_ID && { userId: process.env.ZAI_USER_ID }),
      ...(process.env.ZAI_TOKEN && { token: process.env.ZAI_TOKEN }),
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExplainBody;

    const config = loadZaiConfig();

    // If no ZAI config is available, return a pre-written briefing based on the data
    // (graceful degradation — the app still works, just without LLM generation)
    if (!config) {
      const openNames = body.openSites
        .map((o) => {
          const w = body.warehouses.find((x) => x.id === o.warehouseId);
          return w ? `${w.name} (${o.inventory.toFixed(0)}t)` : o.warehouseId;
        })
        .join(", ");

      const fallbackBriefing = [
        `• Opened ${body.openSites.length} of ${body.warehouses.length} candidate warehouses: ${openNames}.`,
        `• Achieved ${(body.coverage * 100).toFixed(1)}% expected coverage vs ${(body.staticCoverage * 100).toFixed(1)}% static baseline — a ${((body.coverage - body.staticCoverage) * 100).toFixed(1)} percentage-point improvement.`,
        `• Expected unmet demand: ${body.expectedUnmet.toFixed(1)} tons (down from ${body.staticUnmet.toFixed(1)}t static — a ${((1 - body.expectedUnmet / body.staticUnmet) * 100).toFixed(0)}% reduction).`,
        `• Total expected cost: $${(body.totalCost / 1000).toFixed(0)}K across fixed + inventory + transport + unmet penalty.`,
        `• Deployed ${body.routes.length} relief routes covering ${body.routes.reduce((a, r) => a + r.distanceKm, 0).toFixed(0)} km with ${body.routes.reduce((a, r) => a + r.carbonKg, 0).toFixed(0)} kg CO₂.`,
        `• The stochastic plan hedges across ${body.scenarioCount} demand scenarios, prioritizing critical-priority zones when capacity is constrained.`,
      ].join("\n\n");

      return NextResponse.json({
        briefing: fallbackBriefing,
        summary: "Fallback briefing (LLM not configured). Set ZAI_BASE_URL and ZAI_API_KEY env vars to enable AI-generated briefings.",
        fallback: true,
      });
    }

    // Create ZAI instance with explicit config
    const zai = new ZAI(config);

    const openNames = body.openSites
      .map((o) => {
        const w = body.warehouses.find((x) => x.id === o.warehouseId);
        return w ? `${w.name} (${o.inventory.toFixed(0)}t of ${w.capacity}t)` : o.warehouseId;
      })
      .join(", ");

    const criticalZones = body.zones
      .filter((z) => z.priority === "critical")
      .map((z) => `${z.name} (pop ${z.population.toLocaleString()})`)
      .join(", ");

    const summary = `
DISASTER: ${body.disasterType} — ${body.instanceName}
SCENARIOS: ${body.scenarioCount} reduced scenarios (probabilities sum to 1)

DEMAND ZONES (${body.zones.length} total):
Critical priority: ${criticalZones}

OPTIMIZATION RESULT (two-stage stochastic MIP):
- Warehouses opened: ${body.openSites.length} of ${body.warehouses.length} candidates
- Open sites: ${openNames}
- Expected coverage: ${(body.coverage * 100).toFixed(1)}%
- Expected unmet demand: ${body.expectedUnmet.toFixed(1)} tons
- Total expected cost: $${(body.totalCost / 1000).toFixed(0)}K
  (fixed $${(body.fixedCost / 1000).toFixed(0)}K + inventory $${(body.inventoryCost / 1000).toFixed(0)}K + transport $${(body.transportCost / 1000).toFixed(0)}K + unmet penalty)
- Unmet penalty M = $${body.unmetPenalty}/ton

ROUTING (CVRPTW):
- ${body.routes.length} relief routes, total ${body.routes.reduce((a, r) => a + r.distanceKm, 0).toFixed(0)} km
- Carbon: ${body.routes.reduce((a, r) => a + r.carbonKg, 0).toFixed(0)} kg CO2

COMPARISON VS STATIC BASELINE:
- Static coverage: ${(body.staticCoverage * 100).toFixed(1)}% → Stochastic: ${(body.coverage * 100).toFixed(1)}%
- Static unmet: ${body.staticUnmet.toFixed(1)}t → Stochastic: ${body.expectedUnmet.toFixed(1)}t
`.trim();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are AEGIS, an AI operations-research analyst embedded in a disaster response command center. " +
            "You explain stochastic optimization decisions to emergency managers in clear, actionable, concise English. " +
            "Use bullet points. Be specific about WHY warehouses were chosen (cost vs. coverage trade-offs, scenario hedging). " +
            "Highlight life-critical insights (unmet demand, coverage gaps). Keep it under 180 words. Do not use markdown headers, just bullets and short paragraphs.",
        },
        {
          role: "user",
          content: `Here is the optimization result. Give me a tactical briefing.\n\n${summary}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const briefing = completion.choices[0]?.message?.content?.trim();

    if (!briefing) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    return NextResponse.json({ briefing, summary });
  } catch (e) {
    console.error("[AEGIS explain] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
