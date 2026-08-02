/**
 * AEGIS-RELIEF — AI briefing endpoint.
 *
 * Uses the z-ai-web-dev-sdk LLM to generate a plain-English explanation of the
 * stochastic optimization results: why certain warehouses were opened, how the
 * plan hedges against scenarios, and what the deltas vs. the static baseline mean.
 *
 * The SDK is used server-side only (per skill guidelines).
 */
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExplainBody;

    const zai = await ZAI.create();

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
