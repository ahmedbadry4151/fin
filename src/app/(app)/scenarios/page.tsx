import { getCurrentUser, getScenarios, getSimulations, resultsOf } from "@/lib/data";
import { ScenarioLibraryView } from "@/components/views/scenarios";
import type { ScenarioParams } from "@/lib/simulation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scenarios" };

export default async function ScenariosPage() {
  const user = await getCurrentUser();
  const [scenarios, sims] = await Promise.all([getScenarios(user.id), getSimulations(user.id, 100)]);
  const outcomes: Record<number, { finalP50: number; baselineP50: number | null; goalProbability: number | null; shortfall: number }> = {};
  for (const s of sims) {
    if (s.scenarioId && !outcomes[s.scenarioId]) {
      const r = resultsOf(s);
      if (r) outcomes[s.scenarioId] = { finalP50: r.final.p50, baselineP50: r.baseline?.finalP50 ?? null, goalProbability: r.goal?.probability ?? null, shortfall: r.risk.shortfallProbability };
    }
  }
  return <ScenarioLibraryView currency={user.currency} scenarios={scenarios.map((s) => ({ id: s.id, name: s.name, category: s.category, description: s.description, params: s.params as ScenarioParams, lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null, templateKey: s.templateKey }))} outcomes={outcomes} />;
}
