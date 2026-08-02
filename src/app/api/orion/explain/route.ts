/**
 * AEGIS-RELIEF — AI briefing endpoint.
 *
 * Generates a plain-English tactical analysis of the stochastic optimization
 * results using an LLM.
 *
 * Resilience strategy (NEVER returns 500):
 *   1. Try to load LLM credentials from env vars or config files.
 *   2. If credentials are missing → return HTTP 200 with a data-driven fallback briefing.
 *   3. If the LLM call fails → return HTTP 200 with a data-driven fallback briefing.
 *   4. The data sent to the LLM is aggressively summarized to stay well under token limits.
 */
import { NextRequest, NextResponse } from "next/server";
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

// ──────────────────────────────────────────────────────────────
// 1. Credential loader — tries multiple sources, never throws
// ──────────────────────────────────────────────────────────────
function loadLlmConfig(): { baseUrl: string; apiKey: string; chatId?: string; userId?: string; token?: string } | null {
  // A. Config files (sandbox / local dev)
  const configPaths = [
    "/etc/.z-ai-config",
    join(process.env.HOME || "/home", ".z-ai-config"),
    join(process.cwd(), ".z-ai-config"),
  ];
  for (const p of configPaths) {
    try {
      if (existsSync(p)) {
        const c = JSON.parse(readFileSync(p, "utf-8"));
        if (c.baseUrl && c.apiKey) return c;
      }
    } catch {
      /* try next */
    }
  }

  // B. ZAI_CONFIG env var (single JSON string — good for Vercel)
  if (process.env.ZAI_CONFIG) {
    try {
      const c = JSON.parse(process.env.ZAI_CONFIG);
      if (c.baseUrl && c.apiKey) return c;
    } catch {
      /* fall through */
    }
  }

  // C. Individual env vars
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

// ──────────────────────────────────────────────────────────────
// 2. Data-driven fallback briefing — ALWAYS returns useful content
// ──────────────────────────────────────────────────────────────
function buildFallbackBriefing(body: ExplainBody, reason: string): string {
  const openNames = body.openSites
    .map((o) => {
      const w = body.warehouses.find((x) => x.id === o.warehouseId);
      return w ? `${w.name} (${o.inventory.toFixed(0)}t/${w.capacity}t)` : o.warehouseId;
    })
    .join(", ");

  const totalKm = body.routes.reduce((a, r) => a + r.distanceKm, 0);
  const totalCo2 = body.routes.reduce((a, r) => a + r.carbonKg, 0);
  const covDelta = ((body.coverage - body.staticCoverage) * 100).toFixed(1);
  const unmetReduction = body.staticUnmet > 0
    ? Math.round((1 - body.expectedUnmet / body.staticUnmet) * 100)
    : 0;

  return [
    `• Opened ${body.openSites.length}/${body.warehouses.length} warehouses: ${openNames}.`,
    `• Coverage ${(body.coverage * 100).toFixed(1)}% (vs ${(body.staticCoverage * 100).toFixed(1)}% static, +${covDelta} pts).`,
    `• Expected unmet: ${body.expectedUnmet.toFixed(1)}t (vs ${body.staticUnmet.toFixed(1)}t static, −${unmetReduction}%).`,
    `• Total cost $${(body.totalCost / 1000).toFixed(0)}K · ${body.routes.length} routes · ${totalKm.toFixed(0)}km · ${totalCo2.toFixed(0)}kg CO₂.`,
    `• Hedged across ${body.scenarioCount} scenarios; prioritizes critical zones when capacity is constrained.`,
  ].join("\n\n");
}

// ──────────────────────────────────────────────────────────────
// 3. Compact summary for the LLM — stays well under token limits
//    (target: <400 tokens of input so the model has room to respond)
// ──────────────────────────────────────────────────────────────
function buildCompactPrompt(body: ExplainBody): string {
  const openSites = body.openSites
    .map((o) => {
      const w = body.warehouses.find((x) => x.id === o.warehouseId);
      return w ? `${w.name}(${o.inventory.toFixed(0)}t/${w.capacity}t)` : o.warehouseId;
    })
    .join(", ");

  // Only send critical zones (not all zones) to save tokens
  const criticalZones = body.zones
    .filter((z) => z.priority === "critical")
    .slice(0, 5) // cap at 5
    .map((z) => z.name)
    .join(", ");

  const totalKm = body.routes.reduce((a, r) => a + r.distanceKm, 0);
  const totalCo2 = body.routes.reduce((a, r) => a + r.carbonKg, 0);

  return [
    `DISASTER: ${body.disasterType} — ${body.instanceName}`,
    `SCENARIOS: ${body.scenarioCount}`,
    `CRITICAL ZONES: ${criticalZones || "none"}`,
    ``,
    `RESULT:`,
    `• Open ${body.openSites.length}/${body.warehouses.length} sites: ${openSites}`,
    `• Coverage ${(body.coverage * 100).toFixed(1)}% (static ${(body.staticCoverage * 100).toFixed(1)}%)`,
    `• Unmet ${body.expectedUnmet.toFixed(1)}t (static ${body.staticUnmet.toFixed(1)}t)`,
    `• Cost $${(body.totalCost / 1000).toFixed(0)}K | ${body.routes.length} routes | ${totalKm.toFixed(0)}km | ${totalCo2.toFixed(0)}kg CO₂`,
    `• Penalty M=$${body.unmetPenalty}/t`,
  ].join("\n");
}

// ──────────────────────────────────────────────────────────────
// 4. Main handler
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: ExplainBody;

  // Parse request body
  try {
    body = (await req.json()) as ExplainBody;
  } catch {
    return NextResponse.json(
      { briefing: "Invalid request body.", fallback: true },
      { status: 200 },
    );
  }

  // Load LLM credentials
  const config = loadLlmConfig();

  // No credentials → return 200 with fallback (NEVER 500)
  if (!config) {
    return NextResponse.json(
      {
        briefing: buildFallbackBriefing(body, "API key not configured"),
        fallback: true,
        note: "Set ZAI_BASE_URL and ZAI_API_KEY env vars (or ZAI_CONFIG JSON) to enable AI-generated briefings.",
      },
      { status: 200 },
    );
  }

  // Try the LLM call — wrapped in strict try/catch
  try {
    // Dynamic import so the SDK doesn't crash if config is bad
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = new ZAI(config);

    const compactData = buildCompactPrompt(body);

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are AEGIS, an AI operations-research analyst in a disaster response center. " +
            "Explain stochastic optimization decisions in clear, actionable English. " +
            "Use bullet points. Be specific about WHY warehouses were chosen. " +
            "Highlight life-critical insights. Keep it under 150 words. No markdown headers.",
        },
        {
          role: "user",
          content: `Tactical briefing request:\n\n${compactData}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const briefing = completion.choices[0]?.message?.content?.trim();

    if (!briefing) {
      // LLM returned empty — fallback, but still 200
      return NextResponse.json(
        { briefing: buildFallbackBriefing(body, "empty LLM response"), fallback: true },
        { status: 200 },
      );
    }

    return NextResponse.json({ briefing, fallback: false });
  } catch (llmError) {
    // LLM call failed (network, auth, rate limit, etc.) — return 200 with fallback
    console.error("[AEGIS explain] LLM call failed:", llmError);
    const reason = llmError instanceof Error ? llmError.message.slice(0, 80) : "LLM API error";
    return NextResponse.json(
      {
        briefing: buildFallbackBriefing(body, `LLM error: ${reason}`),
        fallback: true,
      },
      { status: 200 }, // ← ALWAYS 200, never 500
    );
  }
}
